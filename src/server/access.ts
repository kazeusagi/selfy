import { albums, photos, shareLinks } from "@schema";
import { and, db, eq } from "void/db";
import { HTTPException } from "hono/http-exception";

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

export async function requireOwnedPhoto(id: string, ownerId: string) {
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
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
