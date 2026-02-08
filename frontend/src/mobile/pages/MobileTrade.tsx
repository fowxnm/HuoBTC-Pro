import "./MobileTrade.css";
import {
  createSignal, onMount, onCleanup, Show, For, Switch, Match,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { api } from "@shared/api";
import type {
  CurrencyResponse, TradeResponse, BinarySeconds, KlineInterval,
} from "@shared/api-types";
import { useWallet } from "@shared/wallet-store";
import { marketStore, priceDir as storePriceDir, fmtPrice as fmtP, socket } from "@/stores/market";
import KlineChart from "@/components/KlineChart";
import CoinIcon from "@/components/CoinIcon";
import { resolveIconUrl } from "@shared/config";
import { t } from "@shared/i18n";

type ProductTab = "spot" | "leverage" | "perpetual" | "binary";
const tabKeys: ProductTab[] = ["spot", "leverage", "perpetual", "binary"];
const tabLabelKeys: Record<ProductTab, string> = {
  spot: "trade.spot", leverage: "trade.leverage", perpetual: "trade.perpetual", binary: "trade.binary",
};
const BINARY_OPTIONS: BinarySeconds[] = [30, 60, 120, 300];
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];

const MT_KLINE_INTERVALS: { key: KlineInterval; labelKey: string }[] = [
  { key: "1m", labelKey: "trade.kline.1m" },
  { key: "5m", labelKey: "trade.kline.5m" },
  { key: "15m", labelKey: "trade.kline.15m" },
  { key: "1h", labelKey: "trade.kline.1h" },
  { key: "4h", labelKey: "trade.kline.4h" },
  { key: "1d", labelKey: "trade.kline.1d" },
];

