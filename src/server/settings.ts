import { albums, userSettings } from "@schema";
import { db, eq } from "void/db";

const DEFAULTS = {
  keepOriginal: true,
  stripGps: true,
  wifiOnly: false,
  defaultExpiry: "7d",
} as const;

export async function getUserSettings(userId: string) {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  const { keepOriginal, stripGps, wifiOnly, defaultExpiry } = row ?? DEFAULTS;
  return { keepOriginal, stripGps, wifiOnly, defaultExpiry };
}

export async function getAlbumOwnerSettings(albumId: string) {
  const [album] = await db
    .select({ ownerId: albums.ownerId })
    .from(albums)
    .where(eq(albums.id, albumId));
  return getUserSettings(album.ownerId);
}
