import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { chatMessages, users } from "../db/schema";
import { env } from "../config/env";

// ── User-facing chat routes (require JWT auth token) ──
export const chatRoutes = new Elysia({ prefix: "/chat" })
  .use(jwt({ name: "jwt", secret: env.JWT_SECRET }))

  // Get my messages
  .get(
    "/messages",
    async ({ jwt, headers, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) { set.status = 401; return { message: "Unauthorized" } as any; }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload || !payload.uid) { set.status = 401; return { message: "Invalid token" } as any; }
      const uid = payload.uid as string;

      await db.update(users).set({ lastOnlineAt: new Date() }).where(eq(users.uid, uid));

      const msgs = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.uid, uid))
        .orderBy(chatMessages.createdAt)
        .limit(200);

      return msgs.map((m) => ({
        id: m.id.toString(),
        sender: m.sender,
        content: m.content || "",
        imageUrl: m.imageUrl || "",
        createdAt: m.createdAt.toISOString(),
      }));
    },
    { detail: { tags: ["Chat"], summary: "Get my chat messages" } }
  )

  // Send a message (user -> admin)
  .post(
    "/send",
    async ({ jwt, headers, body, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) { set.status = 401; return { message: "Unauthorized" } as any; }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload || !payload.uid) { set.status = 401; return { message: "Invalid token" } as any; }
      const uid = payload.uid as string;

      await db.update(users).set({ lastOnlineAt: new Date() }).where(eq(users.uid, uid));

      const [msg] = await db.insert(chatMessages).values({
        uid,
        sender: "user",
        content: body.content || null,
        imageUrl: body.imageUrl || null,
      }).returning();

      return {
        id: msg!.id.toString(),
        sender: msg!.sender,
        content: msg!.content || "",
        imageUrl: msg!.imageUrl || "",
        createdAt: msg!.createdAt.toISOString(),
      };
    },
    {
      body: t.Object({
        content: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
      }),
      detail: { tags: ["Chat"], summary: "Send chat message as user" },
    }
  )

  // Upload chat image (user)
  .post(
    "/upload",
    async ({ jwt, headers, body, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) { set.status = 401; return { message: "Unauthorized" } as any; }
      const payload = await jwt.verify(authHeader.slice(7));
      if (!payload || !payload.uid) { set.status = 401; return { message: "Invalid token" } as any; }
      const uid = payload.uid as string;

      const file = body.image;
      if (!file || !(file instanceof File)) { set.status = 400; return { message: "No file" } as any; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filename = `chat_${uid}_${Date.now()}.${ext}`;
      const filepath = `uploads/icons/${filename}`;
      await Bun.write(filepath, await file.arrayBuffer());
      return { url: `/uploads/icons/${filename}` };
    },
    {
      body: t.Object({ image: t.File() }),
      detail: { tags: ["Chat"], summary: "Upload chat image" },
    }
  );

// ── Admin chat routes ──
export const adminChatRoutes = new Elysia({ prefix: "/admin/chat" })

  // List conversations (unique users who have messages)
  .get(
    "/conversations",
    async () => {
      try {
        // Simple raw query to get distinct UIDs with last message time
        const rows = await db.execute(
          sql`SELECT uid, MAX(created_at) as last_at FROM chat_messages GROUP BY uid ORDER BY last_at DESC`
        ) as any[];

        const result = [];
        for (const row of rows as any[]) {
          const uid = row.uid as string;

          const [user] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
          const [lastMsg] = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.uid, uid))
            .orderBy(desc(chatMessages.createdAt))
            .limit(1);

          // Count unread: user messages that came after admin's last reply
          const unreadResult = await db.execute(
            sql`SELECT count(*)::int as cnt FROM chat_messages WHERE uid = ${uid} AND sender = 'user' AND created_at > COALESCE((SELECT MAX(created_at) FROM chat_messages WHERE uid = ${uid} AND sender = 'admin'), '1970-01-01'::timestamptz)`
          ) as any[];
          const unread = unreadResult[0]?.cnt ?? 0;

          result.push({
            uid,
            address: user?.address || "",
            balanceUsdt: user?.balanceUsdt || "0",
            lastOnlineAt: user?.lastOnlineAt?.toISOString() || "",
            lastMessage: lastMsg?.content || (lastMsg?.imageUrl ? "[图片]" : ""),
            lastMessageAt: row.last_at ? new Date(row.last_at as string).toISOString() : "",
            unread,
          });
        }
        return result;
      } catch (e: any) {
        console.error("chat conversations error:", e);
        return [];
      }
    },
    { detail: { tags: ["Admin Chat"], summary: "List chat conversations" } }
  )

  // Get messages for a user
  .get(
    "/messages/:uid",
    async ({ params }) => {
      const msgs = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.uid, params.uid))
        .orderBy(chatMessages.createdAt)
        .limit(500);

      return msgs.map((m) => ({
        id: m.id.toString(),
        sender: m.sender,
        content: m.content || "",
        imageUrl: m.imageUrl || "",
        createdAt: m.createdAt.toISOString(),
      }));
    },
    {
      params: t.Object({ uid: t.String() }),
      detail: { tags: ["Admin Chat"], summary: "Get messages for a user" },
    }
  )

  // Send message (admin -> user)
  .post(
    "/send/:uid",
    async ({ params, body }) => {
      const [msg] = await db.insert(chatMessages).values({
        uid: params.uid,
        sender: "admin",
        content: body.content || null,
        imageUrl: body.imageUrl || null,
      }).returning();

      return {
        id: msg!.id.toString(),
        sender: msg!.sender,
        content: msg!.content || "",
        imageUrl: msg!.imageUrl || "",
        createdAt: msg!.createdAt.toISOString(),
      };
    },
    {
      params: t.Object({ uid: t.String() }),
      body: t.Object({
        content: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
      }),
      detail: { tags: ["Admin Chat"], summary: "Send message as admin to user" },
    }
  )

  // Upload chat image (admin)
  .post(
    "/upload",
    async ({ body, set }) => {
      const file = body.image;
      if (!file || !(file instanceof File)) { set.status = 400; return { message: "No file" } as any; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filename = `chat_admin_${Date.now()}.${ext}`;
      const filepath = `uploads/icons/${filename}`;
      await Bun.write(filepath, await file.arrayBuffer());
      return { url: `/uploads/icons/${filename}` };
    },
    {
      body: t.Object({ image: t.File() }),
      detail: { tags: ["Admin Chat"], summary: "Upload chat image (admin)" },
    }
  );
