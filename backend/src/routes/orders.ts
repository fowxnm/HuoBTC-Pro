import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { orders, users, currencies } from "../db/schema";
import { models } from "../models";

export const orderRoutes = new Elysia({ prefix: "/orders" })
  .use(models)

  // ── Create Order ──
  .post(
    "/",
    async ({ body, set }) => {
      // Validate user exists and is not frozen
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, body.uid))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }
      if (user.isFrozen) {
        set.status = 403;
        return { message: "User account is frozen" } as any;
      }

      // Validate currency exists and is active
      const [currency] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.symbol, body.symbol.toUpperCase()))
        .limit(1);

      if (!currency) {
        set.status = 404;
        return { message: "Currency not found" } as any;
      }
      if (!currency.activeStatus) {
        set.status = 400;
        return { message: "Currency is not active" } as any;
      }

      // Check sufficient balance
      if (Number(user.balanceUsdt) < Number(body.margin)) {
        set.status = 400;
        return { message: "Insufficient balance" } as any;
      }

      // Deduct margin from user balance
      const newBalance = (Number(user.balanceUsdt) - Number(body.margin)).toFixed(8);
      await db
        .update(users)
        .set({ balanceUsdt: newBalance, updatedAt: new Date() })
        .where(eq(users.uid, body.uid));

      // Create order
      const result = await db
        .insert(orders)
        .values({
          uid: body.uid,
          symbol: body.symbol.toUpperCase(),
          direction: body.direction,
          leverage: body.leverage,
          margin: body.margin,
        })
        .returning();
      const order = result[0]!;

      set.status = 201;
      return {
        id: order.id.toString(),
        uid: order.uid,
        symbol: order.symbol,
        direction: order.direction,
        leverage: order.leverage,
        margin: order.margin,
        entryPrice: order.entryPrice,
        exitPrice: order.exitPrice,
        pnl: order.pnl,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        closedAt: order.closedAt ? order.closedAt.toISOString() : null,
      };
    },
    {
      body: "order.create",
      response: "order.response",
      detail: { tags: ["Orders"], summary: "Open a new order" },
    }
  )

  // ── List All Orders ──
  .get(
    "/",
    async () => {
      const allOrders = await db.select().from(orders);
      return allOrders.map((o) => ({
        id: o.id.toString(),
        uid: o.uid,
        symbol: o.symbol,
        productType: o.productType,
        direction: o.direction,
        leverage: o.leverage,
        margin: o.margin,
        entryPrice: o.entryPrice,
        exitPrice: o.exitPrice,
        pnl: o.pnl,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        closedAt: o.closedAt ? o.closedAt.toISOString() : null,
      }));
    },
    {
      detail: { tags: ["Orders"], summary: "List all orders" },
    }
  )

  // ── Get Orders by User UID ──
  .get(
    "/user/:uid",
    async ({ params }) => {
      const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.uid, params.uid));

      return userOrders.map((o) => ({
        id: o.id.toString(),
        uid: o.uid,
        symbol: o.symbol,
        direction: o.direction,
        leverage: o.leverage,
        margin: o.margin,
        entryPrice: o.entryPrice,
        exitPrice: o.exitPrice,
        pnl: o.pnl,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        closedAt: o.closedAt ? o.closedAt.toISOString() : null,
      }));
    },
    {
      params: t.Object({ uid: t.String() }),
      detail: { tags: ["Orders"], summary: "Get all orders for a user" },
    }
  )

  // ── Close Order ──
  .post(
    "/:id/close",
    async ({ params, body, set }) => {
      const orderId = BigInt(params.id);
      const [existing] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "Order not found" } as any;
      }
      if (existing.status !== "open") {
        set.status = 400;
        return { message: "Order is not open" } as any;
      }

      // Calculate PnL (simplified)
      const entryPrice = Number(existing.entryPrice || 0);
      const exitPrice = Number(body.exitPrice);
      const margin = Number(existing.margin);
      const leverage = existing.leverage;

      let pnl: number;
      if (existing.direction === "long") {
        pnl = margin * leverage * ((exitPrice - entryPrice) / entryPrice);
      } else {
        pnl = margin * leverage * ((entryPrice - exitPrice) / entryPrice);
      }

      const result = await db
        .update(orders)
        .set({
          exitPrice: body.exitPrice,
          pnl: pnl.toFixed(8),
          status: "closed",
          closedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();
      const order = result[0]!;

      // Return margin + PnL to user balance
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, order.uid))
        .limit(1);

      if (user) {
        const newBalance = (Number(user.balanceUsdt) + margin + pnl).toFixed(8);
        await db
          .update(users)
          .set({ balanceUsdt: newBalance, updatedAt: new Date() })
          .where(eq(users.uid, order.uid));
      }

      return {
        id: order.id.toString(),
        uid: order.uid,
        symbol: order.symbol,
        direction: order.direction,
        leverage: order.leverage,
        margin: order.margin,
        entryPrice: order.entryPrice,
        exitPrice: order.exitPrice,
        pnl: order.pnl,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        closedAt: order.closedAt ? order.closedAt.toISOString() : null,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: "order.close",
      response: "order.response",
      detail: { tags: ["Orders"], summary: "Close an open order" },
    }
  );
