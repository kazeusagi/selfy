import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { z } from "zod";
import { requireOwnedAlbum } from "@/server/access";
import { inviteMember } from "@/server/invite";

const body = z.object({
  userId: z.string(),
  role: z.enum(["viewer", "contributor"]),
});

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  const id = await inviteMember(album, user, body.userId, body.role, new URL(c.req.url).origin);
  return { id };
});
