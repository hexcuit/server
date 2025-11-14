CREATE TABLE `lol_rank` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`tier` text NOT NULL,
	`division` text NOT NULL,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lol_rank_discord_id_unique` ON `lol_rank` (`discord_id`);