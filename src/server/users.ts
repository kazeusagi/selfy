import { db, sql } from "void/db";

type UserRow = { id: string; name: string; email: string; image: string | null };

// user テーブルは Better Auth が管理していて @schema には含まれない
export async function findUsersByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.all<UserRow>(sql`select id, name, email, image from "user" where id in ${ids}`);
}

export async function findUsersByEmails(emails: string[]) {
  if (!emails.length) return [];
  return db.all<UserRow>(sql`select id, name, email, image from "user" where email in ${emails}`);
}

export function avatarKey(userId: string) {
  return `avatars/${userId}`;
}

// image は本人が自由に書き換えられるので、ほかの人の画面で外部の URL を読ませないよう自前のものだけ使う
export function avatarOf(user: { id: string; image?: string | null }) {
  return user.image?.startsWith(`/api/users/${user.id}/avatar`) ? user.image : null;
}

export function accountOf(user: { id: string; name: string; email: string; image?: string | null }) {
  return { name: user.name, email: user.email, image: avatarOf(user) };
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
