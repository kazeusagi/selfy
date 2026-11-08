import { photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { storage } from "void/storage";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { canDeletePhoto, findAlbumAccess, requirePhoto, setMarks } from "@/server/access";

const body = z
  .object({ favorite: z.boolean().optional(), hidden: z.boolean().optional() })
  .refine((value) => value.favorite !== undefined || value.hidden !== undefined);

export const PATCH = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const photo = await requirePhoto(c.req.param("id")!);
  const access = await findAlbumAccess(photo.albumId, user);
  // オーナーが非表示にした写真は、ほかの人には存在しないものとして扱う
  if (!access || (photo.hidden && access.role !== "owner")) {
    throw new HTTPException(404, { message: "写真が見つかりません" });
  }
  const { favorite, hidden } = body;
  // オーナーの非表示は招待した人や共有リンクからも隠す。ほかの人の非表示は自分にだけ効く
  if (hidden !== undefined && access.role === "owner") {
    await db.update(photos).set({ hidden }).where(eq(photos.id, photo.id));
    if (favorite !== undefined) await setMarks(user.id, [photo.id], { favorite });
  } else {
    await setMarks(user.id, [photo.id], { favorite, hidden });
  }
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
