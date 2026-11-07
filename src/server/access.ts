import { albumMembers, albums, photos, shareLinks } from "@schema";
import { and, db, eq, inArray, or } from "void/db";
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
