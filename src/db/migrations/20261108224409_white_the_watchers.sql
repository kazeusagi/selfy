-- void:allow-destructive
CREATE TABLE `photo_marks` (
	`user_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`user_id`, `photo_id`),
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photo_marks_photo_idx` ON `photo_marks` (`photo_id`);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `hidden_password` text;--> statement-breakpoint
-- これまでのお気に入りはアルバムのオーナーのものだったので、オーナーの印として移す
INSERT INTO `photo_marks` (`user_id`, `photo_id`, `favorite`) SELECT `albums`.`owner_id`, `photos`.`id`, 1 FROM `photos` INNER JOIN `albums` ON `albums`.`id` = `photos`.`album_id` WHERE `photos`.`favorite` = 1;--> statement-breakpoint
ALTER TABLE `photos` DROP COLUMN `favorite`;