import { albums, photos, shareLinks } from "@schema";
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, db, eq, lte, sql } from "void/db";
import { isLinkActive } from "@/server/access";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");
  const q = c.req.query("q")?.trim() ?? "";

  const summaries = await db
    .select({
      id: albums.id,
      title: albums.title,
      createdAt: albums.createdAt,
      count: sql<number>`count(${photos.id})`,
      bytes: sql<number>`coalesce(sum(${photos.storedBytes}), 0)`,
      lastTakenAt: sql<string | null>`max(${photos.takenAt})`,
    })
    .from(albums)
    .leftJoin(photos, eq(photos.albumId, albums.id))
    .where(eq(albums.ownerId, user.id))
    .groupBy(albums.id);

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
    .where(eq(photos.ownerId, user.id))
    .as("ranked");
  const covers = await db.select().from(ranked).where(lte(ranked.rank, 3)).orderBy(sql`${ranked.rank}`);

  const links = await db
    .select({ albumId: shareLinks.albumId, expiresAt: shareLinks.expiresAt })
    .from(shareLinks)
    .innerJoin(albums, eq(albums.id, shareLinks.albumId))
    .where(eq(albums.ownerId, user.id));
  const sharedIds = new Set(links.filter(isLinkActive).map((link) => link.albumId));

  let matchedIds: Set<string> | null = null;
  if (q) {
    const contains = (column: unknown) => sql`instr(lower(${column}), lower(${q})) > 0`;
    const hits = await db
      .selectDistinct({ albumId: photos.albumId })
      .from(photos)
      .where(
        and(
          eq(photos.ownerId, user.id),
          sql`(${contains(photos.fileName)} or ${contains(photos.camera)})`,
        ),
      );
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
      shared: sharedIds.has(album.id),
      coverIds: covers.filter((cover) => cover.albumId === album.id).map((cover) => cover.id),
    }));

  return {
    user: { name: user.name, email: user.email },
    q,
    pickingShare: c.req.query("share") !== undefined,
    albums: list,
    albumOptions: summaries.map((album) => ({ id: album.id, title: album.title })),
    stats: {
      albums: summaries.length,
      photos: summaries.reduce((sum, album) => sum + album.count, 0),
      bytes: summaries.reduce((sum, album) => sum + album.bytes, 0),
    },
  };
});

export const head = defineHead(() => ({ title: "アルバム" }));
