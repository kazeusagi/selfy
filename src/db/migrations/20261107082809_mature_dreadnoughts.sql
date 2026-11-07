CREATE TABLE `allowed_emails` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
-- 導入前から使っている人と招待中の人を締め出さないよう、そのまま許可する
INSERT OR IGNORE INTO `allowed_emails` (`email`)
SELECT lower(`email`) FROM `user`
UNION
SELECT `email` FROM `album_members`;
