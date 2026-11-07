import { userSettings } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db } from "void/db";
import { z } from "zod";
import { getUserSettings } from "@/server/settings";

const body = z
  .object({
    keepOriginal: z.boolean(),
    stripGps: z.boolean(),
    wifiOnly: z.boolean(),
    defaultExpiry: z.enum(["7d", "30d", "never"]),
  })
  .partial();

export const PATCH = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const values = { ...(await getUserSettings(user.id)), ...body };
  await db
    .insert(userSettings)
    .values({ ...values, userId: user.id })
    .onConflictDoUpdate({ target: userSettings.userId, set: values });
  return { ok: true };
});
