import { albums, photoMarks, photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, desc, eq } from "void/db";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { accessibleAlbums, isFavorite, isHiddenBy, myMarks } from "@/server/access";
import { verifyHiddenPassword } from "@/server/hidden-password";
import { addAddedBy } from "@/server/users";

const body = z.object({ password: z.string().min(1).max(200) });

// 一覧はパスワードと引き換えに返す。ページを開き直すたびに入れ直してもらう
export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  if (!(await verifyHiddenPassword(user.id, body.password))) {
    throw new HTTPException(401, { message: "パスワードが違います" });
  }
  const rows = await db
    .select({
      id: photos.id,
      ownerId: photos.ownerId,
      albumId: photos.albumId,
      albumTitle: albums.title,
      fileName: photos.fileName,
      takenAt: photos.takenAt,
      width: photos.width,
      height: photos.height,
      originalBytes: photos.originalBytes,
      latitude: photos.latitude,
      longitude: photos.longitude,
      camera: photos.camera,
      exposure: photos.exposure,
      favorite: isFavorite,
    })
    .from(photos)
    .innerJoin(albums, eq(albums.id, photos.albumId))
    .leftJoin(photoMarks, myMarks(user.id))
    .where(and(accessibleAlbums(user), isHiddenBy(user.id)))
    .orderBy(desc(photos.takenAt), desc(photos.createdAt));
  return { photos: await addAddedBy(rows, user.id) };
});
