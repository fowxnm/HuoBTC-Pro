import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { users, orders, currencies } from "../db/schema";
import { redis } from "../lib/redis";
import { evaluateRisk, type RiskCheckResult } from "../middleware/riskControl";
import { assertTradeAllowed } from "../middleware/riskGuard";
import { enqueueBinarySettle } from "./tradeScheduler";

// ─── Types ───────────────────────────────────────────────
export type ProductType = "spot" | "leverage" | "perpetual" | "binary";
export type Direction = "long" | "short";

export interface OpenOrderParams {
  uid: string;
  symbol: string;
  productType: ProductType;
  direction: Direction;
  leverage: number;
  margin: string;
  entryPrice?: string;
  // Binary-specific
  binarySeconds?: number;
}

export interface OrderResult {
  id: string;
  uid: string;
  symbol: string;
  productType: ProductType;
  direction: Direction;
  leverage: number;
  margin: string;
  entryPrice: string | null;
  exitPrice: string | null;
  pnl: string | null;
  status: string;
  binarySeconds: number | null;
  payoutRate: string | null;
  createdAt: string;
  closedAt: string | null;
}

// ─── Constants ───────────────────────────────────────────
const BINARY_PAYOUT_RATE = "0.85"; // 85% payout on win
const REDIS_PRICE_KEY = (symbol: string) => `price:${symbol.toUpperCase()}`;

