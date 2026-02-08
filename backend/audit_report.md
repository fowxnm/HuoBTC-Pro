# 🛡️ HuoBTC Backend Security Audit Report

**Date:** 2026-02-06
**Auditor:** Antigravity (Red Team)
**Target:** Backend Core (TradeService, RiskControl, MarketData, Admin)

---

## 1. 💀 Critical: In-Memory State Loss (Seconds Contract)

| Level | Component | Impact |
| :--- | :--- | :--- |
| **CRITICAL** | `TradeService.ts` | Server restart causes total loss of pending binary option settlements. Users lose winnings, orders stuck in `OPEN`. |

### 🔍 Vulnerability Description
The system uses JavaScript's native `setTimeout` to handle binary option settlement (e.g., 30s/60s countdowns).
```typescript
// src/services/tradeService.ts:140
setTimeout(() => {
  this.settleBinaryOption(orderId, symbol)...
}, seconds * 1000);
```
**Risk:** Since `setTimeout` is held in process memory, any server restart, crash, or deployment will wipe out these timers. The associated orders will never trigger `settleBinaryOption`, leaving them in `OPEN` status indefinitely.

### 🛠️ Fix Code Snippet (Redis Delayed Queue Pattern)
Use a robust queue (like BullMQ) or Redis Keyspace Notifications. Below is a lightweight Redis-native approach using Sorted Sets (ZSET) which is robust and simple.

**File:** `src/services/tradeScheduler.ts` (New Service)
```typescript
// 1. Add to Scheduler when opening order
// ZADD binary_jobs <timestamp_to_execute> <orderId>
await redis.zadd("scheduler:binary_settle", Date.now() + seconds * 1000, order.id);

// 2. Polling Worker (Run in background/on server start)
const POLL_INTERVAL = 1000;

export async function startScheduler() {
  setInterval(async () => {
    const now = Date.now();
    // Get jobs due for execution (score <= now)
    const dueJobs = await redis.zrangebyscore("scheduler:binary_settle", 0, now);
    
    for (const orderId of dueJobs) {
      // Optimistic lock: Remove first to ensure only one worker processes it
      const removed = await redis.zrem("scheduler:binary_settle", orderId);
      if (removed) {
        try {
           // Locate symbol from DB or encode in job string "symbol:orderId"
           // Assuming we fetch order to get symbol:
           await TradeService.settleBinaryOption(BigInt(orderId)); 
        } catch (e) {
           console.error("Settlement failed, needs retry logic", e);
        }
      }
    }
  }, POLL_INTERVAL);
}
```

---

## 2. 💰 Critical: Balance Race Condition (Double Spend)

| Level | Component | Impact |
| :--- | :--- | :--- |
| **CRITICAL** | `TradeService.ts` | Concurrent requests allow users to spend the same balance multiple times, leading to negative balances and insolvency. |

### 🔍 Vulnerability Description
The code reads balance into application memory, performs arithmetic, and then overwrites the database value.
```typescript
// src/services/tradeService.ts:98
if (parseFloat(user.balanceUsdt) < marginNum) ...
// src/services/tradeService.ts:113
const newBalance = (parseFloat(user.balanceUsdt) - marginNum).toFixed(8); // Memory calc
await db.update(users).set({ balanceUsdt: newBalance })... // Blind overwrite
```
**Risk:** If 10 requests arrive effectively simultaneously, they all read the original balance (e.g., $1000). They all verify $100 < $1000. They all write back ($1000 - $100) = $900. Result: User places $1000 worth of positions but only pays $100.

### 🛠️ Fix Code Snippet (Atomic Decrement)
Push the calculation to the database engine using `sql` operator.

**File:** `src/services/tradeService.ts`
```typescript
import { sql, eq, and, gte } from "drizzle-orm";

// Replace lines 98-117 with:

// Atomic update with Check Condition
const result = await db
  .update(users)
  .set({ 
    // SQL: balance_usdt = balance_usdt - margin
    balanceUsdt: sql`${users.balanceUsdt} - ${marginNum}`,
    updatedAt: new Date() 
  })
  .where(
    and(
      eq(users.uid, uid), 
      // Atomic guard: ensure balance is still sufficient at moment of write
      sql`${users.balanceUsdt} >= ${marginNum}`
    )
  )
  .returning();

if (result.length === 0) {
  throw new TradeError(400, "Insufficient balance or race condition detected");
}
```

---

## 3. 🎯 High: Risk Middleware Bypass & Isolation

| Level | Component | Impact |
| :--- | :--- | :--- |
| **HIGH** | `riskControl.ts` | `evaluateRisk` is a passive helper, not an enforced middleware. Routes can easily "forget" to call it. |

