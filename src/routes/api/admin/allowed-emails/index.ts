import { defineHandler } from "void";
import { z } from "zod";
import { allowEmail, requireAdmin } from "@/server/allowed-emails";

const body = z.object({ email: z.email() });

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  requireAdmin(c);
  await allowEmail(body.email);
  return { ok: true };
});
