import { db } from "../db";
import { currencies } from "../db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";
import { feedTick, seedHistory } from "./klineAggregator";

const REDIS_PRICE_KEY = (symbol: string) => `price:${symbol.toUpperCase()}`;

// ─── Default seed prices for well-known coins ────────────
const SEED_PRICES: Record<string, number> = {
  BTC: 97000,
  ETH: 3400,
  BNB: 680,
  SOL: 210,
  XRP: 2.5,
  DOGE: 0.32,
  ADA: 0.95,
  AVAX: 35,
  DOT: 7.2,
  MATIC: 0.85,
};

// ─── In-memory price cache (latest prices per symbol) ────
const priceCache = new Map<string, number>();

/**
 * Simulate a random walk price fluctuation.
 * Volatility: ±0.08% per tick (2s).
 */
function simulateTick(current: number): number {
  const volatility = 0.0008;
  const change = current * volatility * (Math.random() * 2 - 1);
  return Math.max(current + change, 0.0001); // never go to 0
}

/**
 * Load all active currencies from DB, seed any missing prices from Redis or defaults.
 * Returns the list of symbols to simulate.
 */
async function loadActiveSymbols(): Promise<string[]> {
  const rows = await db
    .select({ symbol: currencies.symbol })
    .from(currencies)
    .where(eq(currencies.activeStatus, true));

  const symbols: string[] = [];

  for (const row of rows) {
    const sym = row.symbol.toUpperCase();
    symbols.push(sym);

    if (!priceCache.has(sym)) {
      // Try to load last price from Redis (JSON format {p, t})
      const raw = await redis.lindex(REDIS_PRICE_KEY(sym), 0);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { p: string; t: number };
          if (parseFloat(parsed.p) > 0) {
            priceCache.set(sym, parseFloat(parsed.p));
          } else {
            const seed = SEED_PRICES[sym] ?? 10 + Math.random() * 90;
            priceCache.set(sym, seed);
          }
        } catch {
          // Legacy plain-number format fallback
          if (parseFloat(raw) > 0) {
            priceCache.set(sym, parseFloat(raw));
          } else {
            const seed = SEED_PRICES[sym] ?? 10 + Math.random() * 90;
            priceCache.set(sym, seed);
          }
        }
      } else {
        const seed = SEED_PRICES[sym] ?? 10 + Math.random() * 90;
        priceCache.set(sym, seed);
      }
    }
  }

  return symbols;
}

// ─── Broadcast callback ──────────────────────────────────
type BroadcastFn = (symbol: string, data: object) => void;
let broadcastFn: BroadcastFn | null = null;

export function setBroadcast(fn: BroadcastFn) {
  broadcastFn = fn;
}

// ─── Interval handle ─────────────────────────────────────
let intervalId: ReturnType<typeof setInterval> | null = null;
let symbolRefreshCounter = 0;
let activeSymbols: string[] = [];

/**
 * Start the price simulator.
 * - Refreshes the active symbol list from DB every 30 seconds (60 ticks).
 * - Every 2000ms: simulate price tick → write to Redis → broadcast via WS.
 */
export async function startPriceSimulator() {
  // Initial load
  activeSymbols = await loadActiveSymbols();
  console.log(`[PriceSim] Started with ${activeSymbols.length} symbols: ${activeSymbols.join(", ")}`);

  // Seed kline history for all active symbols
  for (const sym of activeSymbols) {
    const price = priceCache.get(sym) ?? 0;
    if (price > 0) seedHistory(sym, price);
  }
  console.log(`[PriceSim] Seeded kline history for ${activeSymbols.length} symbols`);

  let tickCount = 0;
  intervalId = setInterval(async () => {
    try {
      tickCount++;
      if (tickCount <= 2) console.log(`[PriceSim] Tick #${tickCount}, symbols=${activeSymbols.length}, broadcast=${!!broadcastFn}`);
      // Refresh symbol list every ~30s (15 × 2000ms)
      symbolRefreshCounter++;
      if (symbolRefreshCounter >= 15) {
        symbolRefreshCounter = 0;
        activeSymbols = await loadActiveSymbols();
      }

      const timestamp = new Date().toISOString();

      for (const sym of activeSymbols) {
        const current = priceCache.get(sym) ?? 0;
        const next = simulateTick(current);
        priceCache.set(sym, next);

        const priceStr = next.toFixed(8);
        const nowMs = Date.now();

        // Write to Redis as JSON {p: price, t: timestamp_ms} for fair settlement
        const key = REDIS_PRICE_KEY(sym);
        const entry = JSON.stringify({ p: priceStr, t: nowMs });
        await redis.lpush(key, entry);
        await redis.ltrim(key, 0, 999);

        // Feed into kline aggregator
        feedTick(sym, next, nowMs);

        // Broadcast to WS subscribers
        if (broadcastFn) {
          broadcastFn(sym, {
            symbol: sym,
            price: priceStr,
            timestamp,
          });
        }
      }
    } catch (err) {
      console.error("[PriceSim] Tick error:", err);
    }
  }, 2000);
}

export function stopPriceSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[PriceSim] Stopped");
  }
}

/** Get the current in-memory price for a symbol */
export function getCachedPrice(symbol: string): number | null {
  return priceCache.get(symbol.toUpperCase()) ?? null;
}
