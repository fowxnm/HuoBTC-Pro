import { Elysia, t } from "elysia";
import { redis } from "../lib/redis";
import { getCachedPrice } from "../services/priceSimulator";
import { getKlines } from "../services/klineAggregator";
import type { KlineInterval } from "../../api-types";

const REDIS_PRICE_KEY = (symbol: string) => `price:${symbol.toUpperCase()}`;
const VALID_INTERVALS: KlineInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

// ── REST: Historical klines ─────────────────────────────
export const marketDataRoutes = new Elysia({ prefix: "/market" })
  .get(
    "/klines",
    ({ query }) => {
      const symbol = (query.symbol ?? "BTC").toUpperCase();
      const interval = VALID_INTERVALS.includes(query.interval as KlineInterval)
        ? (query.interval as KlineInterval)
        : "1m";
      const limit = Math.min(Math.max(Number(query.limit) || 300, 1), 500);
      return getKlines(symbol, interval, limit);
    },
    {
      query: t.Object({
        symbol: t.Optional(t.String()),
        interval: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Market"],
        summary: "Get historical kline/candlestick data",
        description: "Returns OHLCV bars. Params: symbol, interval (1m/5m/15m/1h/4h/1d), limit (max 500).",
      },
    }
  );

// ── WebSocket routes ────────────────────────────────────
export const marketRoutes = new Elysia({ prefix: "/ws" })

  // ── WebSocket Market Feed ──
  .ws("/market", {
    body: t.Object({
      action: t.Union([t.Literal("subscribe"), t.Literal("unsubscribe")]),
      symbols: t.Array(t.String()),
    }),

    open(ws) {
      console.log(`[WS] Client connected: ${ws.id}`);
      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Send { action: 'subscribe', symbols: ['BTC','ETH'] } to start receiving prices.",
        })
      );
    },

    message(ws, data) {
      const { action, symbols } = data;

      for (const raw of symbols) {
        const sym = raw.toUpperCase();
        const topic = `ticker:${sym}`;

        if (action === "subscribe") {
          ws.subscribe(topic);
          for (const intv of VALID_INTERVALS) ws.subscribe(`kline:${intv}:${sym}`);
          // Send current price snapshot immediately
          const price = getCachedPrice(sym);
          ws.send(
            JSON.stringify({
              type: "snapshot",
              symbol: sym,
              price: price?.toFixed(8) ?? null,
              timestamp: new Date().toISOString(),
            })
          );
        } else {
          ws.unsubscribe(topic);
          for (const intv of VALID_INTERVALS) ws.unsubscribe(`kline:${intv}:${sym}`);
        }
      }

      ws.send(
        JSON.stringify({
          type: "ack",
          action,
          symbols: symbols.map((s: string) => s.toUpperCase()),
        })
      );
    },

    close(ws) {
      console.log(`[WS] Client disconnected: ${ws.id}`);
    },
  });

/**
 * Create a broadcast function that uses the Elysia server instance.
 * Called from the price simulator to push ticks to all subscribers.
 */
export function createBroadcaster(server: any) {
  return (symbol: string, data: object) => {
    const topic = `ticker:${symbol.toUpperCase()}`;
    server.publish(
      topic,
      JSON.stringify({
        type: "tick",
        ...data,
      })
    );
  };
}

/**
 * Create a kline broadcast function.
 * Publishes kline bar updates to WS subscribers.
 */
export function createKlineBroadcaster(server: any) {
  return (symbol: string, interval: string, bar: object) => {
    const topic = `kline:${interval}:${symbol.toUpperCase()}`;
    server.publish(
      topic,
      JSON.stringify({
        type: "kline",
        symbol: symbol.toUpperCase(),
        interval,
        bar,
      })
    );
  };
}
