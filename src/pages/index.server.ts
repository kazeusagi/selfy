import { albumMembers, albums, photoMarks, photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, db, eq, lte, sql } from "void/db";
import { accessibleAlbums, isHiddenBy, isLinkActive, isShown, listWritableAlbums, myMarks } from "@/server/access";
import { hasHiddenPassword } from "@/server/hidden-password";
import { getUserSettings } from "@/server/settings";
import { accountOf, displayName, findUsersByIds } from "@/server/users";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");
  const q = c.req.query("q")?.trim() ?? "";
  const visible = accessibleAlbums(user);

  const summaries = await db
    .select({
      id: albums.id,
      ownerId: albums.ownerId,
      title: albums.title,
      createdAt: albums.createdAt,
      // 非表示の写真は枚数や日付に数えないが、保存容量には含める
      count: sql<number>`count(case when ${isShown} then ${photos.id} end)`,
      hiddenCount: sql<number>`count(case when ${isHiddenBy(user.id)} then ${photos.id} end)`,
      bytes: sql<number>`coalesce(sum(${photos.storedBytes}), 0)`,
      lastTakenAt: sql<string | null>`max(case when ${isShown} then ${photos.takenAt} end)`,
    })
    .from(albums)
    .leftJoin(photos, eq(photos.albumId, albums.id))
    .leftJoin(photoMarks, myMarks(user.id))
    .where(visible)
    .groupBy(albums.id);
  const owned = summaries.filter((album) => album.ownerId === user.id);

  // カバーにはお気に入りを優先して3枚使う
  const ranked = db
    .select({
      id: photos.id,
      albumId: photos.albumId,
      rank: sql<number>`row_number() over (partition by ${photos.albumId} order by coalesce(${photoMarks.favorite}, 0) desc, ${photos.takenAt})`.as(
        "rank",
      ),
    })
    .from(photos)
    .innerJoin(albums, eq(albums.id, photos.albumId))
    .leftJoin(photoMarks, myMarks(user.id))
    .where(and(visible, isShown))
    .as("ranked");
  const covers = await db.select().from(ranked).where(lte(ranked.rank, 3)).orderBy(sql`${ranked.rank}`);

  const [links, members, otherOwners, albumOptions, settings, hasPassword] = await Promise.all([
    db
      .select({ albumId: shareLinks.albumId, expiresAt: shareLinks.expiresAt })
      .from(shareLinks)
      .innerJoin(albums, eq(albums.id, shareLinks.albumId))
      .where(eq(albums.ownerId, user.id)),
    db
      .select({ albumId: albumMembers.albumId })
      .from(albumMembers)
      .innerJoin(albums, eq(albums.id, albumMembers.albumId))
      .where(eq(albums.ownerId, user.id)),
    findUsersByIds([...new Set(summaries.map((album) => album.ownerId))].filter((id) => id !== user.id)),
    listWritableAlbums(user),
    getUserSettings(user.id),
    hasHiddenPassword(user.id),
  ]);
  const linkedIds = new Set(links.filter(isLinkActive).map((link) => link.albumId));
  const ownerNames = new Map(otherOwners.map((owner) => [owner.id, displayName(owner)]));

  function sharedLabel(album: (typeof summaries)[number]) {
    if (album.ownerId !== user!.id) return "共有されています";
    const memberCount = members.filter((member) => member.albumId === album.id).length;
    // 人数はデザインに合わせて自分も含める
    if (memberCount > 0) return `${memberCount + 1}人と共有`;
    return linkedIds.has(album.id) ? "リンクで共有" : null;
  }

  let matchedIds: Set<string> | null = null;
  if (q) {
    const contains = (column: unknown) => sql`instr(lower(${column}), lower(${q})) > 0`;
    const hits = await db
      .selectDistinct({ albumId: photos.albumId })
      .from(photos)
      .innerJoin(albums, eq(albums.id, photos.albumId))
      .leftJoin(photoMarks, myMarks(user.id))
      .where(and(visible, isShown, sql`(${contains(photos.fileName)} or ${contains(photos.camera)})`));
    matchedIds = new Set(hits.map((hit) => hit.albumId));
    for (const album of summaries) {
      if (album.title.toLowerCase().includes(q.toLowerCase())) matchedIds.add(album.id);
    }
  }

  const list = summaries
    .filter((album) => !matchedIds || matchedIds.has(album.id))
    .sort((a, b) =>
      (b.lastTakenAt ?? b.createdAt).localeCompare(a.lastTakenAt ?? a.createdAt),
    )
    .map((album) => ({
      id: album.id,
      title: album.title,
      count: album.count,
      lastTakenAt: album.lastTakenAt,
      owned: album.ownerId === user.id,
      ownerName: ownerNames.get(album.ownerId) ?? null,
      sharedLabel: sharedLabel(album),
      coverIds: covers.filter((cover) => cover.albumId === album.id).map((cover) => cover.id),
    }));

  return {
    user: accountOf(user),
    q,
    pickingShare: c.req.query("share") !== undefined,
    albums: list,
    // 中身は見せず、あることだけ伝える。パスワードを決めた人には0枚でも入口を残す
    showHiddenAlbum: hasPassword || summaries.some((album) => album.hiddenCount > 0),
    albumOptions,
    ownedAlbums: owned.map((album) => ({ id: album.id, title: album.title })),
    settings,
    stats: {
      albums: owned.length,
      photos: owned.reduce((sum, album) => sum + album.count, 0),
      bytes: owned.reduce((sum, album) => sum + album.bytes, 0),
    },
  };
});

export const head = defineHead(() => ({ title: "アルバム" }));
