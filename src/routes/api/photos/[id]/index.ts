import { photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { storage } from "void/storage";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { canDeletePhoto, findAlbumAccess, requirePhoto } from "@/server/access";

const body = z
  .object({ favorite: z.boolean().optional(), hidden: z.boolean().optional() })
  .refine((value) => value.favorite !== undefined || value.hidden !== undefined);

export const PATCH = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const photo = await requirePhoto(c.req.param("id")!);
  const access = await findAlbumAccess(photo.albumId, user);
  // お気に入りと非表示は写真に1つだけなので、アルバムのオーナーのものとして扱う
  if (access?.role !== "owner") throw new HTTPException(404, { message: "写真が見つかりません" });
  await db.update(photos).set(body).where(eq(photos.id, photo.id));
  return { ok: true };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const photo = await requirePhoto(c.req.param("id")!);
  const access = await findAlbumAccess(photo.albumId, user);
  if (!access || !canDeletePhoto(access.role, photo, user.id)) {
    throw new HTTPException(404, { message: "写真が見つかりません" });
  }
  await storage.delete([photo.originalKey, photo.displayKey, photo.thumbKey]);
  await db.delete(photos).where(eq(photos.id, photo.id));
  return { ok: true };
});
