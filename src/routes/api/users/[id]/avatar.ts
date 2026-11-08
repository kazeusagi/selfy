import { defineHandler } from "void";
import { getUser } from "void/auth";
import { storage } from "void/storage";
import { avatarKey } from "@/server/users";

// アイコンはログインしている人どうしでだけ見せる
export const GET = defineHandler(async (c) => {
  if (!getUser()) return c.notFound();
  const object = await storage.get(avatarKey(c.req.param("id")!), { onlyIf: c.req.raw.headers });
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  // URL に版が入るので、同じ URL の中身は変わらない
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
});
