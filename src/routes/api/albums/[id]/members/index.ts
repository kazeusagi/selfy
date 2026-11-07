import { albumMembers } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, eq } from "void/db";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireOwnedAlbum } from "@/server/access";
import { sendInviteEmail } from "@/server/login-email";
import { displayName } from "@/server/users";

const body = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  role: z.enum(["viewer", "contributor"]),
});

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  if (body.email === user.email.toLowerCase()) {
    throw new HTTPException(400, { message: "自分自身は招待できません" });
  }

  const [existing] = await db
    .select({ id: albumMembers.id })
    .from(albumMembers)
    .where(and(eq(albumMembers.albumId, album.id), eq(albumMembers.email, body.email)));
  if (existing) throw new HTTPException(409, { message: "すでに招待しています" });

  const id = crypto.randomUUID();
  await db.insert(albumMembers).values({ ...body, id, albumId: album.id });
  const url = `${new URL(c.req.url).origin}/albums/${album.id}`;
  try {
    await sendInviteEmail(body.email, displayName(user), album.title, url);
  } catch (error) {
    await db.delete(albumMembers).where(eq(albumMembers.id, id));
    throw error;
  }
  return { id };
});
