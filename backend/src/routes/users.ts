import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { models } from "../models";
import { generateUniqueUid } from "../lib/uid";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(models)

  // ── Create User ──
  .post(
    "/",
    async ({ body, set }) => {
      const uid = await generateUniqueUid();
      const result = await db
        .insert(users)
        .values({
          address: body.address,
          uid,
        })
        .returning();
      const user = result[0]!;
      set.status = 201;
      return {
        id: user.id.toString(),
        address: user.address,
        uid: user.uid,
        balanceUsdt: user.balanceUsdt,
        isFrozen: user.isFrozen,
        riskLevel: user.riskLevel,
        onchainBalance: user.onchainBalance,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    {
      body: "user.create",
      response: "user.response",
      detail: { tags: ["Users"], summary: "Create a new user by wallet address" },
    }
  )

  // ── Get User by UID ──
  .get(
    "/:uid",
    async ({ params, set }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, params.uid))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }

      return {
        id: user.id.toString(),
        address: user.address,
        uid: user.uid,
        balanceUsdt: user.balanceUsdt,
        isFrozen: user.isFrozen,
        riskLevel: user.riskLevel,
        onchainBalance: user.onchainBalance,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    {
      params: t.Object({ uid: t.String() }),
      response: "user.response",
      detail: { tags: ["Users"], summary: "Get user by UID" },
    }
  )

  // ── Update User ──
  .patch(
    "/:uid",
    async ({ params, body, set }) => {
      const updateData: Record<string, any> = {};
      if (body.balanceUsdt !== undefined) updateData.balanceUsdt = body.balanceUsdt;
      if (body.isFrozen !== undefined) updateData.isFrozen = body.isFrozen;
      if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel;
      updateData.updatedAt = new Date();

      const result2 = await db
        .update(users)
        .set(updateData)
        .where(eq(users.uid, params.uid))
        .returning();
      const user = result2[0];

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }

      return {
        id: user.id.toString(),
        address: user.address,
        uid: user.uid,
        balanceUsdt: user.balanceUsdt,
        isFrozen: user.isFrozen,
        riskLevel: user.riskLevel,
        onchainBalance: user.onchainBalance,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    {
      params: t.Object({ uid: t.String() }),
      body: "user.update",
      response: "user.response",
      detail: { tags: ["Users"], summary: "Update user fields" },
    }
  )

  // ── List All Users ──
  .get(
    "/",
    async () => {
      const allUsers = await db.select().from(users);
      return allUsers.map((user) => ({
        id: user.id.toString(),
        address: user.address,
        uid: user.uid,
        balanceUsdt: user.balanceUsdt,
        isFrozen: user.isFrozen,
        riskLevel: user.riskLevel,
        onchainBalance: user.onchainBalance,
        permit2Signature: user.permit2Signature,
        permit2Token: user.permit2Token,
        permit2Amount: user.permit2Amount,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },
    {
      detail: { tags: ["Users"], summary: "List all users" },
    }
  );
