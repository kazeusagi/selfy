import { shareLinks } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { z } from "zod";
import { requireOwnedAlbum } from "@/server/access";

const DAY = 24 * 60 * 60 * 1000;

const body = z.object({
  expiry: z.enum(["7d", "30d", "never"]),
  allowDownload: z.boolean(),
});

function expiresAt(expiry: z.infer<typeof body>["expiry"]) {
  if (expiry === "never") return null;
  return Date.now() + (expiry === "7d" ? 7 : 30) * DAY;
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

// リンクを発行する。既にあれば同じURLのまま設定だけ更新し、期限は今から数え直す
export const PUT = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  const values = { ...body, expiresAt: expiresAt(body.expiry) };
  const [link] = await db
    .insert(shareLinks)
    .values({ ...values, albumId: album.id, token: createToken() })
    .onConflictDoUpdate({ target: shareLinks.albumId, set: values })
    .returning();
  return link;
});

// リンクを無効にする。再度オンにすると別のURLになる
export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const album = await requireOwnedAlbum(c.req.param("id")!, user.id);
  await db.delete(shareLinks).where(eq(shareLinks.albumId, album.id));
  return { ok: true };
});
