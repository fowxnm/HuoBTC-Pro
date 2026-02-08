import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { env } from "../config/env";

/**
 * Auth guard — extracts & verifies JWT from Authorization header,
 * loads user from DB, and attaches `currentUser` to the context.
 */
export const authGuard = new Elysia({ name: "authGuard" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
      exp: "7d",
    })
  )
  .derive(async ({ jwt, headers, set }) => {
    const authHeader = headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7);
    const payload = await jwt.verify(token);

    if (!payload || !payload.uid) {
      set.status = 401;
      throw new Error("Invalid or expired token");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, payload.uid as string))
      .limit(1);

    if (!user) {
      set.status = 404;
      throw new Error("User not found");
    }

    if (user.isFrozen) {
      set.status = 403;
      throw new Error("Account is frozen");
    }

    return {
      currentUser: user,
    };
  });
