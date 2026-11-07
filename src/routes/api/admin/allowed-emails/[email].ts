import { allowedEmails } from "@schema";
import { defineHandler } from "void";
import { db, eq, sql } from "void/db";
import { isEmailAllowed, requireAdmin } from "@/server/allowed-emails";

export const DELETE = defineHandler(async (c) => {
  requireAdmin(c);
  const email = c.req.param("email")!.toLowerCase();
  await db.delete(allowedEmails).where(eq(allowedEmails.email, email));
  // session と user は Better Auth のテーブルで @schema には含まれない
  if (!(await isEmailAllowed(email))) {
    await db.run(sql`delete from session where userId in (select id from "user" where email = ${email})`);
  }
  return { ok: true };
});
