CREATE TABLE `recruitment_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`recruitment_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`joined_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`recruitment_id`) REFERENCES `recruitments`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recruitments` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`anonymous` text DEFAULT 'false' NOT NULL,
	`capacity` text DEFAULT '10' NOT NULL,
	`start_time` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`discord_id`) ON UPDATE cascade ON DELETE cascade
);
