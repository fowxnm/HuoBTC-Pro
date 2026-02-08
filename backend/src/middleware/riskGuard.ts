import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, currencies } from "../db/schema";

/**
 * Global risk guard — called before every trade operation.
 * Re-queries the DB to confirm the user is not frozen and the currency is active.
 * Prevents bypass if admin freezes a user or deactivates a coin mid-session.
 */
export async function assertUserNotFrozen(uid: string): Promise<void> {
  const [user] = await db
    .select({ isFrozen: users.isFrozen })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  if (!user) throw new RiskGuardError(404, "User not found");
  if (user.isFrozen) throw new RiskGuardError(403, "Account is frozen");
}

export async function assertCurrencyActive(symbol: string): Promise<void> {
  const [currency] = await db
    .select({ activeStatus: currencies.activeStatus })
    .from(currencies)
    .where(eq(currencies.symbol, symbol.toUpperCase()))
    .limit(1);

  if (!currency) throw new RiskGuardError(404, "Currency not found");
  if (!currency.activeStatus)
    throw new RiskGuardError(400, "Currency is deactivated");
}

/**
 * Combined guard — call before open/close operations.
 */
export async function assertTradeAllowed(
  uid: string,
  symbol: string
): Promise<void> {
  await assertUserNotFrozen(uid);
  await assertCurrencyActive(symbol);
}

export class RiskGuardError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "RiskGuardError";
  }
}
