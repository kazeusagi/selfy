import { photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, eq, inArray } from "void/db";
import { storage } from "void/storage";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { canDeletePhoto, findAlbumAccess, requireOwnedAlbum } from "@/server/access";

// D1 は1つの文に渡せる値が100個までなので、ID 以外の値の分を残して分ける
const SQL_CHUNK = 90;
// R2 の一括削除は1回1000件まで。写真1枚につき3つのファイルがある
const STORAGE_CHUNK = 999;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["hide", "show", "delete"]), photoIds: z.array(z.string()).min(1).max(1000) }),
  z.object({ action: z.literal("move"), photoIds: z.array(z.string()).min(1).max(1000), targetAlbumId: z.string() }),
]);

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const albumId = c.req.param("id")!;
  const access = await findAlbumAccess(albumId, user);
  if (!access) throw new HTTPException(404, { message: "アルバムが見つかりません" });

  const ids = [...new Set(body.photoIds)];
  const idChunks = chunks(ids, SQL_CHUNK);
  const rows = (
    await Promise.all(
      idChunks.map((chunk) =>
        db
          .select({
            id: photos.id,
            ownerId: photos.ownerId,
            originalKey: photos.originalKey,
            displayKey: photos.displayKey,
            thumbKey: photos.thumbKey,
          })
          .from(photos)
          .where(and(eq(photos.albumId, albumId), inArray(photos.id, chunk))),
      ),
    )
  ).flat();
  // 一部だけ処理すると何が起きたか分からなくなるので、1枚でも見つからなければ全体を断る
  if (rows.length !== ids.length) throw new HTTPException(404, { message: "写真が見つかりません" });

  // 非表示と移動はお気に入りと同じくオーナーだけに許す
  if (body.action !== "delete" && access.role !== "owner") {
    throw new HTTPException(404, { message: "写真が見つかりません" });
  }

  const inAlbum = (chunk: string[]) => and(eq(photos.albumId, albumId), inArray(photos.id, chunk));

  if (body.action === "hide" || body.action === "show") {
    const hidden = body.action === "hide";
    for (const chunk of idChunks) await db.update(photos).set({ hidden }).where(inAlbum(chunk));
    return { ok: true, count: ids.length };
  }

  if (body.action === "move") {
    // 移動先は自分のアルバムに限る。招待されたアルバムに入れると、他人の写真を消せなくなるうえ相手の容量を使う
    if (body.targetAlbumId === albumId) throw new HTTPException(400, { message: "同じアルバムには移動できません" });
    await requireOwnedAlbum(body.targetAlbumId, user.id);
    for (const chunk of idChunks) {
      await db.update(photos).set({ albumId: body.targetAlbumId }).where(inAlbum(chunk));
    }
    return { ok: true, count: ids.length };
  }

  if (!rows.every((photo) => canDeletePhoto(access.role, photo, user.id))) {
    throw new HTTPException(403, { message: "削除できない写真が含まれています" });
  }
  const keys = rows.flatMap((photo) => [photo.originalKey, photo.displayKey, photo.thumbKey]);
  for (const chunk of chunks(keys, STORAGE_CHUNK)) await storage.delete(chunk);
  for (const chunk of idChunks) await db.delete(photos).where(inAlbum(chunk));
  return { ok: true, count: ids.length };
});
