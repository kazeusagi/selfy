import { photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { storage } from "void/storage";
import { z } from "zod";
import { requireOwnedPhoto } from "@/server/access";

const body = z.object({ favorite: z.boolean() });

export const PATCH = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const photo = await requireOwnedPhoto(c.req.param("id")!, user.id);
  await db.update(photos).set({ favorite: body.favorite }).where(eq(photos.id, photo.id));
  return { ok: true };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const photo = await requireOwnedPhoto(c.req.param("id")!, user.id);
  await storage.delete([photo.originalKey, photo.displayKey, photo.thumbKey]);
  await db.delete(photos).where(eq(photos.id, photo.id));
  return { ok: true };
});
