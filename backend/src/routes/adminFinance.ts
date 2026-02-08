import { Elysia, t } from "elysia";
import { eq, desc, sql, sum, count } from "drizzle-orm";
import { db } from "../db";
import { users, deposits, withdrawals, orders } from "../db/schema";

export const adminFinanceRoutes = new Elysia({ prefix: "/admin" })

  // ── Finance overview stats ──
  .get(
    "/finance/stats",
    async () => {
      const [userStats] = await db
        .select({
          totalUsers: count(),
          totalBalance: sum(users.balanceUsdt),
        })
        .from(users);

      const [depositStats] = await db
        .select({
          totalDeposits: count(),
          totalDepositAmount: sum(deposits.amount),
        })
        .from(deposits)
        .where(eq(deposits.status, "completed"));

      const [withdrawalStats] = await db
        .select({
          totalWithdrawals: count(),
          totalWithdrawalAmount: sum(withdrawals.amount),
        })
        .from(withdrawals)
        .where(
          sql`${withdrawals.status} IN ('completed', 'approved')`
        );

      const [pendingWithdrawals] = await db
        .select({ count: count() })
        .from(withdrawals)
        .where(eq(withdrawals.status, "pending"));

      const [orderStats] = await db
        .select({ totalOrders: count() })
        .from(orders);

      return {
        totalUsers: userStats?.totalUsers ?? 0,
        totalBalance: userStats?.totalBalance ?? "0",
        totalDeposits: depositStats?.totalDeposits ?? 0,
        totalDepositAmount: depositStats?.totalDepositAmount ?? "0",
        totalWithdrawals: withdrawalStats?.totalWithdrawals ?? 0,
        totalWithdrawalAmount: withdrawalStats?.totalWithdrawalAmount ?? "0",
        pendingWithdrawals: pendingWithdrawals?.count ?? 0,
        totalOrders: orderStats?.totalOrders ?? 0,
      };
    },
    {
      detail: { tags: ["Admin"], summary: "Get finance overview stats" },
    }
  )

  // ── List deposits ──
  .get(
    "/deposits",
    async () => {
      const all = await db
        .select()
        .from(deposits)
        .orderBy(desc(deposits.createdAt));

      return all.map((d) => ({
        id: d.id.toString(),
        uid: d.uid,
        amount: d.amount,
        txHash: d.txHash,
        network: d.network,
        status: d.status,
        remark: d.remark,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    },
    {
      detail: { tags: ["Admin"], summary: "List all deposits" },
    }
  )

  // ── Create deposit (admin manually credits a user) ──
  .post(
    "/deposits",
    async ({ body, set }) => {
      const { uid, amount, txHash, network, remark } = body;

      // Verify user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, uid))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { message: "用户不存在" } as any;
      }

      // Insert deposit record
      const [dep] = await db
        .insert(deposits)
        .values({
          uid,
          amount,
          txHash: txHash || null,
          network: network || "ERC20",
          status: "completed",
          remark: remark || null,
        })
        .returning();

      // Credit user balance
      await db
        .update(users)
        .set({
          balanceUsdt: sql`${users.balanceUsdt} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid));

      return {
        id: dep!.id.toString(),
        uid: dep!.uid,
        amount: dep!.amount,
        status: dep!.status,
        message: "充值成功",
      };
    },
    {
      body: t.Object({
        uid: t.String({ minLength: 1 }),
        amount: t.String({ minLength: 1 }),
        txHash: t.Optional(t.String()),
        network: t.Optional(t.String()),
        remark: t.Optional(t.String()),
      }),
      detail: { tags: ["Admin"], summary: "Create a deposit (credit user)" },
    }
  )

  // ── Update deposit status (approve / reject) ──
  .patch(
    "/deposits/:id",
    async ({ params, body, set }) => {
      // Look up existing deposit first
      const [existing] = await db
        .select()
        .from(deposits)
        .where(eq(deposits.id, BigInt(params.id)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "充值记录不存在" } as any;
      }

      const [updated] = await db
        .update(deposits)
        .set({ status: body.status, remark: body.remark, updatedAt: new Date() })
        .where(eq(deposits.id, BigInt(params.id)))
        .returning();

      // If approving a pending deposit, credit user balance
      if (body.status === "completed" && existing.status === "pending") {
        await db
          .update(users)
          .set({
            balanceUsdt: sql`${users.balanceUsdt} + ${existing.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, existing.uid));
      }

      return { id: updated!.id.toString(), status: updated!.status };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("pending"), t.Literal("completed"), t.Literal("rejected")]),
        remark: t.Optional(t.String()),
      }),
      detail: { tags: ["Admin"], summary: "Update deposit status" },
    }
  )

  // ── List withdrawals ──
  .get(
    "/withdrawals",
    async () => {
      const all = await db
        .select()
        .from(withdrawals)
        .orderBy(desc(withdrawals.createdAt));

      return all.map((w) => ({
        id: w.id.toString(),
        uid: w.uid,
        amount: w.amount,
        toAddress: w.toAddress,
        network: w.network,
        txHash: w.txHash,
        status: w.status,
        remark: w.remark,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      }));
    },
    {
      detail: { tags: ["Admin"], summary: "List all withdrawals" },
    }
  )

  // ── Approve / Reject withdrawal ──
  .patch(
    "/withdrawals/:id",
    async ({ params, body, set }) => {
      const [existing] = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.id, BigInt(params.id)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "提现记录不存在" } as any;
      }

      const updates: Record<string, any> = {
        status: body.status,
        updatedAt: new Date(),
      };
      if (body.txHash) updates.txHash = body.txHash;
      if (body.remark) updates.remark = body.remark;

      // If rejecting, refund user balance
      if (body.status === "rejected" && existing.status === "pending") {
        await db
          .update(users)
          .set({
            balanceUsdt: sql`${users.balanceUsdt} + ${existing.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, existing.uid));
      }

      const [updated] = await db
        .update(withdrawals)
        .set(updates)
        .where(eq(withdrawals.id, BigInt(params.id)))
        .returning();

      return {
        id: updated!.id.toString(),
        status: updated!.status,
        message: body.status === "approved" ? "已批准" : body.status === "rejected" ? "已拒绝" : "已更新",
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("pending"),
          t.Literal("approved"),
          t.Literal("rejected"),
          t.Literal("completed"),
        ]),
        txHash: t.Optional(t.String()),
        remark: t.Optional(t.String()),
      }),
      detail: { tags: ["Admin"], summary: "Update withdrawal status (approve/reject)" },
    }
  )

  // ── Risk control: list users with risk info ──
  .get(
    "/risk/users",
    async () => {
      const allUsers = await db.select().from(users).orderBy(desc(users.updatedAt));

      return allUsers.map((u) => ({
        uid: u.uid,
        address: u.address,
        balanceUsdt: u.balanceUsdt,
        isFrozen: u.isFrozen,
        riskLevel: u.riskLevel,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }));
    },
    {
      detail: { tags: ["Admin"], summary: "List users for risk management" },
    }
  );
