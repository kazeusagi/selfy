CREATE TABLE `album_members` (
	`id` text PRIMARY KEY NOT NULL,
	`album_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `album_members_album_email_idx` ON `album_members` (`album_id`,`email`);--> statement-breakpoint
CREATE INDEX `album_members_email_idx` ON `album_members` (`email`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`keep_original` integer DEFAULT true NOT NULL,
	`strip_gps` integer DEFAULT true NOT NULL,
	`wifi_only` integer DEFAULT false NOT NULL,
	`default_expiry` text DEFAULT '7d' NOT NULL
);
