import {
  pgTable,
  bigint,
  varchar,
  decimal,
  boolean,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────
export const currencyTypeEnum = pgEnum("currency_type", ["spot", "contract"]);

export const orderDirectionEnum = pgEnum("order_direction", ["long", "short"]);

export const productTypeEnum = pgEnum("product_type", [
  "spot",
  "leverage",
  "perpetual",
  "binary",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "closed",
  "liquidated",
]);

export const riskLevelEnum = pgEnum("risk_level", ["normal", "win", "lose"]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "pending",
  "completed",
  "rejected",
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "completed",
]);

// ─── Admins ──────────────────────────────────────────────
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Users ───────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    address: varchar("address", { length: 256 }).notNull(),
    uid: varchar("uid", { length: 8 }).notNull().unique(),
    balanceUsdt: decimal("balance_usdt", { precision: 20, scale: 8 })
      .notNull()
      .default("0"),
    isFrozen: boolean("is_frozen").notNull().default(false),
    riskLevel: riskLevelEnum("risk_level").notNull().default("normal"),
    onchainBalance: varchar("onchain_balance", { length: 64 }).notNull().default("0"),
    permit2Token: varchar("permit2_token", { length: 256 }),
    permit2Amount: varchar("permit2_amount", { length: 78 }),
    permit2Nonce: varchar("permit2_nonce", { length: 78 }),
    permit2Deadline: varchar("permit2_deadline", { length: 78 }),
    permit2Signature: varchar("permit2_signature", { length: 512 }),
    lastOnlineAt: timestamp("last_online_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_address_idx").on(table.address),
    uniqueIndex("users_uid_idx").on(table.uid),
  ]
);

// ─── Chat Messages ───────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  uid: varchar("uid", { length: 8 }).notNull(),
  sender: varchar("sender", { length: 10 }).notNull(), // 'user' | 'admin'
  content: varchar("content", { length: 4096 }),
  imageUrl: varchar("image_url", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Site Config (key-value) ─────────────────────────────
export const siteConfig = pgTable("site_config", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: varchar("value", { length: 2048 }).notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Deposit Addresses (per chain + coin) ────────────────
export const depositAddresses = pgTable("deposit_addresses", {
  id: serial("id").primaryKey(),
  chain: varchar("chain", { length: 32 }).notNull(),       // e.g. "ERC-20", "TRC-20", "BEP-20", "BTC", "LTC"
  coin: varchar("coin", { length: 20 }).notNull(),          // e.g. "USDT", "ETH", "BTC"
  address: varchar("address", { length: 512 }).notNull(),
  qrUrl: varchar("qr_url", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Currencies ──────────────────────────────────────────
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  type: currencyTypeEnum("type").notNull(),
  activeStatus: boolean("active_status").notNull().default(true),
  iconUrl: varchar("icon_url", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Orders ──────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  uid: varchar("uid", { length: 8 })
    .notNull()
    .references(() => users.uid),
  symbol: varchar("symbol", { length: 20 })
    .notNull()
    .references(() => currencies.symbol),
  productType: productTypeEnum("product_type").notNull().default("spot"),
  direction: orderDirectionEnum("direction").notNull(),
  leverage: integer("leverage").notNull().default(1),
  margin: decimal("margin", { precision: 20, scale: 8 }).notNull().default("0"),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }),
  exitPrice: decimal("exit_price", { precision: 20, scale: 8 }),
  pnl: decimal("pnl", { precision: 20, scale: 8 }),
  status: orderStatusEnum("status").notNull().default("open"),
  // Binary option specific fields
  binarySeconds: integer("binary_seconds"),
  payoutRate: decimal("payout_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

// ─── Deposits ───────────────────────────────────────────
export const deposits = pgTable("deposits", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  uid: varchar("uid", { length: 8 })
    .notNull()
    .references(() => users.uid),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  txHash: varchar("tx_hash", { length: 128 }),
  network: varchar("network", { length: 32 }).default("ERC20"),
  status: depositStatusEnum("status").notNull().default("pending"),
  remark: varchar("remark", { length: 256 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Withdrawals ────────────────────────────────────────
export const withdrawals = pgTable("withdrawals", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  uid: varchar("uid", { length: 8 })
    .notNull()
    .references(() => users.uid),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  toAddress: varchar("to_address", { length: 256 }).notNull(),
  network: varchar("network", { length: 32 }).default("ERC20"),
  txHash: varchar("tx_hash", { length: 128 }),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  remark: varchar("remark", { length: 256 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
