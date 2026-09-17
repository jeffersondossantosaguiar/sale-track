CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`price_per_kg_cents` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `materials_active_idx` ON `materials` (`active`);--> statement-breakpoint
CREATE TABLE `variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`print_time_min` integer DEFAULT 0 NOT NULL,
	`manual_time_min` integer DEFAULT 0 NOT NULL,
	`filament_material_id` integer,
	`filament_grams` integer DEFAULT 0 NOT NULL,
	`packaging_cents` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`filament_material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX `variants_sku_idx` ON `variants` (`sku`);--> statement-breakpoint
CREATE INDEX `variants_product_idx` ON `variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `variants_material_idx` ON `variants` (`filament_material_id`);--> statement-breakpoint
CREATE TABLE `variant_accessories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`name` text NOT NULL,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `variant_accessories_variant_idx` ON `variant_accessories` (`variant_id`);--> statement-breakpoint
CREATE TABLE `variant_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`channel` text NOT NULL,
	`margin_bps` integer DEFAULT 0 NOT NULL,
	`suggested_price_cents` integer DEFAULT 0 NOT NULL,
	`practiced_price_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_prices_variant_channel_idx` ON `variant_prices` (`variant_id`,`channel`);--> statement-breakpoint
CREATE INDEX `variant_prices_variant_idx` ON `variant_prices` (`variant_id`);--> statement-breakpoint
CREATE TABLE `printers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`acquisition_cents` integer DEFAULT 0 NOT NULL,
	`useful_life_years` integer DEFAULT 3 NOT NULL,
	`power_watts` integer DEFAULT 0 NOT NULL,
	`maintenance_cents_per_hour` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `printers_active_idx` ON `printers` (`active`);--> statement-breakpoint
DROP TABLE `product_codes`;--> statement-breakpoint
CREATE TABLE `product_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`code` text NOT NULL,
	`channel` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `product_codes_code_channel_idx` ON `product_codes` (`code`,`channel`);--> statement-breakpoint
CREATE INDEX `product_codes_variant_idx` ON `product_codes` (`variant_id`);--> statement-breakpoint
DROP TABLE `sale_items`;--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`variant_id` integer,
	`c_prod` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`frozen_cost_cents` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_variant_idx` ON `sale_items` (`variant_id`);--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `sale_price_cents`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `estimated_cost_cents`;--> statement-breakpoint
INSERT INTO `variants` (`product_id`, `sku`, `name`, `print_time_min`, `manual_time_min`, `filament_material_id`, `filament_grams`, `packaging_cents`, `cost_cents`, `active`, `created_at`, `updated_at`)
SELECT `id`, 'SKU-' || `id`, `name`, 0, 0, NULL, 0, 0, 0, 1, strftime('%s','now')*1000, strftime('%s','now')*1000 FROM `products`;