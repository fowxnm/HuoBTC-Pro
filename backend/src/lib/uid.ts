import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

/** Generate a random 8-digit numeric string (10000000 ~ 99999999) */
function randomNumericUid(): string {
  const min = 10_000_000;
  const max = 99_999_999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/** Generate a unique 8-digit numeric UID (checks DB for collisions) */
export async function generateUniqueUid(): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const uid = randomNumericUid();
    const [existing] = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    if (!existing) return uid;
  }
  throw new Error("Failed to generate unique UID after max attempts");
}
