import { albumMembers, albums, photoMarks, photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, asc, db, eq, ne } from "void/db";
import { canAddPhotos, canDeletePhoto, findAlbumAccess, isFavorite, isLinkActive, isShown, myMarks } from "@/server/access";
import { listAllowedUsers } from "@/server/allowed-emails";
import { getUserSettings } from "@/server/settings";
import { accountOf, addAddedBy, avatarOf, findUsersByEmails, findUsersByIds, initialOf } from "@/server/users";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");

  const access = await findAlbumAccess(c.req.param("id")!, user);
  if (!access) return c.notFound();
  const { album, role } = access;
  const isOwner = role === "owner";

  const [rows, [link], memberRows, settings, users, moveTargets] = await Promise.all([
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
        favorite: isFavorite,
      })
      .from(photos)
      .leftJoin(photoMarks, myMarks(user.id))
      // 非表示の写真はパスワードを入れた「非表示」アルバムでだけ見せる
      .where(and(eq(photos.albumId, album.id), isShown))
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
    // 移動先は自分のアルバムだけ
    isOwner
      ? db
          .select({ id: albums.id, title: albums.title })
          .from(albums)
          .where(and(eq(albums.ownerId, user.id), ne(albums.id, album.id)))
          .orderBy(asc(albums.title))
      : [],
  ]);

  const [owner] = await findUsersByIds([album.ownerId]);
  const joined = await findUsersByEmails(memberRows.map((member) => member.email));
  const accounts = new Map(joined.map((member) => [member.email, member]));
  const members = memberRows.map((member) => {
    const account = accounts.get(member.email);
    return { ...member, name: account?.name ?? "", image: account ? avatarOf(account) : null };
  });
  const memberEmails = new Set(memberRows.map((member) => member.email));
  const candidates = users.filter((other) => other.id !== user.id && !memberEmails.has(other.email));

  return {
    user: accountOf(user),
    album: { id: album.id, title: album.title },
    role,
    canAdd: canAddPhotos(role),
    startSharing: isOwner && c.req.query("share") !== undefined,
    photos: await addAddedBy(rows.map((row) => ({ ...row, deletable: canDeletePhoto(role, row, user.id) })), user.id),
    // メールアドレスはオーナーにだけ渡す
    members: isOwner ? members : [],
    candidates,
    moveTargets,
    avatars: [{ ...owner, image: avatarOf(owner) }, ...members].map((member) => ({
      initial: initialOf(member),
      image: member.image,
    })),
    shareLink: isOwner && link ? { ...link, active: isLinkActive(link) } : null,
    settings,
  };
});

export const head = defineHead<Props>((_c, props) => ({ title: props.album.title }));
