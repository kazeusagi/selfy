import { photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { asc, db, eq } from "void/db";
import { findOwnedAlbum, isLinkActive } from "@/server/access";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");

  const album = await findOwnedAlbum(c.req.param("id")!, user.id);
  if (!album) return c.notFound();

  const [rows, [link]] = await Promise.all([
    db
      .select({
        id: photos.id,
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
      .where(eq(photos.albumId, album.id))
      .orderBy(asc(photos.takenAt), asc(photos.createdAt)),
    db
      .select({
        token: shareLinks.token,
        expiry: shareLinks.expiry,
        expiresAt: shareLinks.expiresAt,
        allowDownload: shareLinks.allowDownload,
      })
      .from(shareLinks)
      .where(eq(shareLinks.albumId, album.id)),
  ]);

  return {
    user: { name: user.name, email: user.email },
    album: { id: album.id, title: album.title },
    photos: rows,
    shareLink: link ? { ...link, active: isLinkActive(link) } : null,
  };
});

export const head = defineHead<Props>((_c, props) => ({ title: props.album.title }));
