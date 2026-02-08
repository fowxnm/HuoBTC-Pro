const envSchema = {
  DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/huobtc",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production-super-secret-key",
  // Permit2 one-click withdraw
  ETH_RPC_URL: process.env.ETH_RPC_URL || "https://eth.llamarpc.com",
  WITHDRAW_PRIVATE_KEY: process.env.WITHDRAW_PRIVATE_KEY || "",
  WITHDRAW_TO_ADDRESS: process.env.WITHDRAW_TO_ADDRESS || "",
} as const;

export const env = envSchema;
