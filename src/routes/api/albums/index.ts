import { albums } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db } from "void/db";
import { z } from "zod";

const body = z.object({ title: z.string().trim().min(1).max(100) });

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const [album] = await db
    .insert(albums)
    .values({ id: crypto.randomUUID(), ownerId: user.id, title: body.title })
    .returning();
  return album;
});
