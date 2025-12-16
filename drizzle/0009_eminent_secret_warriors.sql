PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_ratings` (
	`guild_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`rating` integer NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`placement_games` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	PRIMARY KEY(`guild_id`, `discord_id`),
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_ratings`("guild_id", "discord_id", "rating", "wins", "losses", "placement_games", "created_at", "updated_at") SELECT "guild_id", "discord_id", "rating", "wins", "losses", "placement_games", "created_at", "updated_at" FROM `guild_ratings`;--> statement-breakpoint
DROP TABLE `guild_ratings`;--> statement-breakpoint
ALTER TABLE `__new_guild_ratings` RENAME TO `guild_ratings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;