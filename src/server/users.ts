import { db, sql } from "void/db";

type UserRow = { id: string; name: string; email: string };

// user テーブルは Better Auth が管理していて @schema には含まれない
export async function findUsersByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.all<UserRow>(sql`select id, name, email from "user" where id in ${ids}`);
}

export async function findUsersByEmails(emails: string[]) {
  if (!emails.length) return [];
  return db.all<UserRow>(sql`select id, name, email from "user" where email in ${emails}`);
}

export function displayName(user: { name: string; email: string }) {
  return user.name || user.email;
}

export function initialOf(user: { name: string; email: string }) {
  return displayName(user).charAt(0).toUpperCase();
}

export async function addAddedBy<T extends { ownerId: string }>(rows: T[], viewerId: string) {
  const others = [...new Set(rows.map((row) => row.ownerId))].filter((id) => id !== viewerId);
  const names = new Map((await findUsersByIds(others)).map((user) => [user.id, displayName(user)]));
  return rows.map(({ ownerId, ...row }) => ({
    ...row,
    addedBy: ownerId === viewerId ? "あなた" : (names.get(ownerId) ?? "不明"),
  }));
}
