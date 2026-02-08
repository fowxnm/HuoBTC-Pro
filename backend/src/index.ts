import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { env } from "./config/env";
import { models } from "./models";
import { userRoutes } from "./routes/users";
import { currencyRoutes } from "./routes/currencies";
import { orderRoutes } from "./routes/orders";
import { authRoutes } from "./routes/auth";
import { tradeRoutes } from "./routes/trade";
import { adminRoutes } from "./routes/admin";
import { adminAuthRoutes } from "./routes/adminAuth";
import { adminFinanceRoutes } from "./routes/adminFinance";
import { marketRoutes, marketDataRoutes, createBroadcaster, createKlineBroadcaster } from "./routes/market";
import { newsRoutes } from "./routes/news";
import { chatRoutes, adminChatRoutes } from "./routes/chat";
import { setKlineBroadcast } from "./services/klineAggregator";
import { startPriceSimulator, stopPriceSimulator, setBroadcast } from "./services/priceSimulator";
import { startTradeScheduler, stopTradeScheduler, recoverPendingJobs } from "./services/tradeScheduler";
import { redis } from "./lib/redis";

const app = new Elysia()
  // ── Plugins ──
  .use(
    swagger({
      documentation: {
        info: {
          title: "Trading Platform API",
          version: "1.0.0",
          description:
            "High-performance trading backend built with Bun + Elysia + DrizzleORM + Redis",
        },
        tags: [
          { name: "Users", description: "User management" },
          { name: "Currencies", description: "Currency management" },
          { name: "Orders", description: "Order management" },
          { name: "Auth", description: "Authentication & SIWE login" },
          { name: "Trade", description: "Trading engine (spot/leverage/perpetual/binary)" },
          { name: "Admin", description: "Admin management" },
          { name: "Market", description: "Market data (Redis-backed)" },
        ],
      },
    })
  )
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )

  // ── Static files (uploaded icons) ──
  .use(staticPlugin({ assets: "uploads", prefix: "/uploads" }))

  // ── Models ──
  .use(models)

  // ── Health Check ──
  .get(
    "/health",
    async () => {
      let redisStatus = "disconnected";
      try {
        await redis.ping();
        redisStatus = "connected";
      } catch {
        redisStatus = "disconnected";
      }

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        redis: redisStatus,
        env: env.NODE_ENV,
      };
    },
    {
      detail: { tags: ["Health"], summary: "Health check endpoint" },
    }
  )

  // ── Public config ──
  .get("/config/deposit", async () => {
    const { depositAddresses } = await import("./db/schema");
    const { db: database } = await import("./db");
    const rows = await database.select().from(depositAddresses);
    return rows.map((r) => ({
      id: r.id,
      chain: r.chain,
      coin: r.coin,
      address: r.address,
      qrUrl: r.qrUrl || "",
    }));
  })

  // ── Routes ──
  .use(authRoutes)
  .use(userRoutes)
  .use(currencyRoutes)
  .use(orderRoutes)
  .use(tradeRoutes)
  .use(adminRoutes)
  .use(adminAuthRoutes)
  .use(adminFinanceRoutes)
  .use(marketDataRoutes)
  .use(marketRoutes)
  .use(newsRoutes)
  .use(chatRoutes)
  .use(adminChatRoutes)

  // ── Start ──
  .listen(env.PORT);

console.log(
  `🚀 Server running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📄 Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`
);
console.log(
  `🔌 WebSocket at ws://${app.server?.hostname}:${app.server?.port}/ws/market`
);

// ── Start price simulator & wire broadcast to WS ──
if (app.server) {
  setBroadcast(createBroadcaster(app.server));
  setKlineBroadcast(createKlineBroadcaster(app.server));
  startPriceSimulator().catch((err) =>
    console.error("[PriceSim] Failed to start:", err)
  );

  // ── Start binary settlement scheduler + recover pending jobs from Redis/DB ──
  startTradeScheduler();
  recoverPendingJobs().catch((err) =>
    console.error("[Scheduler] Failed to recover pending jobs:", err)
  );
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  stopPriceSimulator();
  stopTradeScheduler();
  redis.disconnect();
  process.exit(0);
});

export type App = typeof app;
