import { albumMembers, albums, photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getSession } from "void/auth";
import { db, eq, sql } from "void/db";
import { isLinkActive, listWritableAlbums } from "@/server/access";
import { isAdmin, listAllowedEmails } from "@/server/allowed-emails";
import { hasHiddenPassword } from "@/server/hidden-password";
import { getUserSettings } from "@/server/settings";
import { accountOf } from "@/server/users";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const auth = getSession();
  if (!auth) return c.redirect("/login");
  const { user, session } = auth;

  const [storage, owned, links, invited, [passkeys], [sessions], albumOptions, settings, allowedEmails, hasPassword] =
    await Promise.all([
      db
        .select({
          originals: sql<number>`coalesce(sum(${photos.originalBytes}), 0)`,
          total: sql<number>`coalesce(sum(${photos.storedBytes}), 0)`,
        })
        .from(photos)
        .innerJoin(albums, eq(albums.id, photos.albumId))
        .where(eq(albums.ownerId, user.id)),
      db
        .select({ id: albums.id, title: albums.title })
        .from(albums)
        .where(eq(albums.ownerId, user.id)),
      db
        .select({ albumId: shareLinks.albumId, expiresAt: shareLinks.expiresAt })
        .from(shareLinks)
        .innerJoin(albums, eq(albums.id, shareLinks.albumId))
        .where(eq(albums.ownerId, user.id)),
      db
        .selectDistinct({ albumId: albumMembers.albumId })
        .from(albumMembers)
        .innerJoin(albums, eq(albums.id, albumMembers.albumId))
        .where(eq(albums.ownerId, user.id)),
      // passkey と session は Better Auth のテーブルで @schema には含まれない
      db.all<{ count: number }>(sql`select count(*) as count from passkey where userId = ${user.id}`),
      db.all<{ count: number }>(
        sql`select count(*) as count from session where userId = ${user.id} and expiresAt > ${Date.now()}`,
      ),
      listWritableAlbums(user),
      getUserSettings(user.id),
      isAdmin(user) ? listAllowedEmails() : null,
      hasHiddenPassword(user.id),
    ]);

  const sharedIds = new Set([
    ...links.filter(isLinkActive).map((link) => link.albumId),
    ...invited.map((member) => member.albumId),
  ]);

  return {
    user: accountOf(user),
    sessionId: session.id,
    settings,
    storage: {
      originals: storage[0].originals,
      previews: storage[0].total - storage[0].originals,
    },
    passkeyCount: passkeys.count,
    sessionCount: sessions.count,
    sharedAlbums: owned.filter((album) => sharedIds.has(album.id)),
    albumOptions,
    // 管理者以外には null を返し、管理用の項目を出さない
    allowedEmails,
    hasHiddenPassword: hasPassword,
  };
});

export const head = defineHead(() => ({ title: "設定" }));
