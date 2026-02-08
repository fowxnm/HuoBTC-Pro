import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { currencies } from "../db/schema";
import { models } from "../models";

export const currencyRoutes = new Elysia({ prefix: "/currencies" })
  .use(models)

  // ── Create Currency ──
  .post(
    "/",
    async ({ body, set }) => {
      const result = await db
        .insert(currencies)
        .values({
          symbol: body.symbol.toUpperCase(),
          type: body.type,
        })
        .returning();
      const currency = result[0]!;
      set.status = 201;
      return {
        id: currency.id,
        symbol: currency.symbol,
        type: currency.type,
        activeStatus: currency.activeStatus,
        iconUrl: currency.iconUrl || null,
        createdAt: currency.createdAt.toISOString(),
      };
    },
    {
      body: "currency.create",
      detail: { tags: ["Currencies"], summary: "Add a new currency" },
    }
  )

  // ── List Currencies ──
  .get(
    "/",
    async () => {
      const all = await db.select().from(currencies);
      return all.map((c) => ({
        id: c.id,
        symbol: c.symbol,
        type: c.type,
        activeStatus: c.activeStatus,
        iconUrl: c.iconUrl || null,
        createdAt: c.createdAt.toISOString(),
      }));
    },
    {
      detail: { tags: ["Currencies"], summary: "List all currencies" },
    }
  )

  // ── Toggle Currency Active Status ──
  .patch(
    "/:symbol/toggle",
    async ({ params, set }) => {
      const [existing] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.symbol, params.symbol.toUpperCase()))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "Currency not found" } as any;
      }

      const result = await db
        .update(currencies)
        .set({ activeStatus: !existing.activeStatus })
        .where(eq(currencies.symbol, params.symbol.toUpperCase()))
        .returning();
      const updated = result[0]!;

      return {
        id: updated.id,
        symbol: updated.symbol,
        type: updated.type,
        activeStatus: updated.activeStatus,
        iconUrl: updated.iconUrl || null,
        createdAt: updated.createdAt.toISOString(),
      };
    },
    {
      params: t.Object({ symbol: t.String() }),
      detail: { tags: ["Currencies"], summary: "Toggle currency active status" },
    }
  );
