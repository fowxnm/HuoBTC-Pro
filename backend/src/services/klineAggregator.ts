import type { KlineBar, KlineInterval } from "../../api-types";

// ── Interval durations in milliseconds ──────────────────
const INTERVAL_MS: Record<KlineInterval, number> = {
  "1m":  60_000,
  "5m":  300_000,
  "15m": 900_000,
  "1h":  3_600_000,
  "4h":  14_400_000,
  "1d":  86_400_000,
};

const ALL_INTERVALS: KlineInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const MAX_BARS = 1000; // max bars kept per symbol per interval

// ── In-memory storage: symbol → interval → KlineBar[] ───
const klineStore = new Map<string, Map<KlineInterval, KlineBar[]>>();

// ── Current open bar per symbol per interval ────────────
const openBars = new Map<string, Map<KlineInterval, KlineBar>>();

// ── Broadcast callback for kline updates ────────────────
type KlineBroadcastFn = (symbol: string, interval: KlineInterval, bar: KlineBar) => void;
let broadcastFn: KlineBroadcastFn | null = null;

export function setKlineBroadcast(fn: KlineBroadcastFn) {
  broadcastFn = fn;
}

// ── Get the bar open time for a given timestamp & interval
function barOpenTime(timestampMs: number, intervalMs: number): number {
  return Math.floor(timestampMs / intervalMs) * intervalMs;
}

// ── Feed a price tick into the aggregator ───────────────
export function feedTick(symbol: string, price: number, timestampMs: number) {
  const sym = symbol.toUpperCase();

  if (!klineStore.has(sym)) klineStore.set(sym, new Map());
  if (!openBars.has(sym)) openBars.set(sym, new Map());

  const symStore = klineStore.get(sym)!;
  const symOpen = openBars.get(sym)!;

  for (const interval of ALL_INTERVALS) {
    const ms = INTERVAL_MS[interval];
    const openTime = barOpenTime(timestampMs, ms);
    const timeSec = Math.floor(openTime / 1000);

    if (!symStore.has(interval)) symStore.set(interval, []);
    const bars = symStore.get(interval)!;

    const current = symOpen.get(interval);

    if (current && current.time === timeSec) {
      // Update existing open bar
      current.high = Math.max(current.high, price);
      current.low = Math.min(current.low, price);
      current.close = price;
      current.volume += price * 0.001; // synthetic volume

      // Broadcast update for all intervals
      if (broadcastFn) {
        broadcastFn(sym, interval, { ...current });
      }
    } else {
      // Close previous bar and start new one
      if (current) {
        // Push the closed bar to history
        bars.push({ ...current });
        if (bars.length > MAX_BARS) bars.shift();

        // Broadcast closed bar for all intervals
        if (broadcastFn) {
          broadcastFn(sym, interval, { ...current });
        }
      }

      // Create new open bar
      const newBar: KlineBar = {
        time: timeSec,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: price * 0.001,
      };
      symOpen.set(interval, newBar);

      // Broadcast the new bar immediately for all intervals
      if (broadcastFn) {
        broadcastFn(sym, interval, { ...newBar });
      }
    }
  }
}

// ── Get historical kline bars ───────────────────────────
export function getKlines(
  symbol: string,
  interval: KlineInterval = "1m",
  limit: number = 500
): KlineBar[] {
  const sym = symbol.toUpperCase();
  const symStore = klineStore.get(sym);
  if (!symStore) return [];

  const bars = symStore.get(interval);
  if (!bars) return [];

  // Include current open bar
  const openBar = openBars.get(sym)?.get(interval);
  const result = [...bars];
  if (openBar) result.push({ ...openBar });

  return result.slice(-limit);
}

// ── Generate seed historical data for a symbol ──────────
export function seedHistory(symbol: string, currentPrice: number, barCount: number = 500) {
  const sym = symbol.toUpperCase();
  const now = Date.now();

  for (const interval of ALL_INTERVALS) {
    const ms = INTERVAL_MS[interval];
    // Only seed up to barCount bars for shorter intervals, fewer for longer
    const count = interval === "1d" ? Math.min(barCount, 365)
      : interval === "4h" ? Math.min(barCount, 360)
      : interval === "1h" ? Math.min(barCount, 500)
      : barCount;

    if (!klineStore.has(sym)) klineStore.set(sym, new Map());
    if (!openBars.has(sym)) openBars.set(sym, new Map());

    // ── Build price path backwards from currentPrice ──
    // First generate the close prices for all bars, ending at currentPrice
    const closes: number[] = new Array(count);
    closes[count - 1] = currentPrice;

    const volatility = interval === "1m" ? 0.0008 : interval === "5m" ? 0.0015
      : interval === "15m" ? 0.0025 : interval === "1h" ? 0.004
      : interval === "4h" ? 0.007 : 0.012;

    // Walk backwards from current price
    for (let i = count - 2; i >= 0; i--) {
      const noise = closes[i + 1] * volatility * (Math.random() * 2 - 1);
      // Add slight mean-reversion to keep prices in realistic range
      const revert = (currentPrice - closes[i + 1]) * 0.003;
      closes[i] = closes[i + 1] - noise + revert;
    }

    const bars: KlineBar[] = [];
    for (let i = 0; i < count; i++) {
      const barIdx = count - i; // bars ago
      const openTimeMs = barOpenTime(now - barIdx * ms, ms);
      const timeSec = Math.floor(openTimeMs / 1000);

      const close = closes[i];
      const open = i === 0 ? close * (1 + volatility * (Math.random() - 0.5)) : closes[i - 1];

      // Wicks extend beyond open/close
      const wickUp = Math.abs(close - open) * (0.2 + Math.random() * 1.2) + close * volatility * 0.3 * Math.random();
      const wickDn = Math.abs(close - open) * (0.2 + Math.random() * 1.2) + close * volatility * 0.3 * Math.random();
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDn;

      const volume = currentPrice * (0.3 + Math.random() * 1.5);

      bars.push({
        time: timeSec,
        open: +open.toFixed(8),
        high: +high.toFixed(8),
        low: +low.toFixed(8),
        close: +close.toFixed(8),
        volume: +volume.toFixed(2),
      });
    }

    klineStore.get(sym)!.set(interval, bars);

    // Set current open bar
    const lastBar = bars[bars.length - 1];
    if (lastBar) {
      const currentOpenTime = barOpenTime(now, ms);
      const currentTimeSec = Math.floor(currentOpenTime / 1000);
      openBars.get(sym)!.set(interval, {
        time: currentTimeSec,
        open: lastBar.close,
        high: lastBar.close,
        low: lastBar.close,
        close: currentPrice,
        volume: currentPrice * 0.001,
      });
    }
  }
}
