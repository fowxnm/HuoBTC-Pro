import { redis } from "../lib/redis";
import { TradeService } from "./tradeService";

const BINARY_JOBS_KEY = "binary_jobs";

/**
 * Enqueue a binary option for delayed settlement via Redis ZSET.
 * Score = Unix timestamp (ms) when the order should settle.
 */
export async function enqueueBinarySettle(
  orderId: bigint,
  symbol: string,
  settleAtMs: number
): Promise<void> {
  const member = JSON.stringify({ orderId: orderId.toString(), symbol });
  await redis.zadd(BINARY_JOBS_KEY, settleAtMs, member);
  console.log(
    `[Scheduler] Enqueued order ${orderId} for settlement at ${new Date(settleAtMs).toISOString()}`
  );
}

// ─── Polling loop ────────────────────────────────────────
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the binary settlement scheduler.
 * Polls Redis ZSET every 1 second for expired jobs.
 */
export function startTradeScheduler(): void {
  console.log("[Scheduler] Binary settlement scheduler started");

  pollIntervalId = setInterval(async () => {
    try {
      const now = Date.now();

      // Fetch all jobs whose score (settle time) <= now
      const jobs = await redis.zrangebyscore(BINARY_JOBS_KEY, 0, now);

      if (jobs.length === 0) return;

      for (const raw of jobs) {
        // Remove from ZSET first (atomic claim — only one instance processes it)
        const removed = await redis.zrem(BINARY_JOBS_KEY, raw);
        if (removed === 0) continue; // another instance already claimed it

        try {
          const { orderId, symbol } = JSON.parse(raw) as {
            orderId: string;
            symbol: string;
          };
          console.log(`[Scheduler] Settling binary order ${orderId} (${symbol})`);
          await TradeService.settleBinaryOption(BigInt(orderId), symbol);
        } catch (err) {
          console.error("[Scheduler] Settlement error:", err);
          // Do NOT re-enqueue — the order stays in DB as "open" and can be
          // recovered on next startup via recoverPendingJobs().
        }
      }
    } catch (err) {
      console.error("[Scheduler] Poll error:", err);
    }
  }, 1000);
}

/**
 * On server startup, scan the orders table for any "open" binary orders
 * whose settlement time has already passed (or is in the future) and
 * re-enqueue them into the Redis ZSET.
 */
export async function recoverPendingJobs(): Promise<void> {
  // Import here to avoid circular dependency at module level
  const { db } = await import("../db");
  const { orders } = await import("../db/schema");
  const { eq, and } = await import("drizzle-orm");

  const openBinaryOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.productType, "binary"),
        eq(orders.status, "open")
      )
    );

  if (openBinaryOrders.length === 0) {
    console.log("[Scheduler] No pending binary orders to recover");
    return;
  }

  let recovered = 0;
  for (const order of openBinaryOrders) {
    const settleAtMs =
      order.createdAt.getTime() + (order.binarySeconds ?? 30) * 1000;
    await enqueueBinarySettle(order.id, order.symbol, settleAtMs);
    recovered++;
  }

  console.log(`[Scheduler] Recovered ${recovered} pending binary orders`);
}

export function stopTradeScheduler(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    console.log("[Scheduler] Stopped");
  }
}
