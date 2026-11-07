import { photos } from "@schema";
import { defineHandler } from "void";
import { getUser } from "void/auth";
import { db, eq } from "void/db";
import { storage } from "void/storage";
import { findActiveShareLink, findAlbumAccess } from "@/server/access";
import { getAlbumOwnerSettings } from "@/server/settings";

const EXTENSIONS: Record<string, string> = { "image/webp": ".webp", "image/jpeg": ".jpg" };

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

  let key = photo[KEY_COLUMNS[variant]];
  let replaced = false;

  const user = getUser();
  if (!user || !(await findAlbumAccess(photo.albumId, user))) {
    const token = c.req.query("share");
    const link = token ? await findActiveShareLink(token) : undefined;
    const allowed =
      link?.albumId === photo.albumId && (variant !== "original" || link.allowDownload);
    if (!allowed) return c.notFound();

    // 元画像の EXIF には位置情報が残るので、変換時に消えている表示用に差し替える
    const hasLocation = photo.latitude !== null || photo.longitude !== null;
    if (variant === "original" && hasLocation) {
      const { stripGps } = await getAlbumOwnerSettings(photo.albumId);
      if (stripGps) {
        key = photo.displayKey;
        replaced = true;
      }
    }
  }

  const object = await storage.get(key, {
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
  // 差し替えたときは中身に合わせて拡張子も変える
  const extension = EXTENSIONS[headers.get("content-type") ?? ""] ?? "";
  const name = replaced ? photo.fileName.replace(/(\.[^.]+)?$/, extension) : photo.fileName;
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);

  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
});
