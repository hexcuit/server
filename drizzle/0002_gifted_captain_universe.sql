PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lol_rank` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`division` text NOT NULL,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lol_rank`("discord_id", "tier", "division") SELECT "discord_id", "tier", "division" FROM `lol_rank`;--> statement-breakpoint
DROP TABLE `lol_rank`;--> statement-breakpoint
ALTER TABLE `__new_lol_rank` RENAME TO `lol_rank`;--> statement-breakpoint
PRAGMA foreign_keys=ON;