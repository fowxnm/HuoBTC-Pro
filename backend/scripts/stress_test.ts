/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Trading Platform — Stress Test Suite
 *  Run: bun run scripts/stress_test.ts
 *  Requires: server running at http://localhost:3000
 *            with PostgreSQL + Redis connected
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = "http://localhost:3000";
const DIVIDER = "═".repeat(60);
const SUB_DIVIDER = "─".repeat(60);

// ─── Helpers ─────────────────────────────────────────────

async function api<T = any>(
  method: string,
  path: string,
  body?: object,
  token?: string
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/**
 * Create a test user via real SIWE login flow:
 * 1. Generate random private key + account (viem)
 * 2. Build a SIWE-compliant message string
 * 3. Sign it with the private key
 * 4. POST /auth/login → get JWT token + uid
 * 5. Top up balance via PATCH /users/:uid
 */
async function createTestUser(
  label: string,
  balance: string
): Promise<{ uid: string; address: string; token: string }> {
  // 1. Generate a fresh wallet
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  // 2. Build SIWE message
  const nonce = Math.random().toString(36).slice(2, 10);
  const issuedAt = new Date().toISOString();
  const message = [
    `localhost:3000 wants you to sign in with your Ethereum account:`,
    address,
    ``,
    `Sign in to Trading Platform (stress test: ${label})`,
    ``,
    `URI: http://localhost:3000`,
    `Version: 1`,
    `Chain ID: 1`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");

  // 3. Sign with viem account
  const signature = await account.signMessage({ message });

  // 4. Call POST /auth/login
  const { status, data } = await api("POST", "/auth/login", {
    wallet_address: address,
    message,
    signature,
  });

  if (status !== 200) {
    throw new Error(
      `SIWE login failed (${status}): ${JSON.stringify(data)}`
    );
  }

  const token: string = data.token;
  const uid: string = data.user.uid;

  // 5. Top up balance
  await api("PATCH", `/users/${uid}`, { balanceUsdt: balance });

  return { uid, address, token };
}

/** Push a price entry in the new JSON {p, t} format to Redis via admin API */
async function pushPrice(symbol: string, price: number): Promise<void> {
  const entry = JSON.stringify({ p: price.toFixed(8), t: Date.now() });
  await api("POST", "/admin/price/push", { symbol, price: entry });
}

/** Ensure the test currency exists and has a price in Redis */
async function ensureCurrency(
  symbol: string,
  seedPrice: number
): Promise<void> {
  // Try adding (ignore conflict if already exists)
  await api("POST", "/admin/coin/add", { symbol, type: "spot" });
  // Push a valid price so trades can execute
  await pushPrice(symbol, seedPrice);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(timeoutMs = 120_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return true;
    } catch {}
    process.stdout.write(".");
    await sleep(1000);
  }
  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TEST 1: Concurrent Double Spend Attack
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testDoubleSpend(): Promise<boolean> {
  console.log(`\n${DIVIDER}`);
  console.log("  TEST 1: Concurrent Double Spend Attack");
  console.log(DIVIDER);

  const SYMBOL = "BTC";
  const INITIAL_BALANCE = "100";
  const MARGIN_PER_ORDER = "10";
  const CONCURRENT_REQUESTS = 50;
  const MAX_EXPECTED_SUCCESS = 10; // 100 / 10 = 10

  // Setup
  console.log("\n[Setup] Creating test user via SIWE login (balance 100 USDT)...");
  await ensureCurrency(SYMBOL, 97000);
  const { uid, token } = await createTestUser("double_spend", INITIAL_BALANCE);

  console.log(`  User UID: ${uid}`);
  console.log(`  Balance:  ${INITIAL_BALANCE} USDT`);
  console.log(
    `  Attack:   ${CONCURRENT_REQUESTS} concurrent orders × ${MARGIN_PER_ORDER} USDT = ` +
      `${CONCURRENT_REQUESTS * parseFloat(MARGIN_PER_ORDER)} USDT demanded`
  );

  // Attack: fire 50 concurrent spot open requests
  console.log(
    `\n[Attack] Launching ${CONCURRENT_REQUESTS} concurrent open-order requests...`
  );

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
      api(
        "POST",
        "/trade/spot/open",
        { symbol: SYMBOL, direction: "long", margin: MARGIN_PER_ORDER },
        token
      ).then((r) => ({ index: i, ...r }))
    )
  );

  const successes = results.filter(
    (r) => r.status === 200 || r.status === 201
  );
  const failures = results.filter((r) => r.status >= 400);

  console.log(`\n${SUB_DIVIDER}`);
  console.log("  RESULTS:");
  console.log(SUB_DIVIDER);
  console.log(`  Successful orders: ${successes.length}`);
  console.log(`  Failed orders:     ${failures.length}`);

  // Verify final balance
  const { data: finalUser } = await api("GET", `/users/${uid}`);
  const finalBalance = parseFloat(finalUser.balanceUsdt);
  console.log(`  Final balance:     ${finalBalance} USDT`);

  // Verdict
  const expectedBalance =
    parseFloat(INITIAL_BALANCE) -
    successes.length * parseFloat(MARGIN_PER_ORDER);
  const balanceCorrect = Math.abs(finalBalance - expectedBalance) < 0.01;

  console.log(
    `\n  Balance consistent: ${balanceCorrect ? "✅ YES" : "❌ NO"} (expected ~${expectedBalance.toFixed(2)})`
  );

  const pass = successes.length <= MAX_EXPECTED_SUCCESS;

  if (pass) {
    console.log(
      `  ✅ TEST 1 PASSED — Only ${successes.length} orders succeeded (max ${MAX_EXPECTED_SUCCESS})`
    );
  } else {
    console.log(
      `  ❌ TEST 1 FAILED — ${successes.length} orders succeeded (expected ≤ ${MAX_EXPECTED_SUCCESS})`
    );
    console.log(`     DOUBLE SPEND VULNERABILITY DETECTED!`);
  }

  return pass && balanceCorrect;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TEST 2: Binary Option Restart Recovery
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testRestartRecovery(): Promise<boolean> {
  console.log(`\n${DIVIDER}`);
  console.log("  TEST 2: Binary Option Restart Recovery");
  console.log(DIVIDER);

  const SYMBOL = "ETH";
  const BINARY_SECONDS = 30; // must be in allowed set [30, 60, 120, 300]
  const NUM_ORDERS = 3;

  // Setup
  console.log("\n[Setup] Creating test user via SIWE login (balance 1000 USDT)...");
  await ensureCurrency(SYMBOL, 3400);
  const { uid, token } = await createTestUser("restart_test", "1000");

  console.log(`  User UID: ${uid}`);

  // Create 3 binary option orders with 30s timer
  console.log(
    `\n[Create] Opening ${NUM_ORDERS} binary option orders (${BINARY_SECONDS}s timer)...`
  );

  const orderIds: string[] = [];
  for (let i = 0; i < NUM_ORDERS; i++) {
    // Keep price fresh
    await pushPrice(SYMBOL, 3400 + Math.random() * 10);

    const { status, data } = await api(
      "POST",
      "/trade/binary/open",
      {
        symbol: SYMBOL,
        direction: i % 2 === 0 ? "long" : "short",
        amount: "50",
        seconds: BINARY_SECONDS,
      },
      token
    );

    if (status === 200 || status === 201) {
      orderIds.push(data.id);
      console.log(
        `  Order ${i + 1}: ID=${data.id} direction=${data.direction} status=${data.status}`
      );
    } else {
      console.log(`  Order ${i + 1}: FAILED — ${JSON.stringify(data)}`);
    }
  }

  if (orderIds.length === 0) {
    console.log("\n  ❌ TEST 2 FAILED — Could not create any binary orders");
    return false;
  }

  console.log(`\n${SUB_DIVIDER}`);
  console.log("  ⚠️  MANUAL STEP REQUIRED:");
  console.log(SUB_DIVIDER);
  console.log("  1. Stop the server NOW (Ctrl+C in the server terminal)");
  console.log("  2. Wait 5 seconds");
  console.log("  3. Restart the server (bun run dev)");
  console.log("");
  console.log("  This script will wait for the server to come back online...");
  console.log("  (timeout: 120 seconds)");
  console.log(SUB_DIVIDER);

  // Wait for server to go DOWN
  console.log("\n[Wait] Waiting for server to go offline...");
  let wentDown = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1000) });
      process.stdout.write(".");
      await sleep(1000);
    } catch {
      wentDown = true;
      console.log("\n[Detect] Server is offline! Waiting for restart...");
      break;
    }
  }

  if (!wentDown) {
    console.log(
      "\n  ⚠️  Server never went offline. If you didn't restart, the test"
    );
    console.log(
      "      will still check if orders settle normally after the timer."
    );
  }

  // Wait for server to come back up
  console.log("\n[Wait] Polling for server recovery");
  const recovered = await waitForServer();
  if (!recovered) {
    console.log("\n  ❌ TEST 2 FAILED — Server did not come back within timeout");
    return false;
  }
  console.log("\n[Detect] Server is back online!");

  // Wait for binary settlement (orders need time to settle after recovery)
  const waitSeconds = BINARY_SECONDS + 10; // extra buffer
  console.log(`\n[Wait] Waiting ${waitSeconds}s for binary options to settle...`);
  for (let s = 0; s < waitSeconds; s++) {
    // Keep pushing prices so settlement has data
    await pushPrice(SYMBOL, 3400 + (Math.random() - 0.5) * 20);
    process.stdout.write(`\r  ${waitSeconds - s}s remaining...`);
    await sleep(1000);
  }
  console.log("\r  Done waiting.                    ");

  // Check order statuses
  console.log(`\n${SUB_DIVIDER}`);
  console.log("  RESULTS:");
  console.log(SUB_DIVIDER);

  let allSettled = true;
  const { data: userOrders } = await api("GET", `/orders/user/${uid}`);

  for (const orderId of orderIds) {
    const order = (userOrders as any[])?.find(
      (o: any) => o.id === orderId
    );

    if (!order) {
      console.log(`  Order ${orderId}: ❌ NOT FOUND`);
      allSettled = false;
      continue;
    }

    const settled =
      order.status === "closed" || order.status === "liquidated";
    const icon = settled ? "✅" : "❌";
    console.log(
      `  Order ${orderId}: ${icon} status=${order.status} ` +
        `pnl=${order.pnl ?? "N/A"} exitPrice=${order.exitPrice ?? "N/A"}`
    );
    if (!settled) allSettled = false;
  }

  if (allSettled) {
    console.log(
      `\n  ✅ TEST 2 PASSED — All ${orderIds.length} binary orders settled after restart`
    );
  } else {
    console.log(
      `\n  ❌ TEST 2 FAILED — Some orders are still OPEN (not recovered after restart)`
    );
  }

  return allSettled;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Main
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(DIVIDER);
  console.log("  Trading Platform — Stress Test Suite");
  console.log("  Target: " + BASE);
  console.log(DIVIDER);

  // Preflight: check server is up
  console.log("\n[Preflight] Checking server connectivity...");
  try {
    const { status, data } = await api("GET", "/health");
    if (status !== 200) throw new Error("Health check failed");
    console.log(`  Server: OK | Redis: ${data.redis} | Env: ${data.env}`);
  } catch (err) {
    console.error("  ❌ Cannot reach server at " + BASE);
    console.error("  Make sure the server is running: bun run dev");
    process.exit(1);
  }

  const results: { name: string; pass: boolean }[] = [];

  // ── Test 1 ──
  try {
    const pass = await testDoubleSpend();
    results.push({ name: "Double Spend Attack", pass });
  } catch (err) {
    console.error("\n  ❌ TEST 1 CRASHED:", err);
    results.push({ name: "Double Spend Attack", pass: false });
  }

  // ── Test 2 ──
  try {
    const pass = await testRestartRecovery();
    results.push({ name: "Restart Recovery", pass });
  } catch (err) {
    console.error("\n  ❌ TEST 2 CRASHED:", err);
    results.push({ name: "Restart Recovery", pass: false });
  }

  // ── Final Report ──
  console.log(`\n\n${DIVIDER}`);
  console.log("  FINAL REPORT");
  console.log(DIVIDER);

  for (const r of results) {
    console.log(`  ${r.pass ? "✅ PASS" : "❌ FAIL"} — ${r.name}`);
  }

  const allPassed = results.every((r) => r.pass);
  console.log(
    `\n  ${allPassed ? "🎉 ALL TESTS PASSED" : "💀 SOME TESTS FAILED"}`
  );
  console.log(DIVIDER);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
