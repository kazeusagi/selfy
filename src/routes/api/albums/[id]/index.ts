import { albums, photoMarks, photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, asc, db, eq } from "void/db";
import { storage } from "void/storage";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  canAddPhotos,
  canDeletePhoto,
  findAlbumAccess,
  isFavorite,
  isShown,
  myMarks,
  requireOwnedAlbum,
} from "@/server/access";

const body = z.object({ title: z.string().trim().min(1).max(100) });

// アプリ用の写真一覧。ページの loader と同じ並びと絞り込みで返す
export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const access = await findAlbumAccess(c.req.param("id")!, user);
  if (!access) throw new HTTPException(404, { message: "アルバムが見つかりません" });
  const { album, role } = access;

  const rows = await db
    .select({
      id: photos.id,
      ownerId: photos.ownerId,
      fileName: photos.fileName,
      takenAt: photos.takenAt,
      width: photos.width,
      height: photos.height,
      originalBytes: photos.originalBytes,
      favorite: isFavorite,
    })
    .from(photos)
    .leftJoin(photoMarks, myMarks(user.id))
    .where(and(eq(photos.albumId, album.id), isShown))
    .orderBy(asc(photos.takenAt), asc(photos.createdAt));

  return {
    album: { id: album.id, title: album.title },
    role,
    canAdd: canAddPhotos(role),
    photos: rows.map(({ ownerId, ...row }) => ({ ...row, deletable: canDeletePhoto(role, { ownerId }, user.id) })),
  };
});

export const PATCH = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  await db.update(albums).set({ title: body.title }).where(eq(albums.id, album.id));
  return { ok: true };
});

// R2 の delete は1回1000件まで
const R2_DELETE_LIMIT = 1000;

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  const rows = await db.select().from(photos).where(eq(photos.albumId, album.id));
  const keys = rows.flatMap((p) => [p.originalKey, p.displayKey, p.thumbKey]);
  for (let i = 0; i < keys.length; i += R2_DELETE_LIMIT) {
    await storage.delete(keys.slice(i, i + R2_DELETE_LIMIT));
  }
  // photos と share_links は外部キーの cascade で消える
  await db.delete(albums).where(eq(albums.id, album.id));
  return { ok: true };
});
