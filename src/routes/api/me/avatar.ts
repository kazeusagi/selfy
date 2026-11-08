import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { storage } from "void/storage";
import { HTTPException } from "hono/http-exception";
import { avatarKey } from "@/server/users";

const TYPES = new Set(["image/webp", "image/jpeg"]);
// ブラウザで小さく縮めてから送るので、これを超えるのは想定外のもの
const MAX_BYTES = 512 * 1024;

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const file = (await c.req.formData()).get("avatar");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size > MAX_BYTES) {
    throw new HTTPException(400, { message: "対応していない画像です" });
  }
  await storage.put(avatarKey(user.id), file, { httpMetadata: { contentType: file.type } });
  // 同じ URL のままだとブラウザが前の画像を使うので、変えるたびに URL を変える
  return { image: `/api/users/${user.id}/avatar?v=${Date.now()}` };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  await storage.delete(avatarKey(user.id));
  return { ok: true };
});
