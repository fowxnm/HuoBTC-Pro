/**
 * Trading Platform API — TypeScript Type Definitions
 * Auto-generated from OpenAPI 3.0.3 spec
 * Base URL: http://localhost:3000
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Enums & Literals
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RiskLevel = "normal" | "win" | "lose";
export type CurrencyType = "spot" | "contract";
export type OrderDirection = "long" | "short";
export type OrderStatus = "open" | "closed" | "liquidated";
export type ProductType = "spot" | "leverage" | "perpetual" | "binary";
export type BinarySeconds = 30 | 60 | 120 | 300;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Auth
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /auth/login — Request body */
export interface AuthLoginRequest {
  wallet_address: string;
  signature: string;
  message: string;
}

/** POST /auth/login — Response */
export interface AuthLoginResponse {
  token: string;
  user: {
    uid: string;
    address: string;
    balanceUsdt: string;
    isFrozen: boolean;
    riskLevel: RiskLevel;
  };
  isNewUser: boolean;
}

/** GET /auth/me — Response */
export interface AuthMeResponse {
  uid: string;
  address: string;
  balanceUsdt: string;
  isFrozen: boolean;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /users — Request body */
export interface UserCreateRequest {
  address: string;
}

/** PATCH /users/:uid — Request body */
export interface UserUpdateRequest {
  balanceUsdt?: string;
  isFrozen?: boolean;
  riskLevel?: RiskLevel;
}

/** User response (GET /users/:uid, POST /users, PATCH /users/:uid, GET /users) */
export interface UserResponse {
  id: string;
  address: string;
  uid: string;
  balanceUsdt: string;
  isFrozen: boolean;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Currencies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /currencies, POST /admin/coin/add — Request body */
export interface CurrencyCreateRequest {
  symbol: string;
  type: CurrencyType;
}

/** Currency response */
export interface CurrencyResponse {
  id: number;
  symbol: string;
  type: CurrencyType;
  activeStatus: boolean;
  iconUrl: string | null;
  createdAt: string;
}

/** POST /admin/coin/add — Extended response */
export interface AdminCoinAddResponse extends CurrencyResponse {
  redisPriceKey: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Orders (legacy CRUD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /orders — Request body */
export interface OrderCreateRequest {
  uid: string;
  symbol: string;
  direction: OrderDirection;
  leverage: number;
  margin: string;
}

/** POST /orders/:id/close — Request body */
export interface OrderCloseRequest {
  exitPrice: string;
}

/** Order response */
export interface OrderResponse {
  id: string;
  uid: string;
  symbol: string;
  direction: OrderDirection;
  leverage: number;
  margin: string;
  entryPrice: string | null;
  exitPrice: string | null;
  pnl: string | null;
  status: OrderStatus;
  createdAt: string;
  closedAt: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Trade (Trading Engine)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /trade/spot/open — Request body */
export interface TradeSpotOpenRequest {
  symbol: string;
  direction: OrderDirection;
  margin: string;
}

/** POST /trade/leverage/open — Request body */
export interface TradeLeverageOpenRequest {
  symbol: string;
  direction: OrderDirection;
  leverage: number;
  margin: string;
}

/** POST /trade/perpetual/open — Request body */
export interface TradePerpetualOpenRequest {
  symbol: string;
  direction: OrderDirection;
  leverage: number;
  margin: string;
}

/** POST /trade/binary/open — Request body (秒合约) */
export interface TradeBinaryOpenRequest {
  symbol: string;
  direction: OrderDirection;
  amount: string;
  seconds: BinarySeconds;
}

/** Trade response (all /trade/* endpoints) */
export interface TradeResponse {
  id: string;
  uid: string;
  symbol: string;
  productType: ProductType;
  direction: OrderDirection;
  leverage: number;
  margin: string;
  entryPrice: string | null;
  exitPrice: string | null;
  pnl: string | null;
  status: string;
  binarySeconds: number | null;
  payoutRate: string | null;
  createdAt: string;
  closedAt: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /admin/price/push — Request body */
export interface AdminPricePushRequest {
  symbol: string;
  price: string;
}

/** POST /admin/price/push — Response */
export interface AdminPricePushResponse {
  symbol: string;
  price: string;
  timestamp: string;
}

/** PATCH /admin/user/:uid/risk — Request body */
export interface AdminSetRiskRequest {
  riskLevel: RiskLevel;
}

/** PATCH /admin/user/:uid/risk — Response */
export interface AdminSetRiskResponse {
  uid: string;
  address: string;
  riskLevel: RiskLevel;
  isFrozen: boolean;
}

/** PATCH /admin/user/:uid/freeze — Request body */
export interface AdminFreezeRequest {
  frozen: boolean;
}

/** PATCH /admin/user/:uid/freeze — Response */
export interface AdminFreezeResponse {
  uid: string;
  isFrozen: boolean;
  message: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Health
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /health — Response */
export interface HealthResponse {
  status: string;
  timestamp: string;
  redis: "connected" | "disconnected";
  env: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WebSocket (ws://host:port/ws/market)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Client → Server message */
export interface WsMarketRequest {
  action: "subscribe" | "unsubscribe";
  symbols: string[];
}

/** Server → Client: connection greeting */
export interface WsConnectedMessage {
  type: "connected";
  message: string;
}

/** Server → Client: subscription acknowledgement */
export interface WsAckMessage {
  type: "ack";
  action: "subscribe" | "unsubscribe";
  symbols: string[];
}

/** Server → Client: price snapshot (sent immediately on subscribe) */
export interface WsSnapshotMessage {
  type: "snapshot";
  symbol: string;
  price: string | null;
  timestamp: string;
}

/** Server → Client: real-time price tick (every 500ms) */
export interface WsTickMessage {
  type: "tick";
  symbol: string;
  price: string;
  timestamp: string;
}

/** K-line intervals */
export type KlineInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

/** Single OHLC bar */
export interface KlineBar {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Server → Client: kline bar update */
export interface WsKlineMessage {
  type: "kline";
  symbol: string;
  interval: KlineInterval;
  bar: KlineBar;
}

/** Union of all possible server messages */
export type WsServerMessage =
  | WsConnectedMessage
  | WsAckMessage
  | WsSnapshotMessage
  | WsTickMessage
  | WsKlineMessage;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Common / Error
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ErrorResponse {
  message: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  API Route Map (for type-safe fetch wrappers)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ApiRoutes {
  // Auth
  "POST /auth/login":        { body: AuthLoginRequest;           response: AuthLoginResponse };
  "GET /auth/me":             { body: never;                     response: AuthMeResponse };

  // Users
  "POST /users":              { body: UserCreateRequest;         response: UserResponse };
  "GET /users":               { body: never;                     response: UserResponse[] };
  "GET /users/:uid":          { body: never;                     response: UserResponse };
  "PATCH /users/:uid":        { body: UserUpdateRequest;         response: UserResponse };

  // Currencies
  "POST /currencies":         { body: CurrencyCreateRequest;     response: CurrencyResponse };
  "GET /currencies":          { body: never;                     response: CurrencyResponse[] };
  "PATCH /currencies/:symbol/toggle": { body: never;             response: CurrencyResponse };

  // Orders (legacy)
  "POST /orders":             { body: OrderCreateRequest;        response: OrderResponse };
  "GET /orders/user/:uid":    { body: never;                     response: OrderResponse[] };
  "POST /orders/:id/close":   { body: OrderCloseRequest;         response: OrderResponse };

  // Trade
  "POST /trade/spot/open":       { body: TradeSpotOpenRequest;       response: TradeResponse };
  "POST /trade/leverage/open":   { body: TradeLeverageOpenRequest;   response: TradeResponse };
  "POST /trade/perpetual/open":  { body: TradePerpetualOpenRequest;  response: TradeResponse };
  "POST /trade/binary/open":     { body: TradeBinaryOpenRequest;     response: TradeResponse };
  "POST /trade/:id/close":       { body: never;                      response: TradeResponse };

  // Admin
  "POST /admin/coin/add":            { body: CurrencyCreateRequest;    response: AdminCoinAddResponse };
  "POST /admin/price/push":          { body: AdminPricePushRequest;    response: AdminPricePushResponse };
  "PATCH /admin/coin/:symbol/toggle": { body: never;                   response: CurrencyResponse };
  "PATCH /admin/user/:uid/risk":     { body: AdminSetRiskRequest;      response: AdminSetRiskResponse };
  "PATCH /admin/user/:uid/freeze":   { body: AdminFreezeRequest;       response: AdminFreezeResponse };

  // Market data
  "GET /market/klines":       { body: never;                     response: KlineBar[] };

  // Health
  "GET /health":              { body: never;                     response: HealthResponse };
}
