PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_queue_players` (
	`queue_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`main_role` text NOT NULL,
	`sub_role` text NOT NULL,
	`joined_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`queue_id`, `discord_id`),
	FOREIGN KEY (`queue_id`) REFERENCES `guild_queues`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_guild_queue_players`("queue_id", "discord_id", "main_role", "sub_role", "joined_at") SELECT "queue_id", "discord_id", "main_role", "sub_role", "joined_at" FROM `guild_queue_players`;--> statement-breakpoint
DROP TABLE `guild_queue_players`;--> statement-breakpoint
ALTER TABLE `__new_guild_queue_players` RENAME TO `guild_queue_players`;--> statement-breakpoint
PRAGMA foreign_keys=ON;