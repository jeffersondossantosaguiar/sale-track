# Quickstart — Correções no Motor de Custo e Precificação (004)

**Feature**: `004-cost-pricing-corrections` | **Fase 1 do /speckit.plan`

## Pré-requisitos

- Ambiente local rodando (`pnpm dev`).
- Migrações aplicadas (`pnpm db:migrate`).

## Passo a passo (validação ponta a ponta)

### 1. Corrigir o motor de custo (US1)

1. Abra um produto → variante (ex.: Porta Caneta - Preto).
2. Confira o detalhamento de custo: linhas **Energia** e **Máquina** separadas.
3. Mão de obra = **só tempo manual** (15min → ~R$ 3,22 com R$ 12,89/h), e não 4,68h de impressão.
4. Custo total ≈ soma das linhas (filamento + energia + máquina + mão de obra + embalagem +
   acessórios).

### 2. Parâmetros globais (US2)

1. Vá em **Configurações → Precificação**.
2. Os campos (R$/kWh, horas/semana, mão de obra R$/h) já devem estar preenchidos com os valores salvos.
3. Altere um parâmetro, salve e atualize a página → o valor persiste e o custo das variantes recalcula.

### 3. Taxa de canal (US3)

1. Vá em **Configurações → Taxas por canal**.
2. Defina Shopee = 20%. Salve.
3. O preço sugerido de qualquer variante deve descontar 20% (2000bps) — não 0,2%.

### 4. Dados de produção (US4)

1. Confirmar `kwh_rate_cents = 88` e `labor_cost_per_hour_cents = 1289` (em Configurações →
   Precificação).
2. Porta Caneta recalculado: custo ~R$ 16–17; preço praticado continua R$ 39,99 (congelado).

## Verificação final

- `pnpm test` (unit do motor de custo/preço/taxas).
- `pnpm typecheck` e `pnpm lint:check` sem erros.