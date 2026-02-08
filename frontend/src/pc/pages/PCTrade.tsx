import "./PCTrade.css";
import {
  createSignal, onMount, onCleanup, Show, For, Switch, Match,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { api } from "@shared/api";
import type {
  CurrencyResponse, TradeResponse, BinarySeconds, KlineInterval,
} from "@shared/api-types";
import { useWallet } from "@shared/wallet-store";
import { showToast } from "../components/Toaster";
import { marketStore, priceDir as storePriceDir, fmtPrice as fmtP, socket } from "@/stores/market";
import KlineChart from "@/components/KlineChart";
import CoinIcon from "@/components/CoinIcon";
import { resolveIconUrl } from "@shared/config";
import { t } from "@shared/i18n";

const KLINE_INTERVALS: { key: KlineInterval; labelKey: string }[] = [
  { key: "1m", labelKey: "trade.kline.1m" },
  { key: "5m", labelKey: "trade.kline.5m" },
  { key: "15m", labelKey: "trade.kline.15m" },
  { key: "1h", labelKey: "trade.kline.1h" },
  { key: "4h", labelKey: "trade.kline.4h" },
  { key: "1d", labelKey: "trade.kline.1d" },
];

type ProductTab = "spot" | "leverage" | "perpetual" | "binary";
const tabKeys: ProductTab[] = ["spot", "leverage", "perpetual", "binary"];
const tabLabelKeys: Record<ProductTab, string> = {
  spot: "trade.spot", leverage: "trade.leverage", perpetual: "trade.perpetual", binary: "trade.binary",
};

function TabIcon(props: { tab: ProductTab }) {
  const s = () => props.tab;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      {s() === "spot" && <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
      {s() === "leverage" && <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>}
      {s() === "perpetual" && <><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-5.095-8 0-8z"/><path d="M5.822 8c-5.096 0-5.096 8 0 8 5.095 0 5.095-8 0-8z"/><line x1="9" y1="12" x2="15" y2="12"/></>}
      {s() === "binary" && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
    </svg>
  );
}

const BINARY_OPTIONS: BinarySeconds[] = [30, 60, 120, 300];
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];

export default function PCTrade() {
  const wallet = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currencies, setCurrencies] = createSignal<CurrencyResponse[]>([]);
  const [symbol, setSymbol] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [klineInterval, setKlineInterval] = createSignal<KlineInterval>("1m");

  // 从 URL 读取 Tab
  const productType = (): ProductTab => {
    const t = searchParams.type as string;
    return (["spot", "leverage", "perpetual", "binary"] as ProductTab[]).includes(t as ProductTab) ? (t as ProductTab) : "spot";
  };
  const setProductType = (t: ProductTab) => setSearchParams({ type: t });

  // ── 共享状态 ──
  const [direction, setDirection] = createSignal<"long" | "short">("long");
  const [margin, setMargin] = createSignal("");
  const [leverage, setLeverage] = createSignal(10);
  const [binarySeconds, setBinarySeconds] = createSignal<BinarySeconds>(60);
  const [submitting, setSubmitting] = createSignal(false);
  const [lastTrade, setLastTrade] = createSignal<TradeResponse | null>(null);

  // ── Binary 倒计时 ──
  const [countdown, setCountdown] = createSignal(0);
  const [countdownTotal, setCountdownTotal] = createSignal(0);
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function startCountdown(sec: number) {
    if (countdownTimer) clearInterval(countdownTimer);
    setCountdownTotal(sec);
    setCountdown(sec);
    countdownTimer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownTimer!); countdownTimer = null; return 0; }
        return c - 1;
      });
    }, 1000);
  }
  onCleanup(() => { if (countdownTimer) clearInterval(countdownTimer); });

  // ── 数据 ──
  onMount(() => {
    socket.connect();
    api("GET /currencies").then((list) => {
      setCurrencies(list as CurrencyResponse[]); setLoading(false);
      const arr = list as CurrencyResponse[];
      if (arr.length) {
        setSymbol(arr[0].symbol);
        socket.subscribe(arr.map(c => c.symbol));
      }
    }).catch(() => setLoading(false));
  });

  const currentPrice = () => {
    const t = marketStore.tickers[symbol()];
    return t ? fmtP(t.price) : "—";
  };
  const priceDir = () => storePriceDir(symbol());

  // ── 提交 ──
  async function submit(dir?: "long" | "short") {
    const w = wallet(); if (w.status !== "connected") return;
    const d = dir || direction();
    setSubmitting(true);
    try {
      let res: TradeResponse; const t = w.token;
      switch (productType()) {
        case "spot": res = await api("POST /trade/spot/open", { body: { symbol: symbol(), direction: d, margin: margin() }, token: t }); break;
        case "leverage": res = await api("POST /trade/leverage/open", { body: { symbol: symbol(), direction: d, leverage: leverage(), margin: margin() }, token: t }); break;
        case "perpetual": res = await api("POST /trade/perpetual/open", { body: { symbol: symbol(), direction: d, leverage: leverage(), margin: margin() }, token: t }); break;
        default: res = await api("POST /trade/binary/open", { body: { symbol: symbol(), direction: d, amount: margin(), seconds: binarySeconds() }, token: t }); break;
      }
      setLastTrade(res); setMargin("");
      if (productType() === "binary") startCountdown(binarySeconds());
      showToast("Order placed", "info");
    } catch (e) { showToast(e instanceof Error ? e.message : "Order failed", "error"); }
    finally { setSubmitting(false); }
  }

  const notConnected = () => wallet().status !== "connected";
  const bal = () => { const w = wallet(); return w.status === "connected" ? w.me.balanceUsdt : "0"; };

  return (
    <div class="trade-page">
      {/* ═══ Tab 栏 ═══ */}
      <div class="trade-tabs">
        <div class="trade-tabs-inner">
          <For each={tabKeys}>
            {(key) => (
              <button type="button" class="trade-tab" classList={{ "trade-tab-active": productType() === key }} onClick={() => setProductType(key)}>
                <span class="trade-tab-icon"><TabIcon tab={key} /></span>
                <span>{t(tabLabelKeys[key])}</span>
                {productType() === key && <div class="trade-tab-line" />}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={!loading()} fallback={<TradeSkeleton />}>
        <div class="trade-body">
          {/* ═══ 左：行情 + 条件 ═══ */}
          <div class="trade-left">
            <div class="trade-pair-bar">
              <select class="trade-pair-select" value={symbol()} onChange={(e) => setSymbol(e.currentTarget.value)}>
                <For each={currencies()}>{(c) => <option value={c.symbol}> {c.symbol}/USDT</option>}</For>
              </select>
              <CoinIcon symbol={symbol()} size={24} iconUrl={resolveIconUrl(currencies().find(c => c.symbol === symbol())?.iconUrl)} />
              <div class="trade-price-box">
                <span class="trade-live-price" classList={{ "text-buy": priceDir() !== "down", "text-sell": priceDir() === "down" }}>{currentPrice()}</span>
                <span class="trade-price-label">{t("trade.currentPrice")}</span>
              </div>
            </div>

            {/* ═══ K线图 ═══ */}
            <div class="trade-chart-wrap">
              <div class="trade-interval-bar">
                <For each={KLINE_INTERVALS}>
                  {(item) => (
                    <button type="button" class="trade-intv-btn" classList={{ "trade-intv-active": klineInterval() === item.key }} onClick={() => setKlineInterval(item.key)}>{t(item.labelKey)}</button>
                  )}
                </For>
              </div>
              <Show when={symbol()}>
                <KlineChart symbol={symbol()} interval={klineInterval()} height={420} />
              </Show>
            </div>

            {/* 按 Tab 显示对应配置 */}
            <Switch>
              <Match when={productType() === "leverage" || productType() === "perpetual"}>
                <div class="trade-card"><div class="trade-card-title">{t("trade.leverage.label")}</div>
                  <div class="leverage-grid"><For each={LEVERAGE_OPTIONS}>{(x) => (<button type="button" class="lev-btn" classList={{ "lev-btn-active": leverage() === x }} onClick={() => setLeverage(x)}>{x}x</button>)}</For></div>
                </div>
              </Match>
              <Match when={productType() === "binary"}>
                <div class="trade-card"><div class="trade-card-title">{t("trade.expiry")}</div>
                  <div class="binary-grid"><For each={BINARY_OPTIONS}>{(s) => (<button type="button" class="bin-btn" classList={{ "bin-btn-active": binarySeconds() === s }} onClick={() => setBinarySeconds(s)}><span class="bin-sec">{s}</span><span class="bin-unit">{t("trade.seconds")}</span></button>)}</For></div>
                </div>
                {/* 倒计时环形 */}
                <Show when={countdown() > 0}>
                  <div class="countdown-card">
                    <div class="countdown-ring">
                      <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#1e2028" stroke-width="6" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--buy)" stroke-width="6" stroke-linecap="round"
                          stroke-dasharray={String(2 * Math.PI * 42)}
                          stroke-dashoffset={2 * Math.PI * 42 * (1 - countdown() / countdownTotal())}
                          style={{ transition: "stroke-dashoffset 1s linear", transform: "rotate(-90deg)", "transform-origin": "50% 50%" }}
                        />
                      </svg>
                      <div class="countdown-text">
                        <span class="countdown-num">{countdown()}</span>
                        <span class="countdown-unit">{t("trade.seconds")}</span>
                      </div>
                    </div>
                    <div class="countdown-label">{t("trade.settling")}</div>
                  </div>
                </Show>
              </Match>
            </Switch>

            <Show when={lastTrade()}>
              {(trade) => (<div class="trade-result"><div class="trade-result-head">{t("trade.orderCreated")}</div><div class="trade-result-row"><span>ID</span><span class="mono">{trade().id.slice(0, 16)}...</span></div><div class="trade-result-row"><span>{t("trade.directionLabel")}</span><span classList={{ "text-buy": trade().direction === "long", "text-sell": trade().direction === "short" }}>{trade().direction === "long" ? t("trade.long") : t("trade.short")}</span></div><div class="trade-result-row"><span>{t("trade.typeLabel")}</span><span>{trade().productType}</span></div></div>)}
            </Show>
          </div>

          {/* ═══ 右：下单面板 ═══ */}
          <div class="trade-right">
            <Switch>
              {/* ── 秒合约：看涨/看跌大按钮 ── */}
              <Match when={productType() === "binary"}>
                <div class="order-panel">
                  <div class="order-field">
                    <label>{t("trade.betAmount")}</label>
                    <div class="order-input-wrap">
                      <input type="text" inputmode="decimal" placeholder="0.00" class="order-input" value={margin()} onInput={(e) => setMargin(e.currentTarget.value)} />
                      <span class="order-unit">USDT</span>
                    </div>
                  </div>
                  <div class="quick-amounts">{[10, 50, 100, 500].map(v => (<button type="button" class="quick-btn" onClick={() => setMargin(String(v))}>{v}</button>))}</div>
                  <div class="binary-call-put">
                    <button type="button" class="call-btn" disabled={submitting() || !margin() || notConnected()} onClick={() => submit("long")}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                      <span class="call-label">{t("trade.buy")}</span>
                      <span class="call-sub">Call</span>
                    </button>
                    <button type="button" class="put-btn" disabled={submitting() || !margin() || notConnected()} onClick={() => submit("short")}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      <span class="put-label">{t("trade.sell")}</span>
                      <span class="put-sub">Put</span>
                    </button>
                  </div>
                  <Show when={!notConnected()}>
                    <div class="order-balance"><span>{t("trade.balance")}</span><span class="text-buy">{bal()} USDT</span></div>
                  </Show>
                </div>
              </Match>

              {/* ── 现货/杠杆/永续：做多做空 ── */}
              <Match when={true}>
                <div class="order-panel">
                  <div class="dir-btns">
                    <button type="button" class="dir-btn dir-long" classList={{ "dir-active": direction() === "long" }} onClick={() => setDirection("long")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> {t("trade.buy")}
                    </button>
                    <button type="button" class="dir-btn dir-short" classList={{ "dir-active": direction() === "short" }} onClick={() => setDirection("short")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> {t("trade.sell")}
                    </button>
                  </div>
                  <div class="order-field">
                    <label>{t("trade.amount")} (USDT)</label>
                    <div class="order-input-wrap">
                      <input type="text" inputmode="decimal" placeholder="0.00" class="order-input" value={margin()} onInput={(e) => setMargin(e.currentTarget.value)} />
                      <span class="order-unit">USDT</span>
                    </div>
                  </div>
                  <div class="quick-amounts">{[10, 50, 100, 500].map(v => (<button type="button" class="quick-btn" onClick={() => setMargin(String(v))}>{v}</button>))}</div>
                  <button type="button" class="submit-btn" classList={{ "submit-long": direction() === "long", "submit-short": direction() === "short" }} disabled={submitting() || !margin() || notConnected()} onClick={() => submit()}>
                    {submitting() ? t("common.loading") : notConnected() ? t("wallet.connect") : `${direction() === "long" ? t("trade.buy") : t("trade.sell")} ${symbol()}`}
                  </button>
                  <Show when={!notConnected()}>
                    <div class="order-balance"><span>{t("trade.balance")}</span><span class="text-buy">{bal()} USDT</span></div>
                  </Show>
                </div>
              </Match>
            </Switch>
          </div>
        </div>
      </Show>
    </div>
  );
}

function TradeSkeleton() {
  return (<div class="trade-body animate-pulse"><div class="trade-left"><div class="h-20 bg-[#21262d] rounded-xl mb-4" /><div class="h-40 bg-[#21262d] rounded-xl" /></div><div class="trade-right"><div class="h-80 bg-[#21262d] rounded-xl" /></div></div>);
}
