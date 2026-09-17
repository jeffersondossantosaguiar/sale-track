# Data Model — Catálogo com Variantes e Precificação por Canal

**Fase 1 do /speckit.plan** — entidades e relações derivadas da spec `002-product-variants-pricing`.

> Dinheiro é armazenado em **centavos inteiros** (integers). Não há ponto flutuante.

## Mudanças em relação ao modelo atual (001)

- `products` **perde** `salePriceCents` e `estimatedCostCents` → viram propriedades da **variante**.
- `product_codes` passa a apontar para `variant_id` (era `product_id`).
- `sale_items` ganha `variant_id` (vínculo) e passa a congelar o custo da **variante**.
- Novas entidades: `variants`, `materials`, `variant_prices`, `printers`.
- `settings` ganha chaves novas (tarifas fixas, R$/kWh, horas/semana, mão de obra).

## Entidades

### Product (`products`) — modificado
Contêiner de variantes. **Não** carrega mais preço/custo.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| name | text | nome do produto |
| categoryId | FK → categories null | |
| active | boolean | p/ ocultar sem apagar |
| createdAt / updatedAt | datetime | |

### Variant (`variants`) — nova
Unidade real de venda; carrega os insumos de custo e o custo calculado (cache do motor).

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| productId | FK → products (cascade) | |
| sku | text UNIQUE | identificador legível único |
| name | text | ex.: "Porta-chaves Dragão — Preto" |
| printTimeMin | integer | tempo de impressão (min) |
| manualTimeMin | integer | trabalho manual (min) |
| filamentMaterialId | FK → materials null | material usado |
| filamentGrams | integer | peso = filamento gasto (g) |
| packagingCents | integer | custo de embalagem |
| costCents | integer | custo calculado (cache) |
| active | boolean | |
| createdAt / updatedAt | datetime | |

**Accessories** (`variant_accessories`): lista somada de acessórios por variante.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| variantId | FK → variants (cascade) | |
| name | text | ex.: "argola" |
| costCents | integer | |

### Material (`materials`) — nova
Preço fixo do filamento por cor/tipo.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| name | text | ex.: "PLA Preto" |
| pricePerKgCents | integer | R$/kg (por 1000g) |
| active | boolean | |

### VariantPrice (`variant_prices`) — nova
Preço/margem por variante × canal.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| variantId | FK → variants (cascade) | |
| channel | text (shopee\|tiktok) | |
| marginBps | integer | margem em base-points (0..10000) |
| suggestedPriceCents | integer | (custo+taxa_fixa)/(1−taxa%−margem%) |
| practicedPriceCents | integer | preço que o dono decide (congelado) |
| UNIQUE(variantId, channel) | | |

### Printer (`printers`) — nova
Referência de custo para derivar o R$/hora global (usa-se a **mais cara**).

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| name | text | modelo |
| acquisitionCents | integer | custo de aquisição |
| usefulLifeYears | integer | vida útil (anos) |
| powerWatts | integer | consumo (W) |
| maintenanceCentsPerHour | integer | manutenção/conserto R$/hora |
| active | boolean | |

### ProductCode (`product_codes`) — modificado
Vínculo cProd → **variante** por canal.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| variantId | FK → variants (cascade) | era productId |
| code | text | `cProd` usado na nota |
| channel | text (shopee\|tiktok\|geral) | |

### SaleItem (`sale_items`) — modificado
Passa a referenciar variante; custo congelado é da variante.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| saleId | FK → sales | |
| variantId | FK → variants null | preenchido se cProd casou |
| cProd | text | código bruto na nota |
| description | text | |
| qty | integer | |
| unitPriceCents | integer | |
| frozenCostCents | integer null | custo da variante vigente na data da venda |

> Manter `productId`? Não — substituído por `variantId` (a variante pertence ao produto). Migração:
> `product_codes.product_id → variant_id` e `sale_items.product_id → variant_id` (via variante
> default do produto).

## Relações
- **Product 1—N Variant**: produto tem N variantes (≥1).
- **Variant N—1 Material**: usa um material de filamento (nullable p/ casos sem filamento).
- **Variant 1—N VariantPrice**: preço/margem por canal.
- **Variant 1—N VariantAccessory**: acessórios somados.
- **Variant 1—N ProductCode**: códigos cProd por canal.
- **Variant 1—N SaleItem**: itens de venda (custo congelado).

## Invariantes
1. `costCents` da variante = filamento + energia+máquina + mão de obra + embalagem + acessórios.
   `costCents` é **cache**: recalcula quando material/parâmetros/tempos mudam.
2. `filamentCents = filamentGrams / 1000 × material.pricePerKgCents`.
3. `energyMachineCents = printTimeMin/60 × globalMachineCostPerHour` (usando a **impressora mais
   cara**).
4. `laborCents = (printTimeMin + manualTimeMin)/60 × laborCostPerHour`.
5. `suggestedPriceCents = (costCents + feeFixedCents[channel]) / (1 − feeRateBps[channel]/10000 −
   marginBps/10000)`, arredondado para centavos.
6. `practicedPriceCents` **não muda** quando custo/margem/taxa mudam — só com ação manual.
7. `sku` é único no catálogo (UNIQUE).
8. Produto sempre tem ≥1 variante (default ao criar).
9. `frozenCostCents` de uma venda nunca muda quando a variante é editada (imutabilidade, constitution
   §I).
10. Todo valor monetário é inteiro (centavos); percentuais como `Bps` inteiros (0..10000).

## Configuração (`settings`)
Novas chaves (valores serializados em texto):
- `kwh_rate_cents` — tarifa de energia (R$/kWh).
- `hours_per_week` — horas de uso/semana (ex.: 72).
- `labor_cost_per_hour_cents` — custo/hora de mão de obra.
- `channel_fee_fixed_cents_shopee` / `channel_fee_fixed_cents_tiktok` — taxa fixa por canal.
- `channel_fee_bps_shopee` / `channel_fee_bps_tiktok` — taxa percentual por canal (já existe).

## Migrações
Todas via Drizzle (`drizzle-kit migrate`), versionadas em `src/lib/db/migrations/`. Dados de teste
podem ser recriados (decisão do dono). Nunca alterar schema fora de migração (constitution V).