import { photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, eq, isNotNull } from "void/db";
import { storage } from "void/storage";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { canAddPhotos, findAlbumAccess } from "@/server/access";

const ORIGINAL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);
const PREVIEW_TYPES = new Set(["image/webp", "image/jpeg"]);

const meta = z.object({
  fileName: z.string().min(1).max(255),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  takenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  camera: z.string().max(100).nullable(),
  exposure: z.string().max(100).nullable(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
});

function fileField(form: FormData, name: string, allowed: Set<string>) {
  const value = form.get(name);
  if (!(value instanceof File) || !allowed.has(value.type)) {
    throw new HTTPException(400, { message: "対応していない画像形式です" });
  }
  return value;
}

async function requireAddableAlbum(c: Context) {
  const user = requireAuth(c);
  const access = await findAlbumAccess(c.req.param("id")!, user);
  if (!access || !canAddPhotos(access.role)) {
    throw new HTTPException(404, { message: "アルバムが見つかりません" });
  }
  return { user, album: access.album };
}

// 重い変換を始める前に、追加済みの写真をブラウザ側で除けるようにする
export const GET = defineHandler(async (c) => {
  const { album } = await requireAddableAlbum(c);
  const rows = await db
    .select({ hash: photos.contentHash })
    .from(photos)
    .where(and(eq(photos.albumId, album.id), isNotNull(photos.contentHash)));
  return { hashes: rows.map((row) => row.hash!) };
});

export const POST = defineHandler(async (c) => {
  const { user, album } = await requireAddableAlbum(c);

  const form = await c.req.formData();
  const original = fileField(form, "original", ORIGINAL_TYPES);
  const display = fileField(form, "display", PREVIEW_TYPES);
  const thumb = fileField(form, "thumb", PREVIEW_TYPES);
  const parsed = meta.safeParse(JSON.parse(String(form.get("meta") ?? "null")));
  if (!parsed.success) throw new HTTPException(400, { message: "写真の情報が不正です" });

  // 別の端末から同時に追加された場合など、ブラウザ側の確認をすり抜けたものをここで止める
  const [duplicate] = await db
    .select({ id: photos.id })
    .from(photos)
    .where(and(eq(photos.albumId, album.id), eq(photos.contentHash, parsed.data.contentHash)))
    .limit(1);
  if (duplicate) throw new HTTPException(409, { message: "追加済みの写真です" });

  const id = crypto.randomUUID();
  const prefix = `photos/${user.id}/${id}`;
  const files = [
    { key: `${prefix}/original`, file: original },
    { key: `${prefix}/display`, file: display },
    { key: `${prefix}/thumb`, file: thumb },
  ];

  try {
    await Promise.all(
      files.map(({ key, file }) =>
        storage.put(key, file.stream(), { httpMetadata: { contentType: file.type } }),
      ),
    );
    const [photo] = await db
      .insert(photos)
      .values({
        ...parsed.data,
        id,
        albumId: album.id,
        ownerId: user.id,
        originalKey: files[0].key,
        displayKey: files[1].key,
        thumbKey: files[2].key,
        originalBytes: original.size,
        storedBytes: original.size + display.size + thumb.size,
      })
      .returning({ id: photos.id });
    return photo;
  } catch (error) {
    await storage.delete(files.map((f) => f.key));
    throw error;
  }
});
