import { albumMembers, photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { asc, db, eq } from "void/db";
import { canAddPhotos, canDeletePhoto, findAlbumAccess, isLinkActive } from "@/server/access";
import { listAllowedUsers } from "@/server/allowed-emails";
import { getUserSettings } from "@/server/settings";
import { addAddedBy, findUsersByEmails, findUsersByIds, initialOf } from "@/server/users";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");

  const access = await findAlbumAccess(c.req.param("id")!, user);
  if (!access) return c.notFound();
  const { album, role } = access;
  const isOwner = role === "owner";

  const [rows, [link], memberRows, settings, users] = await Promise.all([
    db
      .select({
        id: photos.id,
        ownerId: photos.ownerId,
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
    db
      .select({ id: albumMembers.id, email: albumMembers.email, role: albumMembers.role })
      .from(albumMembers)
      .where(eq(albumMembers.albumId, album.id))
      .orderBy(asc(albumMembers.createdAt)),
    getUserSettings(user.id),
    isOwner ? listAllowedUsers() : [],
  ]);

  const [owner] = await findUsersByIds([album.ownerId]);
  const joined = await findUsersByEmails(memberRows.map((member) => member.email));
  const names = new Map(joined.map((member) => [member.email, member.name]));
  const members = memberRows.map((member) => ({
    ...member,
    name: names.get(member.email) ?? "",
  }));
  const memberEmails = new Set(memberRows.map((member) => member.email));
  const candidates = users.filter((other) => other.id !== user.id && !memberEmails.has(other.email));

  return {
    user: { name: user.name, email: user.email },
    album: { id: album.id, title: album.title },
    role,
    canAdd: canAddPhotos(role),
    startSharing: isOwner && c.req.query("share") !== undefined,
    photos: (await addAddedBy(rows.map((row) => ({ ...row, deletable: canDeletePhoto(role, row, user.id) })), user.id)).map(
      // お気に入りはオーナーのものなので、招待された人には見せない
      (photo) => (isOwner ? photo : { ...photo, favorite: false }),
    ),
    // メールアドレスはオーナーにだけ渡す
    members: isOwner ? members : [],
    candidates,
    avatars: [owner, ...members].map((member) => initialOf(member)),
    shareLink: isOwner && link ? { ...link, active: isLinkActive(link) } : null,
    settings,
  };
});

export const head = defineHead<Props>((_c, props) => ({ title: props.album.title }));
