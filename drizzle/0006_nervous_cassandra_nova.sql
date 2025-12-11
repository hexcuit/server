ALTER TABLE `recruitment_participants` ADD `main_role` text;--> statement-breakpoint
ALTER TABLE `recruitment_participants` ADD `sub_role` text;--> statement-breakpoint
ALTER TABLE `recruitments` ADD `type` text DEFAULT 'normal' NOT NULL;