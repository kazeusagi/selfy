import { albumMembers, albums, photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, db, eq, lte, sql } from "void/db";
import { accessibleAlbums, isLinkActive, listWritableAlbums } from "@/server/access";
import { getUserSettings } from "@/server/settings";
import { displayName, findUsersByIds } from "@/server/users";

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
      count: sql<number>`count(${photos.id})`,
      bytes: sql<number>`coalesce(sum(${photos.storedBytes}), 0)`,
      lastTakenAt: sql<string | null>`max(${photos.takenAt})`,
    })
    .from(albums)
    .leftJoin(photos, eq(photos.albumId, albums.id))
    .where(visible)
    .groupBy(albums.id);
  const owned = summaries.filter((album) => album.ownerId === user.id);

  // カバーにはお気に入りを優先して3枚使う
  const ranked = db
    .select({
      id: photos.id,
      albumId: photos.albumId,
      rank: sql<number>`row_number() over (partition by ${photos.albumId} order by ${photos.favorite} desc, ${photos.takenAt})`.as(
        "rank",
      ),
    })
    .from(photos)
    .innerJoin(albums, eq(albums.id, photos.albumId))
    .where(visible)
    .as("ranked");
  const covers = await db.select().from(ranked).where(lte(ranked.rank, 3)).orderBy(sql`${ranked.rank}`);

  const [links, members, otherOwners, albumOptions, settings] = await Promise.all([
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
      .where(and(visible, sql`(${contains(photos.fileName)} or ${contains(photos.camera)})`));
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
    user: { name: user.name, email: user.email },
    q,
    pickingShare: c.req.query("share") !== undefined,
    albums: list,
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
