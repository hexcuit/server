CREATE TABLE `guild_match_players` (
	`match_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`team` text NOT NULL,
	`role` text NOT NULL,
	`rating_before` integer NOT NULL,
	PRIMARY KEY(`match_id`, `discord_id`),
	FOREIGN KEY (`match_id`) REFERENCES `guild_matches`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guild_match_players_discord_idx` ON `guild_match_players` (`discord_id`);--> statement-breakpoint
CREATE TABLE `guild_match_votes` (
	`match_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`vote` text NOT NULL,
	PRIMARY KEY(`match_id`, `discord_id`),
	FOREIGN KEY (`match_id`) REFERENCES `guild_matches`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`status` text NOT NULL,
	`winning_team` text,
	`blue_votes` integer DEFAULT 0 NOT NULL,
	`red_votes` integer DEFAULT 0 NOT NULL,
	`draw_votes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`confirmed_at` text,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guild_matches_guild_created_idx` ON `guild_matches` (`guild_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `guild_matches_message_id_unique` ON `guild_matches` (`message_id`);--> statement-breakpoint
CREATE TABLE `guild_queue_players` (
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
CREATE TABLE `guild_queues` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`creator_id` text,
	`type` text NOT NULL,
	`anonymous` integer NOT NULL,
	`capacity` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `guild_queues_guild_status_idx` ON `guild_queues` (`guild_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `guild_queues_message_id_unique` ON `guild_queues` (`message_id`);--> statement-breakpoint
CREATE TABLE `guild_settings` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`initial_rating` integer DEFAULT 1200 NOT NULL,
	`k_factor` integer DEFAULT 32 NOT NULL,
	`placement_games_required` integer DEFAULT 5 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild_user_match_history` (
	`guild_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`match_id` text NOT NULL,
	`result` text NOT NULL,
	`rating_change` integer NOT NULL,
	`rating_after` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`guild_id`, `discord_id`, `match_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `guild_matches`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guild_user_match_history_idx` ON `guild_user_match_history` (`guild_id`,`discord_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `guild_user_stats` (
	`guild_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`rating` integer NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`placement_games` integer DEFAULT 0 NOT NULL,
	`peak_rating` integer NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`last_played_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`guild_id`, `discord_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guild_user_stats_rating_idx` ON `guild_user_stats` (`guild_id`,`rating`);--> statement-breakpoint
CREATE TABLE `guilds` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`plan_expires_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ranks` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`division` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
