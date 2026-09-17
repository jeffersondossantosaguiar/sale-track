# Data Model — Correções no Motor de Custo e Precificação

**Feature**: `004-cost-pricing-corrections` | **Fase 1 do /speckit.plan`

**Sem mudança de schema** — esta feature corrige a **fórmula** (domínio) e **dados** (settings). Nenhuma
tabela/coluna nova; nenhuma migração de schema.

## Entidades envolvidas

### `settings` (tabela chave→valor, inteiro serializado como texto)

| key | valor atual (errado) | valor correto | origem |
|---|---|---|---|
| `kwh_rate_cents` | `90` | `88` | tarifa real R$ 0,88/kWh |
| `hours_per_week` | `72` | `72` | sem mudança |
| `labor_cost_per_hour_cents` | `681` | `1289` | R$ 12,89/h |
| `channel_fee_bps_shopee` | `20` | `2000` | 20% em bps |
| `channel_fee_bps_tiktok` | `16` | `1600` | 16% em bps |
| `channel_fee_fixed_cents_*` | `400` | `400` | sem mudança |

> A migração usa `INSERT ... ON CONFLICT(key) DO UPDATE` (idempotente) para os valores a corrigir.
> Para as taxas % (20→2000 / 16→1600), corrige apenas onde o valor ainda está errado (`value='20'`→
> `'2000'`), de modo que re-executar não altera nada.

### `variants.costCents` (cache do motor)

- Recalculado via `recomputeVariantCost` / `recalcAllCosts` com a **nova fórmula** (mão de obra = só
  manual; energia e máquina separadas).
- Não é campo novo; valor existente é atualizado.

### `variant_prices.suggestedPriceCents`

- Recalculado junto com o custo (usa `costCents` e as taxas corrigidas). `practicedPriceCents` **não**
  muda (FR-011).

## Shape do detalhamento de custo (novo)

Antes: `{ filament, energyMachine, labor, packaging, accessories, total }`
Depois: `{ filament, energy, machine, labor, packaging, accessories, total }`

- `energy` = `round(printTimeMin/60 × (powerWatts/1000) × kwhRateCents)`
- `machine` = `round(printTimeMin/60 × (depreciação/h + manutenção/h))`
- `labor` = `round(manualTimeMin/60 × laborCostPerHourCents)`
- `total` = `filament + energy + machine + labor + packaging + accessories`

## Propagações

1. `setGlobalParams` → `recalcAllCosts(db)` → todas as variantes.
2. `updatePrinter` / `createPrinter` / `deletePrinter` → `recalcAllCosts` (já existente).
3. Migração de settings → recálculo inicial das variantes existentes (via script de recálculo).