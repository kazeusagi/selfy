import { albums, photos } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { asc, db, eq } from "void/db";
import { findActiveShareLink } from "@/server/access";
import { getAlbumOwnerSettings } from "@/server/settings";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const token = c.req.param("token")!;
  const link = await findActiveShareLink(token);
  if (!link) return { shared: null };

  const [[album], rows, settings] = await Promise.all([
    db.select({ title: albums.title }).from(albums).where(eq(albums.id, link.albumId)),
    db
      .select({
        id: photos.id,
        fileName: photos.fileName,
        takenAt: photos.takenAt,
        width: photos.width,
        height: photos.height,
        originalBytes: photos.originalBytes,
        camera: photos.camera,
        exposure: photos.exposure,
        latitude: photos.latitude,
        longitude: photos.longitude,
      })
      .from(photos)
      .where(eq(photos.albumId, link.albumId))
      .orderBy(asc(photos.takenAt), asc(photos.createdAt)),
    getAlbumOwnerSettings(link.albumId),
  ]);

  return {
    shared: {
      token,
      title: album.title,
      allowDownload: link.allowDownload,
      photos: rows.map((photo) => ({
        ...photo,
        favorite: false,
        addedBy: null,
        latitude: settings.stripGps ? null : photo.latitude,
        longitude: settings.stripGps ? null : photo.longitude,
      })),
    },
  };
});

export const head = defineHead<Props>((_c, props) => ({
  title: props.shared?.title ?? "共有リンク",
  meta: [{ name: "robots", content: "noindex" }],
}));
