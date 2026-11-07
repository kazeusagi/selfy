import { albums, photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { storage } from "void/storage";
import { z } from "zod";
import { requireOwnedAlbum } from "@/server/access";

const body = z.object({ title: z.string().trim().min(1).max(100) });

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
