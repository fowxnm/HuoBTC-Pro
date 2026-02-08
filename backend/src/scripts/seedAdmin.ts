/**
 * Seed admin account: baby123 / 1234567
 * Run: bun run src/scripts/seedAdmin.ts
 */
import { db } from "../db";
import { admins } from "../db/schema";
import { eq } from "drizzle-orm";

const USERNAME = "baby123";
const PASSWORD = "1234567";

async function main() {
  // Check if already exists
  const [existing] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, USERNAME))
    .limit(1);

  if (existing) {
    console.log(`Admin '${USERNAME}' already exists (id=${existing.id}). Updating password...`);
    const hash = await Bun.password.hash(PASSWORD, { algorithm: "bcrypt", cost: 10 });
    await db.update(admins).set({ passwordHash: hash }).where(eq(admins.username, USERNAME));
    console.log("Password updated.");
  } else {
    const hash = await Bun.password.hash(PASSWORD, { algorithm: "bcrypt", cost: 10 });
    await db.insert(admins).values({ username: USERNAME, passwordHash: hash });
    console.log(`Admin '${USERNAME}' created successfully.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
