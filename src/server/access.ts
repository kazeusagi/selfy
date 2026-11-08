import { albumMembers, albums, photoMarks, photos, shareLinks } from "@schema";
import { and, db, eq, inArray, or, sql } from "void/db";
import { HTTPException } from "hono/http-exception";

export type AlbumUser = { id: string; email: string };
export type AlbumRole = "owner" | "viewer" | "contributor";

export async function findOwnedAlbum(id: string, ownerId: string) {
  const [album] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.ownerId, ownerId)));
  return album;
}

export async function requireOwnedAlbum(id: string, ownerId: string) {
  const album = await findOwnedAlbum(id, ownerId);
  if (!album) throw new HTTPException(404, { message: "アルバムが見つかりません" });
  return album;
}

export async function findAlbumAccess(id: string, user: AlbumUser) {
  const [row] = await db
    .select({ album: albums, memberRole: albumMembers.role })
    .from(albums)
    .leftJoin(
      albumMembers,
      and(eq(albumMembers.albumId, albums.id), eq(albumMembers.email, user.email.toLowerCase())),
    )
    .where(eq(albums.id, id));
  if (!row) return undefined;
  const role: AlbumRole | null = row.album.ownerId === user.id ? "owner" : row.memberRole;
  return role ? { album: row.album, role } : undefined;
}

export function canAddPhotos(role: AlbumRole) {
  return role !== "viewer";
}

// 追加を許された人が消せるのは自分が追加した写真だけ
export function canDeletePhoto(role: AlbumRole, photo: { ownerId: string }, userId: string) {
  return role === "owner" || (role === "contributor" && photo.ownerId === userId);
}

// 自分のアルバムと招待されたアルバムに絞る条件
export function accessibleAlbums(user: AlbumUser) {
  const invited = db
    .select({ id: albumMembers.albumId })
    .from(albumMembers)
    .where(eq(albumMembers.email, user.email.toLowerCase()));
  return or(eq(albums.ownerId, user.id), inArray(albums.id, invited))!;
}

export async function listWritableAlbums(user: AlbumUser) {
  const rows = await db
    .select({
      id: albums.id,
      title: albums.title,
      ownerId: albums.ownerId,
      memberRole: albumMembers.role,
    })
    .from(albums)
    .leftJoin(
      albumMembers,
      and(eq(albumMembers.albumId, albums.id), eq(albumMembers.email, user.email.toLowerCase())),
    )
    .where(accessibleAlbums(user));
  return rows
    .filter((album) => album.ownerId === user.id || album.memberRole === "contributor")
    .map(({ id, title }) => ({ id, title }));
}

export async function requirePhoto(id: string) {
  const [photo] = await db.select().from(photos).where(eq(photos.id, id));
  if (!photo) throw new HTTPException(404, { message: "写真が見つかりません" });
  return photo;
}

export function isLinkActive(link: { expiresAt: number | null }) {
  return link.expiresAt === null || link.expiresAt > Date.now();
}

export async function findActiveShareLink(token: string) {
  const [link] = await db.select().from(shareLinks).where(eq(shareLinks.token, token));
  return link && isLinkActive(link) ? link : undefined;
}

// photo_marks を自分の分だけ写真につなぐ。印がない写真も残すので left join で使う
export function myMarks(userId: string) {
  return and(eq(photoMarks.photoId, photos.id), eq(photoMarks.userId, userId))!;
}

export const isFavorite = sql<boolean>`coalesce(${photoMarks.favorite}, 0)`.mapWith(Boolean);

// 誰にも非表示にされていない写真。オーナーの非表示は全員から、自分の非表示は自分からだけ隠す
export const isShown = sql`(not ${photos.hidden} and not coalesce(${photoMarks.hidden}, 0))`;

// 自分が非表示にした写真。オーナーの非表示は photos.hidden に入るので、albums もつないで使う
export function isHiddenBy(userId: string) {
  return sql`((${photos.hidden} and ${albums.ownerId} = ${userId}) or coalesce(${photoMarks.hidden}, 0))`;
}

// 印は1人1行なので、なければ作ってから書き換える
export async function setMarks(userId: string, photoIds: string[], values: { favorite?: boolean; hidden?: boolean }) {
  // 渡されなかった方は今の値を残す
  const set = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  // D1 は1つの文に渡せる値が100個までなので、1行4つとして分ける
  for (let i = 0; i < photoIds.length; i += 20) {
    await db
      .insert(photoMarks)
      .values(photoIds.slice(i, i + 20).map((photoId) => ({ userId, photoId, ...values })))
      .onConflictDoUpdate({ target: [photoMarks.userId, photoMarks.photoId], set });
  }
}
