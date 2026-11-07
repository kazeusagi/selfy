import { albums, photos } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, db, desc, eq } from "void/db";
import { listWritableAlbums } from "@/server/access";
import { getUserSettings } from "@/server/settings";
import { addAddedBy } from "@/server/users";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");

  const [rows, albumOptions, settings] = await Promise.all([
    db
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
        favorite: photos.favorite,
      })
      .from(photos)
      .innerJoin(albums, eq(albums.id, photos.albumId))
      .where(and(eq(albums.ownerId, user.id), eq(photos.favorite, true), eq(photos.hidden, false)))
      .orderBy(desc(photos.takenAt), desc(photos.createdAt)),
    listWritableAlbums(user),
    getUserSettings(user.id),
  ]);

  return {
    user: { name: user.name, email: user.email },
    photos: await addAddedBy(rows, user.id),
    albumOptions,
    settings,
  };
});

export const head = defineHead(() => ({ title: "お気に入り" }));
