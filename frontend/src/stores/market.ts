import { createStore } from "solid-js/store";
import type { TickerData } from "../types/market";
import type { KlineBar, KlineInterval } from "../shared/api-types";
import * as socket from "../lib/socket";

// ── Store shape ──────────────────────────────────────────
interface MarketState {
  tickers: Record<string, TickerData>;
  isConnected: boolean;
}

const [state, setState] = createStore<MarketState>({
  tickers: {},
  isConnected: false,
});

// ── Actions ──────────────────────────────────────────────

function updateTicker(symbol: string, priceStr: string, timestamp: string) {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return;

  setState("tickers", symbol, (prev) => {
    const prevPrice = prev?.price ?? price;
    return {
      symbol,
      price,
      prev: prevPrice,
      change24h: prev?.change24h ?? 0,
      volume24h: prev?.volume24h ?? 0,
      timestamp,
    };
  });
}

// ── Kline listeners ──────────────────────────────────────
type KlineHandler = (symbol: string, interval: KlineInterval, bar: KlineBar) => void;
const klineHandlers = new Set<KlineHandler>();

export function onKline(handler: KlineHandler): () => void {
  klineHandlers.add(handler);
  return () => klineHandlers.delete(handler);
}

// ── Wire socket → store ──────────────────────────────────
socket.onMessage((msg) => {
  if (msg.type === "snapshot" && msg.price != null) {
    updateTicker(msg.symbol, msg.price, msg.timestamp);
  } else if (msg.type === "tick") {
    updateTicker(msg.symbol, msg.price, msg.timestamp);
  } else if (msg.type === "kline") {
    klineHandlers.forEach((h) => h(msg.symbol, msg.interval, msg.bar));
  }
});

socket.onStatus((connected) => {
  setState("isConnected", connected);
});

// ── Convenience helpers ──────────────────────────────────

/** Price direction since last tick: "up" | "down" | "flat" */
export function priceDir(symbol: string): "up" | "down" | "flat" {
  const t = state.tickers[symbol];
  if (!t || t.prev === 0) return "flat";
  return t.price > t.prev ? "up" : t.price < t.prev ? "down" : "flat";
}

/** Format price with appropriate decimals based on magnitude */
export function fmtPrice(price: number): string {
  if (price >= 10000) return price.toFixed(2);
  if (price >= 100)   return price.toFixed(2);
  if (price >= 1)     return price.toFixed(4);
  if (price >= 0.01)  return price.toFixed(6);
  return price.toFixed(8);
}

/** Format a raw price string with appropriate decimals */
export function fmtPriceStr(priceStr: string): string {
  const n = parseFloat(priceStr);
  return isNaN(n) ? priceStr : fmtPrice(n);
}

// ── Exports ──────────────────────────────────────────────
export const marketStore = state;
export { socket };