// ─── TradeService ────────────────────────────────────────
export class TradeService {
  // ── Get latest price from Redis (JSON format {p, t}) ──
  static async getLatestPrice(symbol: string): Promise<number | null> {
    const raw = await redis.lindex(REDIS_PRICE_KEY(symbol), 0);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { p: string; t: number };
      return parseFloat(parsed.p);
    } catch {
      // Legacy plain-number fallback
      return parseFloat(raw) || null;
    }
  }

  /**
   * Get the price closest to a target timestamp from the Redis history.
   * Scans the list (newest-first) and finds the entry whose timestamp
   * is closest to `targetMs`. Used for fair binary option settlement.
   */
  static async getPriceAtTime(
    symbol: string,
    targetMs: number
  ): Promise<number | null> {
    const key = REDIS_PRICE_KEY(symbol);
    // Read up to 1000 entries (full history buffer)
    const entries = await redis.lrange(key, 0, 999);
    if (entries.length === 0) return null;

    let bestPrice: number | null = null;
    let bestDelta = Infinity;

    for (const raw of entries) {
      try {
        const { p, t } = JSON.parse(raw) as { p: string; t: number };
        const delta = Math.abs(t - targetMs);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPrice = parseFloat(p);
        }
      } catch {
        // skip malformed entries
      }
    }

    return bestPrice;
  }

  // ── Open Order (all product types) ──
  static async openOrder(params: OpenOrderParams): Promise<OrderResult> {
    const {
      uid,
      symbol,
      productType,
      direction,
      leverage,
      margin,
      binarySeconds,
    } = params;

    // 1. GLOBAL RISK GUARD: force-check frozen + active from DB
    await assertTradeAllowed(uid, symbol);

    // 2. Load user for risk level evaluation
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    if (!user) throw new TradeError(404, "User not found");

    // 3. Risk control (slippage, leverage cap)
    const risk = evaluateRisk(user.riskLevel);
    if (!risk.allowed) throw new TradeError(403, risk.reason ?? "Trading disabled");

    // 4. Enforce leverage cap from risk engine
    const effectiveLeverage = Math.min(leverage, risk.maxLeverage);

    // 5. Validate product-specific constraints
    this.validateProductParams(productType, effectiveLeverage, binarySeconds);

    // 6. Validate margin
    const marginNum = parseFloat(margin);
    if (isNaN(marginNum) || marginNum <= 0)
      throw new TradeError(400, "Invalid margin amount");

    // 7. Get entry price from Redis (apply slippage from risk)
    let entryPrice = await this.getLatestPrice(symbol);
    if (entryPrice === null) throw new TradeError(400, "Price unavailable for this symbol");

    // Apply risk-based slippage
    if (direction === "long") {
      entryPrice = entryPrice * risk.slippageMultiplier;
    } else {
      entryPrice = entryPrice / risk.slippageMultiplier;
    }

    // 8. ATOMIC deduct margin — prevents double-spend via SQL WHERE balance >= amount
    const deductResult = await db
      .update(users)
      .set({
        balanceUsdt: sql`${users.balanceUsdt}::numeric - ${marginNum.toFixed(8)}::numeric`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.uid, uid),
          sql`${users.balanceUsdt}::numeric >= ${marginNum.toFixed(8)}::numeric`
        )
      )
      .returning({ uid: users.uid });

    if (deductResult.length === 0)
      throw new TradeError(400, "Insufficient balance");

    // 9. Create the order
    const result = await db
      .insert(orders)
      .values({
        uid,
        symbol: symbol.toUpperCase(),
        productType,
        direction,
        leverage: effectiveLeverage,
        margin,
        entryPrice: entryPrice.toFixed(8),
        binarySeconds: productType === "binary" ? (binarySeconds ?? 30) : null,
        payoutRate: productType === "binary" ? BINARY_PAYOUT_RATE : null,
      })
      .returning();
    const order = result[0]!;

    // 10. Binary option: enqueue into Redis ZSET for persistent scheduling
    if (productType === "binary") {
      const seconds = binarySeconds ?? 30;
      const settleAtMs = order.createdAt.getTime() + seconds * 1000;
      await enqueueBinarySettle(order.id, symbol.toUpperCase(), settleAtMs);
    }

    return this.formatOrder(order);
  }

  // ── Settle Binary Option ──
  static async settleBinaryOption(orderId: bigint, symbol: string): Promise<void> {
    // 1. Load order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order || order.status !== "open") return;

    // 2. Risk guard: check user frozen + currency active before settlement
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, order.uid))
      .limit(1);

    if (user?.isFrozen) {
      console.warn(`[BinarySettle] User ${order.uid} is frozen, refunding order ${orderId}`);
      await this.refundMargin(order.uid, parseFloat(order.margin));
      await db
        .update(orders)
        .set({ status: "closed", exitPrice: null, pnl: "0", closedAt: new Date() })
        .where(eq(orders.id, orderId));
      return;
    }

    const [currency] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.symbol, symbol.toUpperCase()))
      .limit(1);

    if (currency && !currency.activeStatus) {
      console.warn(`[BinarySettle] Currency ${symbol} deactivated, refunding order ${orderId}`);
      await this.refundMargin(order.uid, parseFloat(order.margin));
      await db
        .update(orders)
        .set({ status: "closed", exitPrice: null, pnl: "0", closedAt: new Date() })
        .where(eq(orders.id, orderId));
      return;
    }

    // 3. Calculate theoretical settlement timestamp for fair pricing
    const settleAtMs =
      order.createdAt.getTime() + (order.binarySeconds ?? 30) * 1000;

    // Get the price closest to the theoretical settlement time
    const settlePrice = await this.getPriceAtTime(symbol, settleAtMs);
    if (settlePrice === null) {
      console.error(`[BinarySettle] No price for ${symbol}, refunding order ${orderId}`);
      await this.refundMargin(order.uid, parseFloat(order.margin));
      await db
        .update(orders)
        .set({ status: "closed", exitPrice: null, pnl: "0", closedAt: new Date() })
        .where(eq(orders.id, orderId));
      return;
    }

    const entryPrice = parseFloat(order.entryPrice ?? "0");
    const margin = parseFloat(order.margin);
    const payoutRate = parseFloat(order.payoutRate ?? BINARY_PAYOUT_RATE);

    // 4. Determine win/lose
    let win = false;
    if (order.direction === "long") {
      win = settlePrice > entryPrice;
    } else {
      win = settlePrice < entryPrice;
    }

    let pnl: number;
    if (win) {
      pnl = margin * payoutRate;
      await this.refundMargin(order.uid, margin + pnl);
    } else {
      pnl = -margin;
    }

    // 5. Update order
    await db
      .update(orders)
      .set({
        exitPrice: settlePrice.toFixed(8),
        pnl: pnl.toFixed(8),
        status: "closed",
        closedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    console.log(
      `[BinarySettle] Order ${orderId}: ${win ? "WIN" : "LOSE"} | ` +
        `entry=${entryPrice} exit=${settlePrice} pnl=${pnl.toFixed(8)} ` +
        `settleTarget=${new Date(settleAtMs).toISOString()}`
    );
  }

  // ── Close a non-binary order manually ──
  static async closeOrder(
    orderId: bigint,
    uid: string
  ): Promise<OrderResult> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new TradeError(404, "Order not found");
    if (order.uid !== uid) throw new TradeError(403, "Not your order");
    if (order.status !== "open") throw new TradeError(400, "Order is not open");
    if (order.productType === "binary")
      throw new TradeError(400, "Binary options settle automatically");

    // GLOBAL RISK GUARD: re-check frozen + active from DB before close
    await assertTradeAllowed(uid, order.symbol);

    // Get exit price from Redis
    const exitPrice = await this.getLatestPrice(order.symbol);
    if (exitPrice === null) throw new TradeError(400, "Price unavailable");

    const entryPrice = parseFloat(order.entryPrice ?? "0");
    const margin = parseFloat(order.margin);
    const leverage = order.leverage;

    // Calculate PnL
    let pnl: number;
    if (order.direction === "long") {
      pnl = margin * leverage * ((exitPrice - entryPrice) / entryPrice);
    } else {
      pnl = margin * leverage * ((entryPrice - exitPrice) / entryPrice);
    }

    // Return margin + PnL to user balance
    const returnAmount = margin + pnl;
    if (returnAmount > 0) {
      await this.refundMargin(order.uid, returnAmount);
    }

    // Update order
    const result = await db
      .update(orders)
      .set({
        exitPrice: exitPrice.toFixed(8),
        pnl: pnl.toFixed(8),
        status: pnl + margin <= 0 ? "liquidated" : "closed",
        closedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return this.formatOrder(result[0]!);
  }

  // ── Private Helpers ──

  private static validateProductParams(
    productType: ProductType,
    leverage: number,
    binarySeconds?: number
  ): void {
    switch (productType) {
      case "spot":
        if (leverage !== 1)
          throw new TradeError(400, "Spot orders must have leverage = 1");
        break;
      case "leverage":
        if (leverage < 2 || leverage > 200)
          throw new TradeError(400, "Leverage must be between 2x and 200x");
        break;
      case "perpetual":
        if (leverage < 1 || leverage > 200)
          throw new TradeError(400, "Perpetual leverage must be 1x-200x");
        break;
      case "binary":
        if (!binarySeconds || ![30, 60, 120, 300].includes(binarySeconds))
          throw new TradeError(
            400,
            "Binary seconds must be one of: 30, 60, 120, 300"
          );
        break;
    }
  }

  private static async refundMargin(uid: string, amount: number): Promise<void> {
    // ATOMIC credit — no read-then-write race
    await db
      .update(users)
      .set({
        balanceUsdt: sql`${users.balanceUsdt}::numeric + ${amount.toFixed(8)}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid));
  }

  private static formatOrder(order: typeof orders.$inferSelect): OrderResult {
    return {
      id: order.id.toString(),
      uid: order.uid,
      symbol: order.symbol,
      productType: order.productType as ProductType,
      direction: order.direction as Direction,
      leverage: order.leverage,
      margin: order.margin,
      entryPrice: order.entryPrice,
      exitPrice: order.exitPrice,
      pnl: order.pnl,
      status: order.status,
      binarySeconds: order.binarySeconds,
      payoutRate: order.payoutRate,
      createdAt: order.createdAt.toISOString(),
      closedAt: order.closedAt ? order.closedAt.toISOString() : null,
    };
  }
}

// ─── Custom Error ────────────────────────────────────────
export class TradeError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "TradeError";
  }
}
