import { allowedEmails } from "@schema";
import { db, desc, eq, sql } from "void/db";
import { env } from "void/env";
import { requireAuth } from "void/auth";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";

export function isAdmin(user: { email: string }) {
  return user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
}

export function requireAdmin(c: Context) {
  const user = requireAuth(c);
  if (!isAdmin(user)) throw new HTTPException(403, { message: "管理者のみの操作です" });
  return user;
}

export async function isEmailAllowed(email: string) {
  if (isAdmin({ email })) return true;
  const [row] = await db
    .select({ email: allowedEmails.email })
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email.toLowerCase()));
  return row !== undefined;
}

export async function allowEmail(email: string) {
  await db.insert(allowedEmails).values({ email: email.toLowerCase() }).onConflictDoNothing();
}

// 許可を外された人も user テーブルには残るので、ログインできる人だけに絞る
export async function listAllowedUsers() {
  const admin = env.ADMIN_EMAIL.toLowerCase();
  return db.all<{ id: string; name: string; email: string }>(
    sql`select id, name, email from "user"
        where email = ${admin} or email in (select email from allowed_emails)
        order by coalesce(nullif(name, ''), email)`,
  );
}

export async function listAllowedEmails() {
  const rows = await db
    .select({ email: allowedEmails.email })
    .from(allowedEmails)
    .orderBy(desc(allowedEmails.createdAt), allowedEmails.email);
  return rows.map((row) => row.email);
}