### 🔍 Vulnerability Description
Risk control is currently implemented as a manual function call inside `openOrder`.
```typescript
// src/services/tradeService.ts:76
const risk = evaluateRisk(user.riskLevel);
```
**Risk:**
1. Future developers might add a new trade endpoint (e.g., `v2/trade`) and forget this line.
2. It's not applied to `closeOrder` or other critical actions.
3. If risk level changes *during* request processing (after user load, before order placement), the old risk level is used.

### 🛠️ Fix Code Snippet (Global Middleware / Decorator)
Enforce risk checks at the route entry level or service wrapper.

**File:** `src/middleware/riskGuard.ts`
```typescript
import { Elysia } from "elysia";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export const riskGuard = new Elysia()
  .derive(async ({ headers, error }) => {
    // Assuming we have uid from auth... 
    // This is pseudo-code for middleware
    return {
      checkRisk: async (uid: string) => {
        const [user] = await db.select().from(users).where(eq(users.uid, uid));
        if (user.riskLevel === 'high') {
           throw error(403, "Risk Control: Trading Disabled");
        }
        return user;
      }
    }
  });

// Usage in Routes
// .use(riskGuard).post('/order', async ({ checkRisk, body }) => {
//    await checkRisk(body.uid); // Enforces fresh DB check
//    return TradeService.openOrder(...);
// })
```

---

## 4. 🎲 Medium: Market Data Consistency (Time Lag)

| Level | Component | Impact |
| :--- | :--- | :--- |
| **MEDIUM** | `PriceSimulator.ts` | Users lose on winning trades due to price drift between "Expiry Time" and "Server Processing Time". |

### 🔍 Vulnerability Description
The settlement logic simply grabs `getLatestPrice` when the `setTimeout` callback fires.
```typescript
// src/services/tradeService.ts:162
const currentPrice = await this.getLatestPrice(symbol);
```
**Risk:** If the server is under load, the `setTimeout` might fire 500ms or 2s late. The price might have moved against the user during this lag. A fair system must compare `Entry Price` vs `Price at exact Expiry Timestamp`.

### 🛠️ Fix Code Snippet (Timestamped Tick History)
Store prices as time-series data (or JSON with timestamp) in Redis.

**File:** `src/services/tradeService.ts`
```typescript
// 1. In PriceSimulator, push JSON: { p: "98000.50", t: 1700000000123 }

// 2. In Settlement
static async settleBinaryOption(order: Order) {
  const expiryTime = order.createdAt.getTime() + (order.binarySeconds * 1000);
  
  // Fetch range of prices around expiry
  const prices = await redis.lrange(REDIS_PRICE_KEY(order.symbol), 0, 50);
  
  // Find the price tick that is CLOSEST to expiryTime
  // This ensures "What was the price at exactly 12:00:30?", not "What is price now (12:00:31)?"
  const bestMatch = prices
    .map(s => JSON.parse(s))
    .sort((a, b) => Math.abs(a.t - expiryTime) - Math.abs(b.t - expiryTime))[0];
    
  const currentPrice = parseFloat(bestMatch.p);
  // ... proceed ...
}
```

---

## 5. 🕷️ High: Admin Actions Not Real-Time (Zombie Mode)

| Level | Component | Impact |
| :--- | :--- | :--- |
| **HIGH** | `admin.ts` / `TradeService.ts` | Banned users or halted coins can still settle/close orders because checks are missing in lifecycle methods. |

### 🔍 Vulnerability Description
Admin actions like "Freeze User" or "Deactivate Coin" only update the DB. Active processes (like the `setTimeout` closure) have stale data.
- `closeOrder` loads the order but DOES NOT check if `currency.activeStatus` is still true.
- `settleBinaryOption` loads the order but DOES NOT check if `user.isFrozen`.

### 🛠️ Fix Code Snippet (Laziness Check)
Add checks in the `close`/`settle` phase.

**File:** `src/services/tradeService.ts` (Inside `settleBinaryOption` & `closeOrder`)
```typescript
// In settleBinaryOption & closeOrder:

// 1. Reload critical state
const [freshUser] = await db.select().from(users).where(eq(users.uid, order.uid));
const [currency] = await db.select().from(currencies).where(eq(currencies.symbol, order.symbol));

// 2. Gatekeeping
if (freshUser.isFrozen) {
  console.log(`User ${order.uid} is frozen. Freezing funds/order ${orderId}.`);
  // Maybe mark order as 'suspended' or simply abort settlement (funds remain stuck which is desired for frozen malicious users)
  return; 
}

if (!currency.activeStatus) {
  // Emergency circuit breaker
  throw new TradeError(503, "Market halted for this asset");
}
```
