import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { models } from "../models";
import { env } from "../config/env";
import { TradeService, TradeError } from "../services/tradeService";
import { RiskGuardError } from "../middleware/riskGuard";

export const tradeRoutes = new Elysia({ prefix: "/trade" })
  .use(models)
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
      exp: "7d",
    })
  )

  // ── Global error handler for TradeError + RiskGuardError ──
  .onError(({ error, set }) => {
    if (error instanceof TradeError) {
      set.status = error.statusCode as any;
      return { message: error.message };
    }
    if (error instanceof RiskGuardError) {
      set.status = error.statusCode as any;
      return { message: error.message };
    }
  })

  // ── Inline auth guard: derive currentUser from JWT ──
  .derive(async ({ jwt, headers, set }) => {
    const authHeader = headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || !payload.uid) {
      set.status = 401;
      throw new Error("Invalid or expired token");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, payload.uid as string))
      .limit(1);

    if (!user) {
      set.status = 404;
      throw new Error("User not found");
    }
    if (user.isFrozen) {
      set.status = 403;
      throw new Error("Account is frozen");
    }

    return { currentUser: user };
  })

  // ── Open Spot Order ──
  .post(
    "/spot/open",
    async ({ body, currentUser }) => {
      return TradeService.openOrder({
        uid: currentUser.uid,
        symbol: body.symbol,
        productType: "spot",
        direction: body.direction,
        leverage: 1,
        margin: body.margin,
      });
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        direction: t.Union([t.Literal("long"), t.Literal("short")]),
        margin: t.String(),
      }),
      detail: { tags: ["Trade"], summary: "Open a spot order (1x leverage)" },
    }
  )

  // ── Open Leverage Order ──
  .post(
    "/leverage/open",
    async ({ body, currentUser }) => {
      return TradeService.openOrder({
        uid: currentUser.uid,
        symbol: body.symbol,
        productType: "leverage",
        direction: body.direction,
        leverage: body.leverage,
        margin: body.margin,
      });
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        direction: t.Union([t.Literal("long"), t.Literal("short")]),
        leverage: t.Number({ minimum: 2, maximum: 200 }),
        margin: t.String(),
      }),
      detail: { tags: ["Trade"], summary: "Open a leverage order (2x-200x)" },
    }
  )

  // ── Open Perpetual Order ──
  .post(
    "/perpetual/open",
    async ({ body, currentUser }) => {
      return TradeService.openOrder({
        uid: currentUser.uid,
        symbol: body.symbol,
        productType: "perpetual",
        direction: body.direction,
        leverage: body.leverage,
        margin: body.margin,
      });
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        direction: t.Union([t.Literal("long"), t.Literal("short")]),
        leverage: t.Number({ minimum: 1, maximum: 200 }),
        margin: t.String(),
      }),
      detail: { tags: ["Trade"], summary: "Open a perpetual contract order" },
    }
  )

  // ── Open Binary Option (秒合约) ──
  .post(
    "/binary/open",
    async ({ body, currentUser }) => {
      return TradeService.openOrder({
        uid: currentUser.uid,
        symbol: body.symbol,
        productType: "binary",
        direction: body.direction,
        leverage: 1,
        margin: body.amount,
        binarySeconds: body.seconds,
      });
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        direction: t.Union([t.Literal("long"), t.Literal("short")]),
        amount: t.String(),
        seconds: t.Union([
          t.Literal(30),
          t.Literal(60),
          t.Literal(120),
          t.Literal(300),
        ]),
      }),
      detail: {
        tags: ["Trade"],
        summary: "Open a binary option (秒合约)",
        description:
          "Direction = long(涨)/short(跌). Seconds = 30/60/120/300. " +
          "Auto-settles after the timer expires by comparing Redis price.",
      },
    }
  )

  // ── Close Order (non-binary) ──
  .post(
    "/:id/close",
    async ({ params, currentUser }) => {
      const orderId = BigInt(params.id);
      return TradeService.closeOrder(orderId, currentUser.uid);
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Trade"],
        summary: "Close an open order (spot/leverage/perpetual)",
      },
    }
  );
