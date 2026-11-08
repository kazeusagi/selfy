import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { hasHiddenPassword, setHiddenPassword, verifyHiddenPassword } from "@/server/hidden-password";

const body = z.object({
  current: z.string().max(200).optional(),
  password: z.string().min(4, "パスワードは4文字以上にしてください").max(200),
});

export const PUT = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  // 決めたあとに変えるときは、今のパスワードを知っている人にだけ許す
  if ((await hasHiddenPassword(user.id)) && !(await verifyHiddenPassword(user.id, body.current ?? ""))) {
    throw new HTTPException(401, { message: "今のパスワードが違います" });
  }
  await setHiddenPassword(user.id, body.password);
  return { ok: true };
});
