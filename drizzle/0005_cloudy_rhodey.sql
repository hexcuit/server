CREATE TABLE `guild_match_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`team` text NOT NULL,
	`role` text NOT NULL,
	`rating_before` integer NOT NULL,
	`rating_after` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `guild_matches`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`recruitment_id` text,
	`winning_team` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`recruitment_id`) REFERENCES `recruitments`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `guild_ratings` (
	`guild_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`rating` integer DEFAULT 1500 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`placement_games` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	PRIMARY KEY(`guild_id`, `discord_id`),
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
