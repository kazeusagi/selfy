import { albumMembers } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, eq } from "void/db";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireOwnedAlbum } from "@/server/access";
import { isEmailAllowed } from "@/server/allowed-emails";
import { sendInviteEmail } from "@/server/login-email";
import { displayName, findUsersByIds } from "@/server/users";

const body = z.object({
  userId: z.string(),
  role: z.enum(["viewer", "contributor"]),
});

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  const [target] = await findUsersByIds([body.userId]);
  if (!target || target.id === user.id || !(await isEmailAllowed(target.email))) {
    throw new HTTPException(400, { message: "このユーザーは招待できません" });
  }
  const email = target.email.toLowerCase();

  const [existing] = await db
    .select({ id: albumMembers.id })
    .from(albumMembers)
    .where(and(eq(albumMembers.albumId, album.id), eq(albumMembers.email, email)));
  if (existing) throw new HTTPException(409, { message: "すでに招待しています" });

  const id = crypto.randomUUID();
  await db.insert(albumMembers).values({ id, albumId: album.id, email, role: body.role });
  const url = `${new URL(c.req.url).origin}/albums/${album.id}`;
  try {
    await sendInviteEmail(email, displayName(user), album.title, url);
  } catch (error) {
    await db.delete(albumMembers).where(eq(albumMembers.id, id));
    throw error;
  }
  return { id };
});
