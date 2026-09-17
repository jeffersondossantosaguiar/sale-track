---

description: "Task list for feature 002-product-variants-pricing"
---

# Tasks: Catálogo com Variantes e Precificação por Canal

**Input**: Design documents from `specs/002-product-variants-pricing/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md,
contracts/pricing-engine.md

**Tests**: Testes **obrigatórios** para o motor de custo/preço e para a mudança no pipeline de
importação (constitution §III e §IV). Demais stories com testes onde solicitado.

**Organization**: Tasks agrupados por user story, em ordem de prioridade (US1 P1 → US5 P3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ajustes de base para a nova feature (projeto já existe da feature 001).

- [x] T001 [P] Adicionar chaves de `settings` para parâmetros globais: `kwh_rate_cents`,
      `hours_per_week`, `labor_cost_per_hour_cents`, `channel_fee_fixed_cents_shopee`,
      `channel_fee_fixed_cents_tiktok` em `src/lib/db/settings.ts` (valores serializados em texto,
      centavos inteiros; taxa fixa default 0).
- [x] T002 [P] Definir constantes de canais da nova feature em `src/lib/domain/catalog.ts`:
      `CHANNELS = ["shopee", "tiktok"]` (presencial fora do escopo).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reformulação do schema (Produto → Variante) — DEVE estar completa antes de qualquer
user story.

**⚠️ CRITICAL**: Nenhum trabalho de user story começa antes desta fase.

- [x] T003 Reformular `src/lib/db/schema.ts` conforme `data-model.md`: `products` perde
      `salePriceCents`/`estimatedCostCents`; criar `variants` (sku UNIQUE, productId FK cascade,
      printTimeMin, manualTimeMin, filamentMaterialId FK, filamentGrams, packagingCents, costCents,
      active, timestamps), `materials` (name, pricePerKgCents, active),
      `variant_prices` (variantId FK cascade, channel "shopee"|"tiktok", marginBps, suggestedPriceCents,
      practicedPriceCents, UNIQUE(variantId,channel)), `printers` (name, acquisitionCents,
      usefulLifeYears, powerWatts, maintenanceCentsPerHour, active), `variant_accessories`
      (variantId FK cascade, name, costCents).
- [x] T004 Migrar `product_codes` e `sale_items` para granularidade de variante em
      `src/lib/db/schema.ts`: `product_codes.productId → variantId`, `sale_items.productId → variantId`
      (FK cascade p/ codes; null p/ items).
- [x] T005 [P] Criar domínio `src/lib/domain/printer.ts`: deriva `R$/hora global` usando a impressora
      **mais cara** — `costPerHour = (acquisitionCents/(usefulLifeYears × hoursPerYear)) +
      (powerWatts/1000 × kwhRateCents) + maintenanceCentsPerHour`, com `hoursPerYear =
      hoursPerWeek × 52`; retorna o **maior** custo/hora entre as impressoras ativas. Centavos inteiros.
- [x] T006 Gerar e aplicar migração Drizzle versionada de reformulação em
      `src/lib/db/migrations/` via `drizzle-kit generate` + `npm run db:migrate`.
- [x] T007 Migração de dados (script em `src/lib/db/migrations/` ou seed): para cada produto
      existente, criar **1 variante default** (sku derivado do nome, costCents 0, active true) e
      re-apontar `product_codes` e `sale_items` para essa variante. Dados de teste podem ser
      recriados (decisão do dono).

**Checkpoint**: Fundação pronta — stories podem iniciar em paralelo.

---

## Phase 3: User Story 1 - Cadastrar produto com variantes e SKU (Priority: P1) 🎯 MVP

**Goal**: Catálogo passa a operar sobre variantes com SKU único; produto simples = 1 variante default.

**Independent Test**: Cadastrar produto com 3 variantes + 1 produto simples; conferir SKU único em
cada uma, variante default no simples, e rejeição de SKU duplicado.

### Implementation for User Story 1

- [x] T008 [P] [US1] Schema zod de variante em `src/lib/domain/catalog.ts`: `name` (1–120 chars,
      normalizado), `sku` (1–60 chars, trim), `printTimeMin`/`manualTimeMin` (int ≥ 0),
      `filamentGrams` (int ≥ 0), `packagingCents` (int ≥ 0) — centavos inteiros.
- [x] T009 [US1] Serviço de produto→variante em `src/lib/catalog/service.ts`: `createProduct`
      cria produto + 1 variante default; `createVariant`, `updateVariant`, `setVariantActive`,
      `deleteVariant` (impedir excluir a última variante de um produto); validar `sku` UNIQUE.
- [x] T010 [US1] Server Actions em `src/app/actions/catalog.ts` para produto→variantes
      (`createVariant`, `updateVariant`, `setVariantActive`) com validação zod + `revalidatePath`.
- [x] T011 [US1] UI de catálogo em `src/app/(dashboard)/products/`: editar produto com lista de
      variantes (nome, SKU, ativa), criar variante, e tratar erro de SKU duplicado.

**Checkpoint**: US1 funcional e testável isoladamente.

---

## Phase 4: User Story 2 - Calcular o custo de cada variante (Priority: P1)

**Goal**: Motor de custo calcula `costCents` da variante com detalhamento por linha (filamento,
energia+máquina, mão de obra destacada, embalagem, acessórios).

**Independent Test**: Para 2 variantes com parâmetros diferentes, o custo total e cada linha batem
com o cálculo manual da planilha.

### Tests for User Story 2 ⚠️ (obrigatório — constitution §III)

> Escrever os testes ANTES da implementação (red-green-refactor).

- [x] T012 [P] [US2] Unit test do motor de custo em `tests/domain/cost.test.ts` seguindo
      `contracts/pricing-engine.md`: filamento `= round(filamentGrams/1000 × pricePerKgCents)`,
      energia+máquina `= round(printTimeMin/60 × globalMachineCostPerHourCents)`, mão de obra
      `= round((printTimeMin+manualTimeMin)/60 × laborCostPerHourCents)`, soma de embalagem e
      acessórios; valida o exemplo do dono (custo R$10).

### Implementation for User Story 2

- [x] T013 [P] [US2] Criar domínio `src/lib/domain/cost.ts`: funções puras de custo por linha e
      `computeVariantCost` conforme o contrato; centavos inteiros, arredondamentos explícitos.
- [x] T014 [P] [US2] CRUD de `materials` (name, pricePerKgCents) em `src/lib/domain/catalog.ts` +
      `src/lib/catalog/service.ts` + action + UI em `src/app/(dashboard)/products/`.
- [x] T015 [US2] Recalcular `costCents` de uma variante quando material/parâmetros/tempos mudam em
      `src/lib/catalog/service.ts` (cache; nunca digitado à mão).
- [x] T016 [US2] UI de detalhamento de custo por linha em `src/app/(dashboard)/products/`
      (filamento, energia+máquina, mão de obra **destacada**, embalagem, acessórios → total).

**Checkpoint**: US2 funcional e testável isoladamente.

---

## Phase 5: User Story 3 - Precificar por canal (Priority: P2)

**Goal**: Preço sugerido/praticado por variante × canal (Shopee/TikTok); praticado congelado.

**Independent Test**: Definir margens/taxas por canal; conferir sugerido, ajustar praticado e ver
que fica congelado quando o custo muda.

### Tests for User Story 3 ⚠️ (obrigatório — constitution §III)

- [x] T017 [P] [US3] Unit test do preço em `tests/domain/pricing.test.ts`:
      `suggestedPriceCents = round((costCents + feeFixedCents[channel]) / (1 − feeRateBps/10000 −
      marginBps/10000))`; erro se `denominator ≤ 0`; verifica o exemplo (10 + 2)/(1 − 0,10 − 0,40) =
      24; `practicedPriceCents` não muda após recálculo.

### Implementation for User Story 3

- [x] T018 [P] [US3] Criar domínio `src/lib/domain/pricing.ts`: `computeSuggestedPrice`,
      `computeProfitCents` (`practicedPriceCents − costCents`) e `computeProfitBps`
      (`round(profitCents/practicedPriceCents × 10000)`).
- [x] T019 [US3] CRUD de `variant_prices` (marginBps, suggestedPriceCents, practicedPriceCents por
      canal) em `src/lib/catalog/service.ts`; ao recalcular custo, atualizar apenas `suggestedPriceCents`
      e **nunca** `practicedPriceCents`.
- [x] T020 [US3] Server Actions + UI de precificação por canal em `src/app/(dashboard)/products/`
      (margem, sugerido, praticado, lucro esperado e %).

**Checkpoint**: US3 funcional e testável isoladamente.

---

## Phase 6: User Story 4 - Parâmetros globais e impressoras (Priority: P2)

**Goal**: Configurar R$/kWh, horas/semana, mão de obra/hora e cadastrar impressoras (referência);
R$/hora global = impressora mais cara.

**Independent Test**: Configurar parâmetros e cadastrar 2 impressoras; conferir que o R$/hora global
usa a mais cara e que alterações recalculam o custo das variantes.

### Implementation for User Story 4

- [x] T021 [P] [US4] CRUD de `printers` em `src/lib/catalog/service.ts` + `src/lib/domain/printer.ts`
      (derivação já feita em T005) + action + UI em `src/app/(dashboard)/settings/` ou produtos.
- [x] T022 [US4] UI/actions de parâmetros globais (kwh, hours/week, mão de obra) em
      `src/app/(dashboard)/settings/` lendo/escrevendo `settings` (helper de T001).
- [x] T023 [US4] Ao alterar parâmetro global ou impressora, disparar recálculo de `costCents` das
      variantes afetadas em `src/lib/catalog/service.ts` (reutiliza T015).

**Checkpoint**: US4 funcional e testável isoladamente.

---

## Phase 7: User Story 5 - Vendas e importação na granularidade de variante (Priority: P3)

**Goal**: Import NFe e vínculo cProd operam sobre variantes; custo congelado é da variante.

**Independent Test**: Importar NFe com itens de uma variante; conferir vínculo na variante, custo
congelado correto e imutabilidade ao editar a variante depois.

### Tests for User Story 5 ⚠️ (obrigatório — constitution §IV)

> Escrever os testes ANTES da implementação (red-green-refactor).

- [x] T024 [P] [US5] Unit test do vínculo em `tests/domain/link-variant.test.ts`: `cProd` casa com
      `product_codes.variantId` (por canal; `general` se não houver canal específico); sem match →
      sem vínculo.
- [x] T025 [P] [US5] Integration test de importação com NFe de fixture em `tests/integration/`:
      item casa na **variante**, `sale_items.frozenCostCents = variants.costCents` da data da venda,
      e editar a variante depois NÃO altera a venda passada.

### Implementation for User Story 5

- [x] T026 [US5] Atualizar vínculo em `src/lib/xml/link.ts`: casar cProd → variante e, ao aprender
      um novo código, criar `product_codes.variantId` (mesmo fluxo do vínculo manual atual).
- [x] T027 [US5] Atualizar importador em `src/lib/xml/importer.ts` e `src/app/actions/xml-import.ts`:
      `sale_items` gravam `variantId` e `frozenCostCents` da variante; `applyCurrentCost` passa a
      aplicar o custo da variante às vendas sem custo.
- [x] T028 [US5] Atualizar UI de venda presencial/códigos sem vínculo em `src/app/(dashboard)/products/`
      e `src/app/(dashboard)/sales/` para referenciar variantes.

**Checkpoint**: US5 funcional e testável isoladamente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finalização, docs e validação.

- [x] T029 [P] Atualizar `docs/domain.md` com o novo modelo Produto→Variante, motor de custo e
      precificação por canal (governance da constitution).
- [x] T030 Rodar `biome check` (lint + format) e `tsc --noEmit` (typecheck) e corrigir pendências.
- [x] T031 Rodar validação de `quickstart.md` ponta a ponta (cadastro de variantes, custo,
      precificação por canal, importação de NFe real, imutabilidade).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — inicia imediatamente.
- **Foundational (Phase 2)**: depende do Setup; **BLOQUEIA** todas as user stories.
- **User Stories (Phase 3+)**: dependem da Foundational.
  - US1 e US2 (P1) → US3 (P2) → US4 (P2) → US5 (P3).
- **Polish (Final)**: depende de todas as stories desejadas.

### User Story Dependencies

- **US1 (P1)**: inicia após Foundational; sem deps de outras stories.
- **US2 (P1)**: inicia após Foundational; usa o R$/hora global (printer.ts de T005/FOUNDATIONAL) e
  parâmetros globais de T001; testável sozinho.
- **US3 (P2)**: depende de US2 (usa `costCents` e parâmetros de taxa).
- **US4 (P2)**: inicia após Foundational; T023 depende de T015/US2 (recálculo).
- **US5 (P3)**: depende de US1 (variantes) e US2 (custo); mexe no pipeline de import.

### Within Each User Story

- Testes (quando incluídos) são escritos e FALHAM antes da implementação.
- Domínio puro antes de serviço; serviço antes de actions/UI.

### Parallel Opportunities

- Setup T001/T002 em paralelo.
- Foundational: T003 (schema) e T005 (printer domain) em paralelo; T004 depende de T003; T006/T007
  dependem de T003/T004.
- US2: T012 (testes) e T013/T014 em paralelo.
- US3: T017 (testes) e T018 em paralelo.
- US5: T024/T025 (testes) em paralelo.

---

## Parallel Example: User Story 2

```bash
# Lançar testes e domínio juntos:
Task: "Unit test do motor de custo em tests/domain/cost.test.ts"
Task: "Criar domínio src/lib/domain/cost.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — reformulação de schema)
3. Complete Phase 3: User Story 1
4. **STOP e VALIDATE**: US1 isolada
5. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → base pronta (Produto→Variante)
2. US1 (variantes/SKU) → testar → demo (MVP)
3. US2 (motor de custo) → testar
4. US3 (precificação por canal) → testar
5. US4 (parâmetros/impressoras) → testar
6. US5 (import na variante) → testar
7. Cada story adiciona valor sem quebrar as anteriores

