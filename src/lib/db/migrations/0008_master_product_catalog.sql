-- 008-master-product-catalog: produto mestre, atributos herdáveis, mídia local
-- e códigos por canal com chave normalizada.
ALTER TABLE `products` ADD `product_type` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `theme` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `primary_color` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `size_label` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `finish` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `internal_notes` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_key` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_mime` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_original_name` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_bytes` integer;
--> statement-breakpoint
ALTER TABLE `variants` ADD `color_override` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `size_override` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `finish_override` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `notes_override` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `image_key` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `image_mime` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `image_original_name` text;
--> statement-breakpoint
ALTER TABLE `variants` ADD `image_bytes` integer;
--> statement-breakpoint
UPDATE `variants` SET `sku` = upper(trim(replace(replace(replace(`sku`, char(9), ' '), char(10), ' '), char(13), ' ')));
--> statement-breakpoint
DROP INDEX IF EXISTS `variants_sku_idx`;
--> statement-breakpoint
CREATE UNIQUE INDEX `variants_sku_idx` ON `variants` (`sku`);
--> statement-breakpoint
ALTER TABLE `product_codes` ADD `normalized_code` text;
--> statement-breakpoint
UPDATE `product_codes`
SET
  `channel` = coalesce(`channel`, 'geral'),
  `normalized_code` = upper(trim(replace(replace(replace(`code`, char(9), ' '), char(10), ' '), char(13), ' ')));
--> statement-breakpoint
DELETE FROM `product_codes`
WHERE `id` NOT IN (
  SELECT min(`id`)
  FROM `product_codes`
  GROUP BY `channel`, `normalized_code`
);
--> statement-breakpoint
DROP INDEX IF EXISTS `product_codes_code_channel_idx`;
--> statement-breakpoint
CREATE UNIQUE INDEX `product_codes_channel_normalized_idx` ON `product_codes` (`channel`, `normalized_code`);
--> statement-breakpoint
CREATE INDEX `products_master_attrs_idx` ON `products` (`product_type`, `theme`, `primary_color`, `active`);
--> statement-breakpoint
CREATE INDEX `variants_sku_search_idx` ON `variants` (`sku`, `active`);
