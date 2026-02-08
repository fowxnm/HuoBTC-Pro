import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { admins } from "../db/schema";
import { env } from "../config/env";

export const adminAuthRoutes = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "adminJwt",
      secret: env.JWT_SECRET + "_admin",
      exp: "12h",
    })
  )

  // ── Admin Login ──
  .post(
    "/login",
    async ({ body, adminJwt, set }) => {
      const { username, password } = body;

      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.username, username))
        .limit(1);

      if (!admin) {
        set.status = 401;
        return { message: "用户名或密码错误" } as any;
      }

      // Verify password using Bun's built-in bcrypt-compatible hasher
      const valid = await Bun.password.verify(password, admin.passwordHash);
      if (!valid) {
        set.status = 401;
        return { message: "用户名或密码错误" } as any;
      }

      const token = await adminJwt.sign({
        adminId: String(admin.id),
        username: admin.username,
      });

      return { token, username: admin.username };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Admin login",
      },
    }
  )

  // ── Verify admin token (GET /admin/me) ──
  .get(
    "/me",
    async ({ headers, adminJwt, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Unauthorized" } as any;
      }

      const payload = await adminJwt.verify(authHeader.slice(7));
      if (!payload) {
        set.status = 401;
        return { message: "Invalid or expired token" } as any;
      }

      return { adminId: payload.adminId, username: payload.username };
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "Verify admin session",
      },
    }
  );
