ALTER TABLE `photos` ADD `content_hash` text;--> statement-breakpoint
CREATE INDEX `photos_album_hash_idx` ON `photos` (`album_id`,`content_hash`);