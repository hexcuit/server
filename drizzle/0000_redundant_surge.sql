CREATE TABLE `lol_ranks` (
	`id` text PRIMARY KEY NOT NULL,
	`puuid` text,
	`queue_type` text NOT NULL,
	`tier` text NOT NULL,
	`rank` text NOT NULL,
	`leaguePoints` integer NOT NULL,
	`wins` integer NOT NULL,
	`losses` integer NOT NULL,
	`last_updated` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`puuid`) REFERENCES `riot_accounts`(`puuid`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `riot_accounts` (
	`puuid` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`name` text NOT NULL,
	`tagLine` text NOT NULL,
	`region` text NOT NULL,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `riot_accounts_discord_id_unique` ON `riot_accounts` (`discord_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
