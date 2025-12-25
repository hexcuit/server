ALTER TABLE `guild_match_participants` RENAME TO `guild_match_players`;--> statement-breakpoint
ALTER TABLE `queue_players` RENAME TO `guild_queue_players`;--> statement-breakpoint
ALTER TABLE `queues` RENAME TO `guild_queues`;--> statement-breakpoint
ALTER TABLE `guild_ratings` RENAME TO `guild_user_stats`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_match_players` (
	`match_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`team` text NOT NULL,
	`role` text NOT NULL,
	`rating_before` integer NOT NULL,
	`rating_after` integer NOT NULL,
	PRIMARY KEY(`match_id`, `discord_id`),
	FOREIGN KEY (`match_id`) REFERENCES `guild_matches`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_match_players`("match_id", "discord_id", "team", "role", "rating_before", "rating_after") SELECT "match_id", "discord_id", "team", "role", "rating_before", "rating_after" FROM `guild_match_players`;--> statement-breakpoint
DROP TABLE `guild_match_players`;--> statement-breakpoint
ALTER TABLE `__new_guild_match_players` RENAME TO `guild_match_players`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_guild_queue_players` (
	`queue_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`main_role` text,
	`sub_role` text,
	`joined_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`queue_id`, `discord_id`),
	FOREIGN KEY (`queue_id`) REFERENCES `guild_queues`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_queue_players`("queue_id", "discord_id", "main_role", "sub_role", "joined_at") SELECT "queue_id", "discord_id", "main_role", "sub_role", "joined_at" FROM `guild_queue_players`;--> statement-breakpoint
DROP TABLE `guild_queue_players`;--> statement-breakpoint
ALTER TABLE `__new_guild_queue_players` RENAME TO `guild_queue_players`;--> statement-breakpoint
CREATE TABLE `__new_guild_queues` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`type` text NOT NULL,
	`anonymous` integer NOT NULL,
	`capacity` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_queues`("id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "status", "created_at", "updated_at") SELECT "id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "status", "created_at", "updated_at" FROM `guild_queues`;--> statement-breakpoint
DROP TABLE `guild_queues`;--> statement-breakpoint
ALTER TABLE `__new_guild_queues` RENAME TO `guild_queues`;--> statement-breakpoint
CREATE INDEX `guild_queues_guild_status_idx` ON `guild_queues` (`guild_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_guild_user_stats` (
	`guild_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`rating` integer NOT NULL,
	`wins` integer NOT NULL,
	`losses` integer NOT NULL,
	`placement_games` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`guild_id`, `discord_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_user_stats`("guild_id", "discord_id", "rating", "wins", "losses", "placement_games", "created_at", "updated_at") SELECT "guild_id", "discord_id", "rating", "wins", "losses", "placement_games", "created_at", "updated_at" FROM `guild_user_stats`;--> statement-breakpoint
DROP TABLE `guild_user_stats`;--> statement-breakpoint
ALTER TABLE `__new_guild_user_stats` RENAME TO `guild_user_stats`;--> statement-breakpoint
CREATE INDEX `guild_user_stats_rating_idx` ON `guild_user_stats` (`guild_id`,`rating`);--> statement-breakpoint
CREATE TABLE `__new_guild_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`queue_id` text,
	`winning_team` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`queue_id`) REFERENCES `guild_queues`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_guild_matches`("id", "guild_id", "queue_id", "winning_team", "created_at") SELECT "id", "guild_id", "queue_id", "winning_team", "created_at" FROM `guild_matches`;--> statement-breakpoint
DROP TABLE `guild_matches`;--> statement-breakpoint
ALTER TABLE `__new_guild_matches` RENAME TO `guild_matches`;--> statement-breakpoint
CREATE INDEX `guild_matches_guild_created_idx` ON `guild_matches` (`guild_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_guild_pending_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`status` text NOT NULL,
	`team_assignments` text NOT NULL,
	`blue_votes` integer NOT NULL,
	`red_votes` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_pending_matches`("id", "guild_id", "channel_id", "message_id", "status", "team_assignments", "blue_votes", "red_votes", "created_at", "updated_at") SELECT "id", "guild_id", "channel_id", "message_id", "status", "team_assignments", "blue_votes", "red_votes", "created_at", "updated_at" FROM `guild_pending_matches`;--> statement-breakpoint
DROP TABLE `guild_pending_matches`;--> statement-breakpoint
ALTER TABLE `__new_guild_pending_matches` RENAME TO `guild_pending_matches`;--> statement-breakpoint
CREATE TABLE `__new_guilds` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_guilds`("guild_id", "created_at", "updated_at") SELECT "guild_id", "created_at", "updated_at" FROM `guilds`;--> statement-breakpoint
DROP TABLE `guilds`;--> statement-breakpoint
ALTER TABLE `__new_guilds` RENAME TO `guilds`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("discord_id", "created_at", "updated_at") SELECT "discord_id", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
ALTER TABLE `lol_ranks` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `lol_ranks` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;