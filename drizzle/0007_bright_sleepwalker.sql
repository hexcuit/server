CREATE TABLE `guild_match_votes` (
	`pending_match_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`vote` text NOT NULL,
	PRIMARY KEY(`pending_match_id`, `discord_id`),
	FOREIGN KEY (`pending_match_id`) REFERENCES `guild_pending_matches`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild_pending_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`status` text DEFAULT 'voting' NOT NULL,
	`team_assignments` text NOT NULL,
	`blue_votes` integer DEFAULT 0 NOT NULL,
	`red_votes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
