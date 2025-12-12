PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_recruitments` (
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
INSERT INTO `__new_recruitments`("id", "guild_id", "channel_id", "message_id", "creator_id", "type", "anonymous", "capacity", "start_time", "status", "created_at", "updated_at")
SELECT
	"id",
	"guild_id",
	"channel_id",
	"message_id",
	"creator_id",
	"type",
	CASE
		WHEN "anonymous" IN ('true', 'TRUE', '1', 1) THEN 1
		ELSE 0
	END,
	CASE
		WHEN CAST("capacity" AS INTEGER) > 0 THEN CAST("capacity" AS INTEGER)
		ELSE 10
	END,
	"start_time",
	"status",
	"created_at",
	"updated_at"
FROM `recruitments`;--> statement-breakpoint
DROP TABLE `recruitments`;--> statement-breakpoint
ALTER TABLE `__new_recruitments` RENAME TO `recruitments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;