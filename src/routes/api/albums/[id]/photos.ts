import { photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db } from "void/db";
import { storage } from "void/storage";
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
});

function fileField(form: FormData, name: string, allowed: Set<string>) {
  const value = form.get(name);
  if (!(value instanceof File) || !allowed.has(value.type)) {
    throw new HTTPException(400, { message: "対応していない画像形式です" });
  }
  return value;
}

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const access = await findAlbumAccess(c.req.param("id")!, user);
  if (!access || !canAddPhotos(access.role)) {
    throw new HTTPException(404, { message: "アルバムが見つかりません" });
  }
  const { album } = access;

  const form = await c.req.formData();
  const original = fileField(form, "original", ORIGINAL_TYPES);
  const display = fileField(form, "display", PREVIEW_TYPES);
  const thumb = fileField(form, "thumb", PREVIEW_TYPES);
  const parsed = meta.safeParse(JSON.parse(String(form.get("meta") ?? "null")));
  if (!parsed.success) throw new HTTPException(400, { message: "写真の情報が不正です" });

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
