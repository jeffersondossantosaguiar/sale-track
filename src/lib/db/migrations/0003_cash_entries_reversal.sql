ALTER TABLE `cash_entries` ADD `status` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `cash_entries` ADD `reversed_at` integer;--> statement-breakpoint
ALTER TABLE `cash_entries` ADD `reversal_of_id` integer REFERENCES `cash_entries`(`id`) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
CREATE INDEX `cash_entries_reversal_idx` ON `cash_entries` (`reversal_of_id`);--> statement-breakpoint
CREATE INDEX `cash_entries_date_idx` ON `cash_entries` (`date`);--> statement-breakpoint
CREATE INDEX `cash_entries_category_idx` ON `cash_entries` (`category`);