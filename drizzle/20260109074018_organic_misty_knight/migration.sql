PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_matches` (
	`id` text PRIMARY KEY,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL CONSTRAINT `guild_matches_message_id_unique` UNIQUE,
	`status` text NOT NULL,
	`winning_team` text,
	`blue_votes` integer DEFAULT 0 NOT NULL,
	`red_votes` integer DEFAULT 0 NOT NULL,
	`draw_votes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`confirmed_at` text,
	CONSTRAINT `guild_matches_guild_id_guilds_guild_id_fk` FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE CASCADE ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_guild_matches`(`id`, `guild_id`, `channel_id`, `message_id`, `status`, `winning_team`, `blue_votes`, `red_votes`, `draw_votes`, `created_at`, `confirmed_at`) SELECT `id`, `guild_id`, `channel_id`, `message_id`, `status`, `winning_team`, `blue_votes`, `red_votes`, `draw_votes`, `created_at`, `confirmed_at` FROM `guild_matches`;--> statement-breakpoint
DROP TABLE `guild_matches`;--> statement-breakpoint
ALTER TABLE `__new_guild_matches` RENAME TO `guild_matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_queues` (
	`id` text PRIMARY KEY,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL CONSTRAINT `guild_queues_message_id_unique` UNIQUE,
	`creator_id` text,
	`type` text NOT NULL,
	`anonymous` integer NOT NULL,
	`capacity` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT `guild_queues_guild_id_guilds_guild_id_fk` FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT `guild_queues_creator_id_users_discord_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`discord_id`) ON UPDATE CASCADE ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_guild_queues`(`id`, `guild_id`, `channel_id`, `message_id`, `creator_id`, `type`, `anonymous`, `capacity`, `status`, `created_at`, `updated_at`) SELECT `id`, `guild_id`, `channel_id`, `message_id`, `creator_id`, `type`, `anonymous`, `capacity`, `status`, `created_at`, `updated_at` FROM `guild_queues`;--> statement-breakpoint
DROP TABLE `guild_queues`;--> statement-breakpoint
ALTER TABLE `__new_guild_queues` RENAME TO `guild_queues`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `guild_matches_message_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `guild_queues_message_id_unique`;--> statement-breakpoint
CREATE INDEX `guild_matches_guild_created_idx` ON `guild_matches` (`guild_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `guild_queues_guild_status_idx` ON `guild_queues` (`guild_id`,`status`);