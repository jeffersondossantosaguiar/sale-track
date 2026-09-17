-- 004-cost-pricing-corrections: correção de dados em `settings` (idempotente).
-- - Taxas de canal % estavam gravadas como se fossem bps (20 → 0,2%); corrigir p/ 2000/1600.
-- - kwh_rate_cents = 88 (R$ 0,88/kWh CPFL bandeira verde).
-- - labor_cost_per_hour_cents = 1289 (R$ 12,89/h — mínimo federal R$ 1.621 + ~40% encargos).
UPDATE `settings` SET `value` = '2000', `updated_at` = strftime('%s','now')*1000
WHERE `key` = 'channel_fee_bps_shopee' AND `value` = '20';
--> statement-breakpoint
UPDATE `settings` SET `value` = '1600', `updated_at` = strftime('%s','now')*1000
WHERE `key` = 'channel_fee_bps_tiktok' AND `value` = '16';
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_at`)
VALUES ('kwh_rate_cents', '88', strftime('%s','now')*1000)
ON CONFLICT(`key`) DO UPDATE SET `value` = '88', `updated_at` = strftime('%s','now')*1000;
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_at`)
VALUES ('labor_cost_per_hour_cents', '1289', strftime('%s','now')*1000)
ON CONFLICT(`key`) DO UPDATE SET `value` = '1289', `updated_at` = strftime('%s','now')*1000;