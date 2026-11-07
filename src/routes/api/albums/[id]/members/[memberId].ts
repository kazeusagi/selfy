import { albumMembers } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, eq } from "void/db";
import { z } from "zod";
import { requireOwnedAlbum } from "@/server/access";

const body = z.object({ role: z.enum(["viewer", "contributor"]) });

export const PATCH = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  await db
    .update(albumMembers)
    .set({ role: body.role })
    .where(and(eq(albumMembers.id, c.req.param("memberId")!), eq(albumMembers.albumId, album.id)));
  return { ok: true };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  await db
    .delete(albumMembers)
    .where(and(eq(albumMembers.id, c.req.param("memberId")!), eq(albumMembers.albumId, album.id)));
  return { ok: true };
});
