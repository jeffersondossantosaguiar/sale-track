---

description: "Task list for feature 004-cost-pricing-corrections"
---

# Tasks: Correções no Motor de Custo e Precificação

**Input**: Design documents from `specs/004-cost-pricing-corrections/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md,
contracts/pricing-engine.md

**Tests**: Testes **obrigatórios** para o motor de custo/preço (constitution §III) — red-green-refactor.

**Organization**: Tasks agrupados por user story, em ordem de prioridade (US1 P1 → US4 P2).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparação da feature; nenhuma chave de `settings` nova é necessária.

- [x] T001 Documentar a feature (spec/research/data-model/plan/quickstart/contract/checklist/tasks).
- [x] T002 Atualizar o contrato canônico `specs/002-product-variants-pricing/contracts/pricing-engine.md`
      (mão de obra = só manual; split energia/máquina; taxa % como bps).

---

## Phase 2: User Story 1 - Corrigir o cálculo de custo da variante (Priority: P1)

**Goal**: Motor de custo corrigido — mão de obra só manual; detalhamento com Energia e Máquina separadas.

**Independent Test**: Variante com impressão 60min + manual 30min → mão de obra usa só 30min; energia e
máquina em linhas separadas; total = soma das linhas.

### Tests for User Story 1 ⚠️ (obrigatório — constitution §III)

> Escrever os testes ANTES da implementação (red-green-refactor).

- [x] T003 [P] [US1] Unit test `tests/cost.test.ts`: `laborCostCents` usa **só `manualTimeMin`**;
      `energyCents`/`machineCents` separados; total = soma das linhas; exemplo do dono (custo real).
- [x] T004 [P] [US1] Unit test `tests/pricing.test.ts`: sugerido com taxa % como bps (2000 = 20%);
      praticado congelado após recálculo.

### Implementation for User Story 1

- [x] T005 [P] [US1] `src/lib/domain/printer.ts`: expor `energyPerHour` e `machinePerHour` separados e
      os globais (`globalEnergyPerHour`, `globalMachinePerHour`) por impressora ativa mais cara.
- [x] T006 [P] [US1] `src/lib/domain/cost.ts`: `laborCostCents(manualTimeMin, rate)`; `computeVariantCost`
      retorna `{ filament, energy, machine, labor, packaging, accessories, total }`.
- [x] T007 [US1] `src/lib/catalog/service.ts`: `recomputeVariantCost` e `getVariantCostBreakdown` usam o
      novo shape e a nova derivação.
- [x] T008 [US1] `src/app/(dashboard)/products/products-panel.tsx`: detalhamento com linhas **Energia** e
      **Máquina** separadas (tipo `CostBreakdown` atualizado).

**Checkpoint**: US1 funcional e testável isoladamente.

---

## Phase 3: User Story 2 - Parâmetros globais recarregam e propagam (Priority: P1)

**Goal**: Painel carrega valores salvos; salvar recalcula todas as variantes.

- [x] T009 [US2] `src/app/(dashboard)/settings/pricing/page.tsx`: ler `kwh_rate_cents`,
      `hours_per_week`, `labor_cost_per_hour_cents` (via `getNumberSetting`) e passar ao painel.
- [x] T010 [US2] `src/app/(dashboard)/settings/pricing/global-params-panel.tsx`: receber `initial` props
      e inicializar o estado com os valores salvos.
- [x] T011 [US2] `src/app/actions/catalog.ts` (`setGlobalParams`): chamar `recalcAllCosts(db)` após
      gravar os settings.

**Checkpoint**: US2 funcional.

---

## Phase 4: User Story 3 - Corrigir a taxa de canal (% → bps) (Priority: P1)

**Goal**: Taxa % gravada como bps; valores existentes corrigidos por migração.

### Tests for User Story 3 ⚠️ (obrigatório — constitution §III)

- [x] T012 [P] [US3] Unit test `tests/fees.test.ts`: salvar `20` → `channel_fee_bps_shopee = 2000`.

### Implementation for User Story 3

- [x] T013 [US3] `src/app/actions/sales-fees.ts` (`setChannelFeeFrom`): gravar `bps = valor × 100`.
- [x] T014 [P] [US3] Migração `0005_pricing_corrections.sql`: corrigir `channel_fee_bps_shopee` 20→2000
      e `channel_fee_bps_tiktok` 16→1600 (idempotente).

**Checkpoint**: US3 funcional.

---

## Phase 5: User Story 4 - Ajustar dados de produção (Priority: P2)

**Goal**: Valores reais aplicados e variantes existentes recalculadas.

- [x] T015 [US4] Migração `0005_pricing_corrections.sql`: upsert `kwh_rate_cents = 88` e
      `labor_cost_per_hour_cents = 1289`.
- [ ] T016 [US4] Script `src/lib/db/recalc-costs.ts`: rodar `recalcAllCosts(db)` sobre o banco real
      (refresh de `costCents` e `suggestedPriceCents`; praticado congelado).

**Checkpoint**: US4 funcional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 Atualizar `docs/domain.md` com a regra corrigida (mão de obra só manual; energia/máquina).
- [ ] T018 Rodar `pnpm lint:check` e `pnpm typecheck` e corrigir pendências.
- [ ] T019 Rodar `pnpm test` completo e validar o Porta Caneta (custo ~R$ 16–17; sugerido Shopee ~R$ 40–41
      com taxa 20% corrigida; praticado R$ 39,99 congelado).

**Status de sincronização (2026-09-19)**: as mudanças de domínio e implementação desta feature
estão refletidas no código (`src/lib/domain/cost.ts`, `src/lib/domain/printer.ts`,
`src/lib/catalog/service.ts`, painel de precificação e migração `0005`). Permanecem pendentes
apenas a validação completa de lint/typecheck/testes e a conferência manual do cenário Porta Caneta
no banco real.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **US1 (Phase 2)**: depende do Setup.
- **US2 (Phase 3)**: independente da US1 (não toca no motor); pode rodar em paralelo.
- **US3 (Phase 4)**: independente; a migração (T014) depende do T015/T016 só na ordem de aplicação.
- **US4 (Phase 5)**: migração + recálculo; recálculo (T016) depende da US1 (nova fórmula) e das
  correções de dados.
- **Polish (Final)**: depende de todas.

### Parallel Opportunities

- US1 (T003–T008) e US2 (T009–T011) em paralelo.
- T012 (teste de taxa) e T013 (fix da taxa) em paralelo com US1.
- Migração T014/T015 é uma fase única.

---

## Implementation Strategy

1. Testes primeiro (T003/T004/T012) — red-green.
2. Domínio (T005/T006) antes de serviço (T007) antes de UI (T008).
3. Migração (T014/T015) + recálculo (T016) ao final, para refletir a nova fórmula nos dados.
4. Polish (T017–T019).

---

## Notes

- [P] = arquivos diferentes, sem dependências não concluídas.
- [Story] = mapeia a tarefa à user story da spec para rastreabilidade.
- Presencial fora do escopo; custos congelados e preço praticado imutáveis.
- Migração de dados em `settings` (sem schema novo). Verificar testes falhando antes de implementar;
  commitar após cada grupo lógico.
