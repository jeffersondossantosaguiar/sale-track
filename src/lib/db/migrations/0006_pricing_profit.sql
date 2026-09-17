-- 005-pricing-profit-rework: margem unificada no produto, frete/recebido na venda,
-- e tabela de faixas de taxa por canal (precificação).
ALTER TABLE `products` ADD COLUMN `margin_bps` integer NOT NULL DEFAULT 3500;
--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `freight_cents` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `received_cents` integer;
--> statement-breakpoint
ALTER TABLE `variant_prices` DROP COLUMN `margin_bps`;
--> statement-breakpoint
CREATE TABLE `channel_fee_tiers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `channel` text NOT NULL,
  `min_cents` integer NOT NULL,
  `max_cents` integer,
  `commission_bps` integer NOT NULL DEFAULT 0,
  `fixed_cents` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_fee_tiers_channel_min_max_idx` ON `channel_fee_tiers` (`channel`, `min_cents`, `max_cents`);
--> statement-breakpoint
CREATE INDEX `channel_fee_tiers_channel_idx` ON `channel_fee_tiers` (`channel`);