PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_pending_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`status` text NOT NULL,
	`team_assignments` text NOT NULL,
	`blue_votes` integer NOT NULL,
	`red_votes` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_guild_pending_matches`("id", "guild_id", "channel_id", "message_id", "status", "team_assignments", "blue_votes", "red_votes", "created_at") SELECT "id", "guild_id", "channel_id", "message_id", "status", "team_assignments", "blue_votes", "red_votes", "created_at" FROM `guild_pending_matches`;--> statement-breakpoint
DROP TABLE `guild_pending_matches`;--> statement-breakpoint
ALTER TABLE `__new_guild_pending_matches` RENAME TO `guild_pending_matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_guild_ratings` (
	`guild_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`rating` integer NOT NULL,
	`wins` integer NOT NULL,
	`losses` integer NOT NULL,
	`placement_games` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	PRIMARY KEY(`guild_id`, `discord_id`),
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_ratings`("guild_id", "discord_id", "rating", "wins", "losses", "placement_games", "created_at", "updated_at") SELECT "guild_id", "discord_id", "rating", "wins", "losses", "placement_games", "created_at", "updated_at" FROM `guild_ratings`;--> statement-breakpoint
DROP TABLE `guild_ratings`;--> statement-breakpoint
ALTER TABLE `__new_guild_ratings` RENAME TO `guild_ratings`;--> statement-breakpoint
CREATE TABLE `__new_queues` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`type` text NOT NULL,
	`anonymous` integer NOT NULL,
	`capacity` integer NOT NULL,
	`start_time` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_queues`("id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "start_time", "status", "created_at", "updated_at") SELECT "id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "start_time", "status", "created_at", "updated_at" FROM `queues`;--> statement-breakpoint
DROP TABLE `queues`;--> statement-breakpoint
ALTER TABLE `__new_queues` RENAME TO `queues`;