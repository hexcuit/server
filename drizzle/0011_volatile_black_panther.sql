PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `lol_rank` RENAME TO `lol_ranks`;--> statement-breakpoint
ALTER TABLE `recruitment_participants` RENAME TO `queue_players`;--> statement-breakpoint
ALTER TABLE `recruitments` RENAME TO `queues`;--> statement-breakpoint
ALTER TABLE `queue_players` RENAME COLUMN "recruitment_id" TO "queue_id";--> statement-breakpoint
CREATE TABLE `__new_lol_ranks` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`division` text NOT NULL,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lol_ranks`("discord_id", "tier", "division") SELECT "discord_id", "tier", "division" FROM `lol_ranks`;--> statement-breakpoint
DROP TABLE `lol_ranks`;--> statement-breakpoint
ALTER TABLE `__new_lol_ranks` RENAME TO `lol_ranks`;--> statement-breakpoint
CREATE TABLE `__new_queue_players` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`main_role` text,
	`sub_role` text,
	`joined_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_queue_players`("id", "queue_id", "discord_id", "main_role", "sub_role", "joined_at") SELECT "id", "queue_id", "discord_id", "main_role", "sub_role", "joined_at" FROM `queue_players`;--> statement-breakpoint
DROP TABLE `queue_players`;--> statement-breakpoint
ALTER TABLE `__new_queue_players` RENAME TO `queue_players`;--> statement-breakpoint
CREATE TABLE `__new_queues` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`type` text DEFAULT 'normal' NOT NULL,
	`anonymous` integer DEFAULT false NOT NULL,
	`capacity` integer DEFAULT 10 NOT NULL,
	`start_time` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_queues`("id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "start_time", "status", "created_at", "updated_at") SELECT "id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "start_time", "status", "created_at", "updated_at" FROM `queues`;--> statement-breakpoint
DROP TABLE `queues`;--> statement-breakpoint
ALTER TABLE `__new_queues` RENAME TO `queues`;--> statement-breakpoint
CREATE TABLE `__new_guild_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`queue_id` text,
	`winning_team` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_guild_matches`("id", "guild_id", "queue_id", "winning_team", "created_at") SELECT "id", "guild_id", "queue_id", "winning_team", "created_at" FROM `guild_matches`;--> statement-breakpoint
DROP TABLE `guild_matches`;--> statement-breakpoint
ALTER TABLE `__new_guild_matches` RENAME TO `guild_matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;