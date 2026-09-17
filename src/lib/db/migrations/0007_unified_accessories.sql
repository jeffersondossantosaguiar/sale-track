-- 006-products-accessories: consolida o custo de acessórios da variante num
-- único campo (variants.accessories_cents), migrando a soma das linhas atuais
-- e removendo a tabela variant_accessories.
ALTER TABLE `variants` ADD `accessories_cents` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `variants` SET `accessories_cents` = (
	SELECT coalesce(sum(`variant_accessories`.`cost_cents`), 0)
	FROM `variant_accessories`
	WHERE `variant_accessories`.`variant_id` = `variants`.`id`
);
--> statement-breakpoint
DROP TABLE `variant_accessories`;