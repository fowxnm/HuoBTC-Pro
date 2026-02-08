import { Elysia, t } from "elysia";

// ─── Strict Elysia Models ────────────────────────────────
export const models = new Elysia({ name: "models" }).model({
  // ── User ──
  "user.create": t.Object({
    address: t.String({ minLength: 1, maxLength: 256 }),
  }),
  "user.response": t.Object({
    id: t.String(),
    address: t.String(),
    uid: t.String(),
    balanceUsdt: t.String(),
    isFrozen: t.Boolean(),
    riskLevel: t.Union([
      t.Literal("normal"),
      t.Literal("win"),
      t.Literal("lose"),
    ]),
    onchainBalance: t.String(),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
  "user.update": t.Object({
    balanceUsdt: t.Optional(t.String()),
    isFrozen: t.Optional(t.Boolean()),
    riskLevel: t.Optional(
      t.Union([t.Literal("normal"), t.Literal("win"), t.Literal("lose")])
    ),
  }),

  // ── Currency ──
  "currency.create": t.Object({
    symbol: t.String({ minLength: 1, maxLength: 20 }),
    type: t.Union([t.Literal("spot"), t.Literal("contract")]),
  }),
  "currency.response": t.Object({
    id: t.Number(),
    symbol: t.String(),
    type: t.Union([t.Literal("spot"), t.Literal("contract")]),
    activeStatus: t.Boolean(),
    createdAt: t.String(),
  }),

  // ── Order ──
  "order.create": t.Object({
    uid: t.String({ minLength: 8, maxLength: 8 }),
    symbol: t.String({ minLength: 1, maxLength: 20 }),
    direction: t.Union([t.Literal("long"), t.Literal("short")]),
    leverage: t.Number({ minimum: 1, maximum: 200 }),
    margin: t.String(),
  }),
  "order.response": t.Object({
    id: t.String(),
    uid: t.String(),
    symbol: t.String(),
    direction: t.Union([t.Literal("long"), t.Literal("short")]),
    leverage: t.Number(),
    margin: t.String(),
    entryPrice: t.Nullable(t.String()),
    exitPrice: t.Nullable(t.String()),
    pnl: t.Nullable(t.String()),
    status: t.Union([
      t.Literal("open"),
      t.Literal("closed"),
      t.Literal("liquidated"),
    ]),
    createdAt: t.String(),
    closedAt: t.Nullable(t.String()),
  }),
  "order.close": t.Object({
    exitPrice: t.String(),
  }),

  // ── Trade ──
  "trade.response": t.Object({
    id: t.String(),
    uid: t.String(),
    symbol: t.String(),
    productType: t.Union([
      t.Literal("spot"),
      t.Literal("leverage"),
      t.Literal("perpetual"),
      t.Literal("binary"),
    ]),
    direction: t.Union([t.Literal("long"), t.Literal("short")]),
    leverage: t.Number(),
    margin: t.String(),
    entryPrice: t.Nullable(t.String()),
    exitPrice: t.Nullable(t.String()),
    pnl: t.Nullable(t.String()),
    status: t.String(),
    binarySeconds: t.Nullable(t.Number()),
    payoutRate: t.Nullable(t.String()),
    createdAt: t.String(),
    closedAt: t.Nullable(t.String()),
  }),

  // ── Auth ──
  "auth.login": t.Object({
    wallet_address: t.String({ minLength: 1, maxLength: 256 }),
    signature: t.String({ minLength: 1 }),
    message: t.String({ minLength: 1 }),
  }),
  "auth.response": t.Object({
    token: t.String(),
    user: t.Object({
      uid: t.String(),
      address: t.String(),
      balanceUsdt: t.String(),
      isFrozen: t.Boolean(),
      riskLevel: t.Union([
        t.Literal("normal"),
        t.Literal("win"),
        t.Literal("lose"),
      ]),
    }),
    isNewUser: t.Boolean(),
  }),

  // ── Common ──
  "common.message": t.Object({
    message: t.String(),
  }),
  "common.id": t.Object({
    id: t.String(),
  }),
});
