import { photos } from "@schema";
import { defineHandler } from "void";
import { getUser } from "void/auth";
import { db, eq } from "void/db";
import { storage } from "void/storage";
import { findActiveShareLink } from "@/server/access";

const KEY_COLUMNS = {
  thumb: "thumbKey",
  display: "displayKey",
  original: "originalKey",
} as const;

export const GET = defineHandler(async (c) => {
  const variant = c.req.param("variant") as keyof typeof KEY_COLUMNS;
  if (!Object.hasOwn(KEY_COLUMNS, variant)) return c.notFound();

  const [photo] = await db.select().from(photos).where(eq(photos.id, c.req.param("id")!));
  if (!photo) return c.notFound();

  if (getUser()?.id !== photo.ownerId) {
    const token = c.req.query("share");
    const link = token ? await findActiveShareLink(token) : undefined;
    const allowed =
      link?.albumId === photo.albumId && (variant !== "original" || link.allowDownload);
    if (!allowed) return c.notFound();
  }

  const object = await storage.get(photo[KEY_COLUMNS[variant]], {
    onlyIf: c.req.raw.headers,
  });
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  // 権限の確認は毎回通すので、ブラウザには再検証させる
  headers.set("Cache-Control", "private, no-cache");
  // アップロードされたファイルをページとして実行させない。<img> の表示には影響しない
  headers.set("X-Content-Type-Options", "nosniff");
  const fileName = encodeURIComponent(photo.fileName);
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${fileName}`);

  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
});
