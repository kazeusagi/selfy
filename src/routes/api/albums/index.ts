import { albumMembers, albums, photoMarks, photos } from "@schema";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, db, eq, sql } from "void/db";
import { z } from "zod";
import { accessibleAlbums, isShown, myMarks } from "@/server/access";

const body = z.object({ title: z.string().trim().min(1).max(100) });

export const POST = defineHandler.withValidator({ body })(async (c, { body }) => {
  const user = requireAuth(c);
  const [album] = await db
    .insert(albums)
    .values({ id: crypto.randomUUID(), ownerId: user.id, title: body.title })
    .returning();
  return album;
});

// アプリ用の一覧。ページの loader は HTML 向けなので、同じ内容を JSON で返す口を別に持つ
export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const visible = accessibleAlbums(user);
  // 共有アルバムの更新を通知できるよう、ほかの人が追加した写真だけを別に数える
  const byOthers = sql`${isShown} and ${photos.ownerId} <> ${user.id}`;

  const rows = await db
    .select({
      id: albums.id,
      ownerId: albums.ownerId,
      title: albums.title,
      createdAt: albums.createdAt,
      memberRole: albumMembers.role,
      count: sql<number>`count(case when ${isShown} then ${photos.id} end)`,
      lastTakenAt: sql<string | null>`max(case when ${isShown} then ${photos.takenAt} end)`,
      othersCount: sql<number>`count(case when ${byOthers} then ${photos.id} end)`,
      othersLatestAt: sql<string | null>`max(case when ${byOthers} then ${photos.createdAt} end)`,
    })
    .from(albums)
    .leftJoin(
      albumMembers,
      and(eq(albumMembers.albumId, albums.id), eq(albumMembers.email, user.email.toLowerCase())),
    )
    .leftJoin(photos, eq(photos.albumId, albums.id))
    .leftJoin(photoMarks, myMarks(user.id))
    .where(visible)
    .groupBy(albums.id);

  // カバーにはお気に入りを優先する
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
  const covers = await db.select().from(ranked).where(eq(ranked.rank, 1));
  const coverIds = new Map(covers.map((cover) => [cover.albumId, cover.id]));

  return {
    albums: rows
      .sort((a, b) => (b.lastTakenAt ?? b.createdAt).localeCompare(a.lastTakenAt ?? a.createdAt))
      .map((album) => ({
        id: album.id,
        title: album.title,
        count: album.count,
        lastTakenAt: album.lastTakenAt,
        owned: album.ownerId === user.id,
        canAdd: album.ownerId === user.id || album.memberRole === "contributor",
        coverId: coverIds.get(album.id) ?? null,
        othersCount: album.othersCount,
        othersLatestAt: album.othersLatestAt,
      })),
  };
});
