import { sql } from "void/db";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "void/schema-d1";

export const albums = sqliteTable(
  "albums",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("albums_owner_idx").on(t.ownerId)],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    fileName: text("file_name").notNull(),
    originalKey: text("original_key").notNull(),
    displayKey: text("display_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    originalBytes: integer("original_bytes").notNull(),
    // 元画像、表示用、サムネイルの合計。使用容量の表示に使う
    storedBytes: integer("stored_bytes").notNull(),
    // 撮影地の現地時刻。EXIFにタイムゾーンがないので "YYYY-MM-DDTHH:mm:ss" のまま持つ
    takenAt: text("taken_at").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    camera: text("camera"),
    exposure: text("exposure"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    index("photos_album_idx").on(t.albumId, t.takenAt),
    index("photos_owner_idx").on(t.ownerId),
  ],
);

export const shareLinks = sqliteTable("share_links", {
  albumId: text("album_id")
    .primaryKey()
    .references(() => albums.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiry: text("expiry", { enum: ["7d", "30d", "never"] }).notNull(),
  expiresAt: integer("expires_at"),
  allowDownload: integer("allow_download", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// 招待は未登録の人にも送れるので、ユーザーIDではなくメールアドレスで持つ
export const albumMembers = sqliteTable(
  "album_members",
  {
    id: text("id").primaryKey(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["viewer", "contributor"] }).notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("album_members_album_email_idx").on(t.albumId, t.email),
    index("album_members_email_idx").on(t.email),
  ],
);

// 登録とログインを許可するメールアドレス。比較できるよう小文字で持つ
export const allowedEmails = sqliteTable("allowed_emails", {
  email: text("email").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  keepOriginal: integer("keep_original", { mode: "boolean" }).notNull().default(true),
  stripGps: integer("strip_gps", { mode: "boolean" }).notNull().default(true),
  wifiOnly: integer("wifi_only", { mode: "boolean" }).notNull().default(false),
  defaultExpiry: text("default_expiry", { enum: ["7d", "30d", "never"] }).notNull().default("7d"),
});