export default function MobileTrade() {
  const wallet = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currencies, setCurrencies] = createSignal<CurrencyResponse[]>([]);
  const [symbol, setSymbol] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [klineInterval, setKlineInterval] = createSignal<KlineInterval>("1m");

  // URL 同步 Tab
  const productType = (): ProductTab => {
    const t = searchParams.type as string;
    return (["spot", "leverage", "perpetual", "binary"] as ProductTab[]).includes(t as ProductTab) ? (t as ProductTab) : "spot";
  };
  const setProductType = (t: ProductTab) => setSearchParams({ type: t });

  const [direction, setDirection] = createSignal<"long" | "short">("long");
  const [margin, setMargin] = createSignal("");
  const [leverage, setLeverage] = createSignal(10);
  const [binarySeconds, setBinarySeconds] = createSignal<BinarySeconds>(60);
  const [submitting, setSubmitting] = createSignal(false);
  const [lastTrade, setLastTrade] = createSignal<TradeResponse | null>(null);

  // Binary 倒计时
  const [countdown, setCountdown] = createSignal(0);
  const [countdownTotal, setCountdownTotal] = createSignal(0);
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  function startCountdown(sec: number) {
    if (countdownTimer) clearInterval(countdownTimer);
    setCountdownTotal(sec); setCountdown(sec);
    countdownTimer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(countdownTimer!); countdownTimer = null; return 0; } return c - 1; });
    }, 1000);
  }
  onCleanup(() => { if (countdownTimer) clearInterval(countdownTimer); });

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

  const notConnected = () => wallet().status !== "connected";

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
    } catch (_) {}
    finally { setSubmitting(false); }
  }

  return (
    <div class="mt-page">
      {/* ═══ Tab ═══ */}
      <div class="mt-tabs">
        <For each={tabKeys}>
          {(key) => (
            <button type="button" class="mt-tab" classList={{ "mt-tab-active": productType() === key }} onClick={() => setProductType(key)}>
              <span>{t(tabLabelKeys[key])}</span>
              {productType() === key && <div class="mt-tab-line" />}
            </button>
          )}
        </For>
      </div>

      <Show when={!loading()} fallback={<MobileTradeSkeleton />}>
        <div class="mt-body">
          {/* 币对 + 价格 */}
          <div class="mt-pair-bar">
            <select class="mt-pair-select" value={symbol()} onChange={(e) => setSymbol(e.currentTarget.value)}>
              <For each={currencies()}>{(c) => <option value={c.symbol}> {c.symbol}/USDT</option>}</For>
            </select>
            <CoinIcon symbol={symbol()} size={22} iconUrl={resolveIconUrl(currencies().find(c => c.symbol === symbol())?.iconUrl)} />
            <span class="mt-live-price" classList={{ "text-buy": priceDir() !== "down", "text-sell": priceDir() === "down" }}>{currentPrice()}</span>
          </div>

          {/* K线图 */}
          <Show when={symbol()}>
            <div class="mt-intv-bar">
              <For each={MT_KLINE_INTERVALS}>
                {(item) => (
                  <button type="button" class="mt-intv-btn" classList={{ "mt-intv-active": klineInterval() === item.key }} onClick={() => setKlineInterval(item.key)}>{t(item.labelKey)}</button>
                )}
              </For>
            </div>
            <div class="mt-chart-wrap">
              <KlineChart symbol={symbol()} interval={klineInterval()} height={260} compact />
            </div>
          </Show>

          {/* 按 Tab 条件区 */}
          <Switch>
            <Match when={productType() === "leverage" || productType() === "perpetual"}>
              <div class="mt-card"><div class="mt-card-title">{t("trade.leverage.label")}</div>
                <div class="mt-lev-grid"><For each={LEVERAGE_OPTIONS}>{(x) => (<button type="button" class="mt-lev-btn" classList={{ "mt-lev-active": leverage() === x }} onClick={() => setLeverage(x)}>{x}x</button>)}</For></div>
              </div>
            </Match>
            <Match when={productType() === "binary"}>
              <div class="mt-card"><div class="mt-card-title">{t("trade.expiry")}</div>
                <div class="mt-bin-grid"><For each={BINARY_OPTIONS}>{(s) => (<button type="button" class="mt-bin-btn" classList={{ "mt-bin-active": binarySeconds() === s }} onClick={() => setBinarySeconds(s)}><span class="mt-bin-sec">{s}</span><span class="mt-bin-unit">{t("trade.seconds")}</span></button>)}</For></div>
              </div>
              {/* 倒计时 */}
              <Show when={countdown() > 0}>
                <div class="mt-countdown">
                  <div class="mt-countdown-ring">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#1e2028" stroke-width="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--buy)" stroke-width="6" stroke-linecap="round"
                        stroke-dasharray={String(2 * Math.PI * 42)}
                        stroke-dashoffset={2 * Math.PI * 42 * (1 - countdown() / countdownTotal())}
                        style={{ transition: "stroke-dashoffset 1s linear", transform: "rotate(-90deg)", "transform-origin": "50% 50%" }}
                      />
                    </svg>
                    <div class="mt-cd-text">
                      <span class="mt-cd-num">{countdown()}</span>
                      <span class="mt-cd-unit">{t("trade.seconds")}</span>
                    </div>
                  </div>
                  <span class="mt-cd-label">{t("trade.settling")}</span>
                </div>
              </Show>
            </Match>
          </Switch>

          {/* 最近成交 */}
          <Show when={lastTrade()}>
            {(trade) => (<div class="mt-result"><div class="mt-result-head">{t("trade.orderCreated")}</div><div class="mt-result-id">ID: {trade().id}</div></div>)}
          </Show>
        </div>

        {/* ═══ 底部下单面板 ═══ */}
        <div class="mt-order-dock">
          <Switch>
            {/* 秒合约：看涨/看跌大按钮 */}
            <Match when={productType() === "binary"}>
              <div class="mt-input-row">
                <input type="text" inputmode="decimal" placeholder={t("trade.betAmount")} class="mt-order-input" value={margin()} onInput={(e) => setMargin(e.currentTarget.value)} />
              </div>
              <div class="mt-call-put">
                <button type="button" class="mt-call" disabled={submitting() || !margin() || notConnected()} onClick={() => submit("long")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                  <span>{t("trade.buy")} Call</span>
                </button>
                <button type="button" class="mt-put" disabled={submitting() || !margin() || notConnected()} onClick={() => submit("short")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  <span>{t("trade.sell")} Put</span>
                </button>
              </div>
            </Match>
            {/* 其他：做多/做空 */}
            <Match when={true}>
              <div class="mt-dir-btns">
                <button type="button" class="mt-dir-btn mt-dir-long" classList={{ "mt-dir-active": direction() === "long" }} onClick={() => setDirection("long")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> {t("trade.buy")}
                </button>
                <button type="button" class="mt-dir-btn mt-dir-short" classList={{ "mt-dir-active": direction() === "short" }} onClick={() => setDirection("short")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> {t("trade.sell")}
                </button>
              </div>
              <div class="mt-input-row">
                <input type="text" inputmode="decimal" placeholder={t("trade.marginLabel")} class="mt-order-input" value={margin()} onInput={(e) => setMargin(e.currentTarget.value)} />
              </div>
              <button type="button" class="mt-submit"
                classList={{ "mt-submit-long": direction() === "long", "mt-submit-short": direction() === "short" }}
                disabled={submitting() || !margin() || notConnected()} onClick={() => submit()}>
                {submitting() ? t("common.loading") : notConnected() ? t("wallet.connect") : `${direction() === "long" ? t("trade.buy") : t("trade.sell")} ${symbol()}`}
              </button>
            </Match>
          </Switch>
        </div>
      </Show>
    </div>
  );
}

function MobileTradeSkeleton() {
  return (<div class="mt-body" style={{ "padding-top": "12px" }}><div style={{ height: "70px", background: "#21262d", "border-radius": "14px" }} /><div style={{ height: "100px", background: "#21262d", "border-radius": "14px", "margin-top": "12px" }} /></div>);
}
