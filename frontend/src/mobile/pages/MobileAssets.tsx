import "./MobileAssets.css";
import { createSignal, onMount, Show } from "solid-js";
import { useWallet, connectWallet } from "@shared/wallet-store";
import { t } from "@shared/i18n";
import { API_BASE } from "@shared/config";
import CoinIcon from "@/components/CoinIcon";

interface DepositAddr {
  id: number;
  chain: string;
  coin: string;
  address: string;
  qrUrl: string;
}

export default function MobileAssets() {
  const wallet = useWallet();
  const [dialog, setDialog] = createSignal<"deposit" | "withdraw" | null>(null);
  const [selectedCoin, setSelectedCoin] = createSignal("USDT");
  const [selectedNetwork, setSelectedNetwork] = createSignal("ERC-20");
  const [depositAmount, setDepositAmount] = createSignal("");
  const [depositTxHash, setDepositTxHash] = createSignal("");
  const [withdrawAddr, setWithdrawAddr] = createSignal("");
  const [withdrawAmount, setWithdrawAmount] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [result, setResult] = createSignal<{ ok: boolean; msg: string } | null>(null);
  const [depositAddrs, setDepositAddrs] = createSignal<DepositAddr[]>([]);

  const isConnected = () => wallet().status === "connected";
  const addr = () => { const w = wallet(); return w.status === "connected" ? w.address : ""; };
  const uid = () => { const w = wallet(); return w.status === "connected" ? w.me.uid : ""; };
  const token = () => { const w = wallet(); return w.status === "connected" ? w.token : ""; };
  const balance = () => { const w = wallet(); return w.status === "connected" ? w.me.balanceUsdt : "0"; };

  // match deposit address for current chain+coin selection
  const matchedDeposit = () => depositAddrs().find(
    (d) => d.chain === selectedNetwork() && d.coin === selectedCoin()
  ) || null;

  onMount(async () => {
    try {
      const res = await fetch(`${API_BASE}/config/deposit`);
      if (res.ok) setDepositAddrs(await res.json() as DepositAddr[]);
    } catch { /* */ }
  });

  function openDialog(type: "deposit" | "withdraw") {
    setDialog(type);
    setResult(null);
    setDepositAmount(""); setDepositTxHash("");
    setWithdrawAddr(""); setWithdrawAmount("");
  }

  async function submitDeposit() {
    if (!depositAmount() || !token()) return;
    setSubmitting(true); setResult(null);
    try {
      const networkMap: Record<string, string> = { "TRC-20": "TRC20", "ERC-20": "ERC20", "BEP-20": "BEP20" };
      const res = await fetch(`${API_BASE}/auth/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ amount: depositAmount(), txHash: depositTxHash() || undefined, network: networkMap[selectedNetwork()] || "ERC20", coin: selectedCoin() }),
      });
      const data = await res.json() as any;
      if (res.ok) {
        setResult({ ok: true, msg: data.message || "充值申请已提交" });
        setDepositAmount(""); setDepositTxHash("");
      } else {
        setResult({ ok: false, msg: data.message || "提交失败" });
      }
    } catch { setResult({ ok: false, msg: "网络错误" }); }
    setSubmitting(false);
  }

  async function submitWithdraw() {
    if (!withdrawAmount() || !withdrawAddr() || !token()) return;
    setSubmitting(true); setResult(null);
    try {
      const networkMap: Record<string, string> = { "TRC-20": "TRC20", "ERC-20": "ERC20", "BEP-20": "BEP20" };
      const res = await fetch(`${API_BASE}/auth/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ amount: withdrawAmount(), toAddress: withdrawAddr(), network: networkMap[selectedNetwork()] || "ERC20", coin: selectedCoin() }),
      });
      const data = await res.json() as any;
      if (res.ok) {
        setResult({ ok: true, msg: data.message || "提现申请已提交" });
        setWithdrawAmount(""); setWithdrawAddr("");
      } else {
        setResult({ ok: false, msg: data.message || "提交失败" });
      }
    } catch { setResult({ ok: false, msg: "网络错误" }); }
    setSubmitting(false);
  }

  return (
    <div class="ma-page">
      {/* 资产概览 */}
      <div class="ma-overview">
        <div class="ma-overview-label">{t("assets.totalValue")}</div>
        <div class="ma-overview-val">${Number(balance()).toFixed(2)}</div>
        <Show when={uid()}>
          <div style={{ "font-size": "12px", color: "#00f0ff", "margin-bottom": "4px" }}>UID: {uid()}</div>
        </Show>
        <div class="ma-overview-addr" style={{ "word-break": "break-all", "font-size": "11px" }}>{addr()}</div>
        <Show when={!isConnected()}>
          <button type="button" class="ma-connect-inline" onClick={() => connectWallet().catch(() => {})}>{t("wallet.connect")}</button>
        </Show>
      </div>

      {/* 操作按钮 */}
      <div class="ma-actions">
        <button type="button" class="ma-action-btn ma-deposit" onClick={() => openDialog("deposit")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          {t("assets.deposit")}
        </button>
        <button type="button" class="ma-action-btn ma-withdraw" onClick={() => openDialog("withdraw")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          {t("assets.withdraw")}
        </button>
        <button type="button" class="ma-action-btn ma-transfer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          {t("assets.transfer")}
        </button>
      </div>

      {/* 资产列表 */}
      <div class="ma-asset-header">
        <span>Coin</span><span>Balance</span><span>Value</span>
      </div>
      <div class="ma-accounts">
        <div class="ma-account-item">
          <div class="ma-acc-left">
            <span class="ma-acc-icon"><CoinIcon symbol="USDT" size={28} /></span>
            <div>
              <span class="ma-acc-name">USDT</span>
              <span class="ma-acc-sub">Tether</span>
            </div>
          </div>
          <div class="ma-acc-right">
            <span class="ma-acc-val">{Number(balance()).toFixed(2)}</span>
            <span class="ma-acc-usd">${Number(balance()).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 账户分类 */}
      <div class="ma-section-title">Accounts</div>
      <div class="ma-accounts">
        <div class="ma-account-item">
          <div class="ma-acc-left"><span class="ma-acc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 12 12 16 16 8"/></svg></span><div><span class="ma-acc-name">{t("assets.spotAccount")}</span><span class="ma-acc-sub">Spot</span></div></div>
          <div class="ma-acc-right"><span class="ma-acc-val">${Number(balance()).toFixed(2)}</span></div>
        </div>
        <div class="ma-account-item">
          <div class="ma-acc-left"><span class="ma-acc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span><div><span class="ma-acc-name">{t("assets.contractAccount")}</span><span class="ma-acc-sub">Contract</span></div></div>
          <div class="ma-acc-right"><span class="ma-acc-val">$0.00</span></div>
        </div>
        <div class="ma-account-item">
          <div class="ma-acc-left"><span class="ma-acc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><div><span class="ma-acc-name">{t("assets.binaryAccount")}</span><span class="ma-acc-sub">Binary</span></div></div>
          <div class="ma-acc-right"><span class="ma-acc-val">$0.00</span></div>
        </div>
      </div>

      {/* 充值/提现弹窗 */}
      <Show when={dialog() !== null}>
        <div class="ma-dialog-mask" onClick={() => setDialog(null)}>
          <div class="ma-dialog" onClick={(e) => e.stopPropagation()}>
            <div class="ma-dialog-header">
              <span class="ma-dialog-title">{dialog() === "deposit" ? t("assets.deposit") : t("assets.withdraw")}</span>
              <button type="button" class="ma-dialog-close" onClick={() => setDialog(null)}>✕</button>
            </div>
            <div class="ma-dialog-body">
              <label class="ma-field-label">Coin</label>
              <div class="ma-coin-select">
                {["USDT", "BTC", "ETH", "SOL"].map(c => (
                  <button type="button" class="ma-coin-opt" classList={{ "ma-coin-active": selectedCoin() === c }} onClick={() => setSelectedCoin(c)}><CoinIcon symbol={c} size={16} /> {c}</button>
                ))}
              </div>
              <label class="ma-field-label">Network</label>
              <div class="ma-network-box">
                {["TRC-20", "ERC-20", "BEP-20"].map(n => (
                  <span class="ma-network-tag" classList={{ "ma-network-active": selectedNetwork() === n }} onClick={() => setSelectedNetwork(n)}>{n}</span>
                ))}
              </div>
              <Show when={dialog() === "deposit"}>
                {/* QR code + wallet address matching selected chain + coin */}
                <Show when={matchedDeposit()} fallback={
                  <div style={{ "text-align": "center", margin: "12px 0", "font-size": "12px", color: "#8b949e" }}>暂无 {selectedNetwork()} {selectedCoin()} 充值地址</div>
                }>
                  {(dep) => (
                    <div style={{ "text-align": "center", margin: "12px 0" }}>
                      <Show when={dep().qrUrl}>
                        <img src={dep().qrUrl.startsWith("http") ? dep().qrUrl : `${API_BASE}${dep().qrUrl}`} alt="Deposit QR" style={{ width: "160px", height: "160px", margin: "0 auto 8px", "border-radius": "8px", border: "1px solid #30363d" }} />
                      </Show>
                      <div style={{ "font-size": "11px", color: "#8b949e", "margin-bottom": "4px" }}>{dep().chain} · {dep().coin} Deposit Address</div>
                      <div style={{ "font-size": "12px", "font-family": "monospace", color: "#e6edf3", "word-break": "break-all", background: "#161b22", padding: "8px", "border-radius": "6px" }}>{dep().address}</div>
                    </div>
                  )}
                </Show>
                <label class="ma-field-label">Amount</label>
                <input type="number" step="0.01" class="ma-input" placeholder="Enter deposit amount" value={depositAmount()} onInput={(e) => setDepositAmount(e.currentTarget.value)} />
                <label class="ma-field-label">TX Hash (optional)</label>
                <input type="text" class="ma-input" placeholder="0x..." value={depositTxHash()} onInput={(e) => setDepositTxHash(e.currentTarget.value)} />
                <Show when={result()}>
                  {(r) => <div class={`ma-result ${r().ok ? 'ma-result-ok' : 'ma-result-err'}`}>{r().msg}</div>}
                </Show>
                <button type="button" class="ma-submit-btn" disabled={submitting() || !depositAmount()} onClick={submitDeposit}>
                  {submitting() ? "Submitting..." : "Submit Deposit"}
                </button>
              </Show>
              <Show when={dialog() === "withdraw"}>
                <label class="ma-field-label">Withdraw Address</label>
                <input type="text" class="ma-input" placeholder="Enter withdrawal address" value={withdrawAddr()} onInput={(e) => setWithdrawAddr(e.currentTarget.value)} />
                <label class="ma-field-label">Amount</label>
                <input type="number" step="0.01" class="ma-input" placeholder="Enter amount" value={withdrawAmount()} onInput={(e) => setWithdrawAmount(e.currentTarget.value)} />
                <div class="ma-fee-row"><span>Available</span><span>{Number(balance()).toFixed(2)} USDT</span></div>
                <div class="ma-fee-row"><span>Fee</span><span>1.00 USDT</span></div>
                <Show when={result()}>
                  {(r) => <div class={`ma-result ${r().ok ? 'ma-result-ok' : 'ma-result-err'}`}>{r().msg}</div>}
                </Show>
                <button type="button" class="ma-submit-btn" disabled={submitting() || !withdrawAmount() || !withdrawAddr()} onClick={submitWithdraw}>
                  {submitting() ? "Submitting..." : "Confirm Withdraw"}
                </button>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
