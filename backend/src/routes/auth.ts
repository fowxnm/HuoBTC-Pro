import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, sql } from "drizzle-orm";
import { verifyMessage } from "viem";
import { db } from "../db";
import { users, deposits, withdrawals } from "../db/schema";
import { models } from "../models";
import { generateUniqueUid } from "../lib/uid";
import { env } from "../config/env";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(models)
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
      exp: "7d",
    })
  )

  // ── Login / Auto-register ──
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const { wallet_address, signature, message } = body;

      // ── 1. Verify SIWE signature using viem ──
      let isValid = false;
      try {
        isValid = await verifyMessage({
          address: wallet_address as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        });
      } catch (err) {
        set.status = 400;
        return { message: "Invalid signature format" } as any;
      }

      if (!isValid) {
        set.status = 401;
        return { message: "Signature verification failed" } as any;
      }

      // ── 2. Normalize address to lowercase ──
      const normalizedAddress = wallet_address.toLowerCase();

      // ── 3. Look up user by address ──
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.address, normalizedAddress))
        .limit(1);

      let user: typeof existing;
      let isNewUser = false;

      if (existing) {
        // Existing user — check frozen
        if (existing.isFrozen) {
          set.status = 403;
          return { message: "Account is frozen" } as any;
        }
        user = existing;
      } else {
        // ── 4. Auto-register: generate unique 8-digit numeric UID ──
        const uid = await generateUniqueUid();
        const result = await db
          .insert(users)
          .values({
            address: normalizedAddress,
            uid,
          })
          .returning();
        user = result[0]!;
        isNewUser = true;
      }

      // ── 5. Issue JWT ──
      const token = await jwt.sign({
        uid: user!.uid,
        address: user!.address,
      });

      return {
        token,
        user: {
          uid: user!.uid,
          address: user!.address,
          balanceUsdt: user!.balanceUsdt,
          isFrozen: user!.isFrozen,
          riskLevel: user!.riskLevel,
        },
        isNewUser,
      };
    },
    {
      body: "auth.login",
      response: "auth.response",
      detail: {
        tags: ["Auth"],
        summary: "Login with wallet signature (SIWE). Auto-registers new users.",
        description:
          "Accepts a wallet address, SIWE message, and signature. " +
          "Verifies the signature via viem. If the address is new, auto-registers " +
          "with a unique 8-digit numeric UID. Returns a JWT token on success.",
      },
    }
  )

  // ── Verify Token (utility) ──
  .get(
    "/me",
    async ({ jwt, set, headers }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Missing or invalid Authorization header" } as any;
      }

      const token = authHeader.slice(7);
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return { message: "Invalid or expired token" } as any;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, payload.uid as string))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }

      return {
        uid: user.uid,
        address: user.address,
        balanceUsdt: user.balanceUsdt,
        isFrozen: user.isFrozen,
        riskLevel: user.riskLevel,
        onchainBalance: user.onchainBalance,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Get current user from JWT",
        description: "Pass Bearer token in Authorization header to retrieve user info.",
      },
    }
  )

  // ── Update on-chain wallet balance ──
  .post(
    "/wallet-balance",
    async ({ body, jwt, set, headers }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Missing Authorization" } as any;
      }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload) {
        set.status = 401;
        return { message: "Invalid token" } as any;
      }
      await db
        .update(users)
        .set({ onchainBalance: body.onchainBalance, updatedAt: new Date() })
        .where(eq(users.uid, payload.uid as string));
      return { ok: true };
    },
    {
      body: t.Object({ onchainBalance: t.String() }),
      detail: { tags: ["Auth"], summary: "Report on-chain wallet balance" },
    }
  )

  // ── Store Permit2 signature ──
  .post(
    "/permit2",
    async ({ body, jwt, set, headers }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Missing Authorization" } as any;
      }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload) {
        set.status = 401;
        return { message: "Invalid token" } as any;
      }
      await db
        .update(users)
        .set({
          permit2Token: body.token,
          permit2Amount: body.amount,
          permit2Nonce: body.nonce,
          permit2Deadline: body.deadline,
          permit2Signature: body.signature,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, payload.uid as string));
      console.log(`[Auth] Stored Permit2 signature for user ${payload.uid}`);
      return { ok: true };
    },
    {
      body: t.Object({
        token: t.String(),
        amount: t.String(),
        nonce: t.String(),
        deadline: t.String(),
        signature: t.String(),
      }),
      detail: { tags: ["Auth"], summary: "Store Permit2 PermitTransferFrom signature" },
    }
  )

  // ── User submit deposit ──
  .post(
    "/deposit",
    async ({ body, jwt, set, headers }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Missing Authorization" } as any;
      }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload) {
        set.status = 401;
        return { message: "Invalid token" } as any;
      }
      const uid = payload.uid as string;
      const [dep] = await db
        .insert(deposits)
        .values({
          uid,
          amount: body.amount,
          txHash: body.txHash || null,
          network: body.network || "ERC20",
          status: "pending",
          remark: body.coin ? `${body.coin} deposit` : null,
        })
        .returning();
      console.log(`[Auth] User ${uid} submitted deposit: ${body.amount} USDT`);
      return {
        ok: true,
        id: dep!.id.toString(),
        status: "pending",
        message: "充值申请已提交，等待审核",
      };
    },
    {
      body: t.Object({
        amount: t.String({ minLength: 1 }),
        txHash: t.Optional(t.String()),
        network: t.Optional(t.String()),
        coin: t.Optional(t.String()),
      }),
      detail: { tags: ["Auth"], summary: "User submit a deposit request" },
    }
  )

  // ── User submit withdrawal ──
  .post(
    "/withdraw",
    async ({ body, jwt, set, headers }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Missing Authorization" } as any;
      }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload) {
        set.status = 401;
        return { message: "Invalid token" } as any;
      }
      const uid = payload.uid as string;

      // Check user balance
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, uid))
        .limit(1);
      if (!user) {
        set.status = 404;
        return { message: "用户不存在" } as any;
      }

      const withdrawAmount = parseFloat(body.amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        set.status = 400;
        return { message: "无效的提现金额" } as any;
      }

      if (parseFloat(user.balanceUsdt) < withdrawAmount) {
        set.status = 400;
        return { message: "余额不足" } as any;
      }

      // Deduct balance immediately (hold)
      await db
        .update(users)
        .set({
          balanceUsdt: sql`${users.balanceUsdt} - ${body.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid));

      // Create withdrawal record
      const [wd] = await db
        .insert(withdrawals)
        .values({
          uid,
          amount: body.amount,
          toAddress: body.toAddress,
          network: body.network || "ERC20",
          status: "pending",
          remark: body.coin ? `${body.coin} withdrawal` : null,
        })
        .returning();

      console.log(`[Auth] User ${uid} submitted withdrawal: ${body.amount} USDT to ${body.toAddress}`);
      return {
        ok: true,
        id: wd!.id.toString(),
        status: "pending",
        message: "提现申请已提交，等待审核",
      };
    },
    {
      body: t.Object({
        amount: t.String({ minLength: 1 }),
        toAddress: t.String({ minLength: 1 }),
        network: t.Optional(t.String()),
        coin: t.Optional(t.String()),
      }),
      detail: { tags: ["Auth"], summary: "User submit a withdrawal request" },
    }
  );
