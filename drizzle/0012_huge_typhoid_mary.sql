PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lol_ranks` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`division` text,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lol_ranks`("discord_id", "tier", "division") SELECT "discord_id", "tier", "division" FROM `lol_ranks`;--> statement-breakpoint
DROP TABLE `lol_ranks`;--> statement-breakpoint
ALTER TABLE `__new_lol_ranks` RENAME TO `lol_ranks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;