---

## Notes

- [P] = arquivos diferentes, sem dependências não concluídas.
- [Story] = mapeia a tarefa à user story da spec para rastreabilidade.
- Presencial fora do escopo: comportamento atual do app preservado (não remover código).
- Dados de teste podem ser migrados/recriados (decisão do dono).
- Verificar testes falhando antes de implementar; commitar após cada tarefa ou grupo lógico.
---

## Phase 9: Convergence

**Objetivo**: fechar lacunas detectadas na revisão de convergência (UI de custo/lucro/taxa fixa/acessórios).

- [x] T032 Exibir o detalhamento de custo por linha (filamento, energia+máquina, **mão de obra destacada**, embalagem, acessórios → total) na UI do editor de variante em `src/app/(dashboard)/products/products-panel.tsx` per FR-005/US2 (partial)
- [x] T033 Mostrar o lucro esperado (praticado − custo) e a porcentagem por canal no `PriceEditor` em `src/app/(dashboard)/products/products-panel.tsx` per FR-012/US3 (partial)
- [x] T034 Adicionar UI para configurar a taxa **fixa** por canal (`channel_fee_fixed_cents_shopee/tiktok`) junto às taxas % em `src/app/(dashboard)/sales/taxes-panel.tsx` per FR-013 (partial)
- [x] T035 Adicionar UI de acessórios (adicionar/remover {nome, custo}) no editor de variante em `src/app/(dashboard)/products/products-panel.tsx` per FR-005 (partial)
- [x] T036 Ocultar variantes inativas das opções de venda nova (presencial) em `src/app/(dashboard)/sales/presential.tsx` per US1/AC4 (partial)
- [x] T037 Permitir editar material (nome/preço/kg) e impressora (parâmetros) na UI de `src/app/(dashboard)/products/pricing-settings-panel.tsx` per FR-006 (partial)
