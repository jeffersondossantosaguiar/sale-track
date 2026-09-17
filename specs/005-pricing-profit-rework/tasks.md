---

description: "Task list for feature 005-pricing-profit-rework"
---

# Tasks: Precificação e Apuração de Lucro por Canal

**Input**: Design documents from `specs/005-pricing-profit-rework/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md,
contracts/profit-engine.md, contracts/pricing-engine.md

**Tests**: Testes **obrigatórios** para o motor de lucro/preço, para o pipeline de importação (NFe
frete/quantidade) e para o parsing/match de relatórios (constitution §III e §IV).

**Organization**: Tasks agrupados por user story, em ordem de prioridade (US1 P1 → US3 P3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ajustes de base para a feature (projeto já existe da feature 004).

- [x] T001 [P] Adicionar helper de leitura de `settings` numérica em `src/lib/db/settings.ts`
      (se não existir) para ler `channel_fee_bps_<canal>`/`channel_fee_fixed_cents_<canal>`,
      mantendo `getNumberSetting` usado em `src/lib/catalog/service.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reformulação do schema e do domínio financeiro/de precificação — DEVE estar completa
antes de qualquer user story.

**⚠️ CRITICAL**: Nenhum trabalho de user story começa antes desta fase.

- [x] T002 Reformular `src/lib/db/schema.ts` conforme `data-model.md`: `products` ganha `marginBps`
      (integer default 3500); `variant_prices` **perde** `marginBps`; `sales` ganha `freightCents`
      (integer default 0) e `receivedCents` (integer null); criar `channel_fee_tiers` (channel
      "shopee"|"tiktok", minCents, maxCents null, commissionBps, fixedCents, timestamps,
      UNIQUE(channel, minCents, maxCents)).
- [x] T003 [P] Criar domínio `src/lib/domain/fees.ts` (estender): helper `percentToBps` e
      `normalizeBps` (clampa 0..10000) já existem; adicionar `FEE_TIERS_CHANNELS` e tipagem
      `FeeTier = { minCents, maxCents|null, commissionBps, fixedCents }`.
- [x] T004 [P] Estender `src/lib/domain/cxmoney.ts` conforme `contracts/profit-engine.md`:
      `profitOf(received, cost)`, `netOfReceived(received, gross)`, `feeOf(product, received)`,
      `productOf(gross, freight)` — centavos inteiros, `assertCents`, nil quando pendente.
- [x] T005 [P] Estender `src/lib/domain/pricing.ts` conforme `contracts/pricing-engine.md`:
      `feeForPrice(priceCents, tiers)` e `computeSuggestedPriceCents(costCents, marginBps, tiers)`
      por **iteração** (limite 6; RangeError se comissão+margem ≥ 100% ou sem convergência).
- [x] T006 Gerar e aplicar migração Drizzle versionada (`0006`) em `src/lib/db/migrations/` via
      `drizzle-kit generate` + `npm run db:migrate`.
- [x] T007 Seed em `src/lib/db/seed.ts`: criar `channel_fee_tiers` padrão (Shopee e TikTok do
      `contracts/pricing-engine.md`) e default `margin_bps=3500` para produtos existentes.

**Checkpoint**: Fundação pronta — stories podem iniciar em paralelo.

---

## Phase 3: User Story 1 - Apuração de lucro correta por venda (Priority: P1) 🎯 MVP

**Goal**: Lucro = recebido − custo (× quantidade); frete automático da NFe; lucro pendente sem
recebido; taxa derivada somente-leitura; corrigir importador ignorando quantidade.

**Independent Test**: Importar NFe com frete e linha de qtd > 1, informar recebido, conferir lucro =
recebido − Σ(custo×qtd) e taxa derivada = (bruto−frete) − recebido; venda sem recebido fica pendente.

### Tests for User Story 1 ⚠️ (obrigatório — constitution §III)

> Escrever os testes ANTES da implementação (red-green-refactor).

- [x] T008 [P] [US1] Unit test de `profitOf`/`feeOf`/`productOf`/`netOfReceived` em
      `tests/cxmoney.test.ts` seguindo `contracts/profit-engine.md` (ex.: `profitOf(11_17, 5_00)`
      `=== 6_17`; `feeOf(19_28, 11_17) === 8_11`; `productOf(156_49, 23_87) === 132_62`).
- [x] T009 [P] [US1] Teste de importação em `tests/integration-import.test.ts`: NFe com frete e linha
      de qtd > 1 → `freightCents` gravado, custo agregado `Σ(frozenCost × quantity)`, lucro = recebido −
      custo; sem recebido → lucro pendente.

### Implementation for User Story 1

- [x] T010 [P] [US1] Extrair `vFrete` (default 0) no parser `src/lib/xml/parser.ts`: adicionar
      `freightCents` a `ParsedInvoice` (via `fieldText(totalBlock, "vFrete")`, `decimalToCents`).
- [x] T011 [US1] Corrigir `src/lib/xml/importer.ts`: `totalCost = Σ(frozenCostCents ?? 0) × quantity`;
      `product = gross − freight`; gravar `freightCents`; `receivedCents` null na importação;
      `liquidCents` = `profitOf(received, cost)` ou **nil** quando sem recebido; `feeCents` derivado.
- [x] T012 [US1] Atualizar `src/lib/sales/service.ts`: `createPresentialSale` grava
      `receivedCents = receivedCents` (digitado) e `liquid = profitOf(received, totalCost×qty)`;
      remover/neutralizar `setSaleFee` (taxa agora derivada, somente-leitura).
- [x] T013 [US1] UI em `src/app/(dashboard)/sales/`: campo editável **Recebido (R$)**, exibição do
      lucro = recebido − custo; lucro **pendente** quando sem recebido; estimativa por faixa (quando
      houver) exibida separada e marcada.
- [x] T014 [US1] Server Action em `src/app/actions/sales.ts` (ou novo) para editar `receivedCents` de
      uma venda e recalcular `net`/`fee`/`liquid` via `profit-engine`.

**Checkpoint**: US1 funcional e testável isoladamente (lucro correto, frete automático).

---

## Phase 4: User Story 2 - Precificação com margem unificada e taxas por faixa (Priority: P2)

**Goal**: Margem única por produto (campo livre); tabela de faixas de taxa por canal (editor
texto→linhas); preço sugerido por canal via iteração; corrigir bugs do editor de preço.

**Independent Test**: Definir margem do produto, configurar faixas Shopee/TikTok, gerar sugerido por
canal; alterar faixa/custo recalcula sugerido sem tocar no praticado; editor sem bugs de hooks/unidade.

### Tests for User Story 2 ⚠️ (obrigatório — constitution §III)

> Escrever os testes ANTES da implementação (red-green-refactor).

- [x] T015 [P] [US2] Unit test em `tests/pricing.test.ts` seguindo `contracts/pricing-engine.md`:
      `feeForPrice` escolhe faixa correta (inclusiva/aberta); `computeSuggestedPriceCents` itera até
      estabilizar; RangeError quando comissão+margem ≥ 100% ou sem faixa aplicável.
- [x] T016 [P] [US2] Teste de serviço em `tests/fees.test.ts` (ou novo): `upsertVariantPrice` usa a
      margem do **produto** + faixas para o sugerido; praticado não muda com mudança de custo/faixa.

### Implementation for User Story 2

- [x] T017 [P] [US2] Atualizar `src/lib/catalog/service.ts`: `channelFee` passa a ler `channel_fee_tiers`
      e retornar tiers; `upsertVariantPrice` e `recomputeSuggested` usam `product.marginBps` +
      `feeForPrice`/`computeSuggestedPriceCents`; manter `practicedPriceCents` congelado.
- [x] T018 [P] [US2] Atualizar `src/app/actions/catalog.ts` `upsertVariantPriceAction` para enviar
      margem do produto (não por canal) e usar o novo motor.
- [x] T019 [US2] UI produto em `src/app/(dashboard)/products/`: campo **Margem % (livre)** no cadastro
      do produto; herdar para variantes.
- [x] T020 [US2] Corrigir `PriceEditor` em `src/app/(dashboard)/products/products-panel.tsx`:
      extrair componente filho por canal (remover `useState` do `.map()`, linhas 604-660); campo margem
      exibe `marginBps/100` e salva `×100`; lucro exibido = `praticado − comissão_canal − custo`.
- [x] T021 [P] [US2] Editor de faixas em `src/app/(dashboard)/settings/sales-channels/` (novo painel):
      caixa de texto por linha (`<= 79,99 = 20% + 4`) → parse → **prévia** em linhas estruturadas com
      validação (sobreposição, limites) antes de salvar em `channel_fee_tiers`.
- [x] T022 [US2] Server Action para o editor de faixas (`src/app/actions/catalog.ts` ou novo):
      `saveChannelFeeTiers` validando contiguidade/não-sobreposição das faixas de um canal.

**Checkpoint**: US1 + US2 funcionais e testáveis independentemente.

---

## Phase 5: User Story 3 - Importação de relatórios para preencher o recebido (Priority: P3)

**Goal**: Importar relatórios de saldo (Shopee) e renda (TikTok) em xlsx/csv, cruzar com NFe por
ID/produto, preencher `receivedCents`; ambíguos → fila de conferência manual.

**Independent Test**: Subir relatório Shopee (match por ID do pedido no nome da NFe) e TikTok
(produto/SKU+data+qtd+valor) preenchendo o recebido; venda sem match confiável vai para conferência.

### Tests for User Story 3 ⚠️ (obrigatório — constitution §IV)

> Escrever os testes ANTES da implementação (red-green-refactor).

- [x] T023 [P] [US3] Unit test do parser Shopee em `tests/reports/shopee.test.ts`: relatório de saldo
      (xlsx/csv de fixture) extrai `Renda do pedido` → {orderId, receivedCents}.
- [x] T024 [P] [US3] Unit test do parser TikTok em `tests/reports/tiktok.test.ts`: income, aba
      "Detalhes do pedido", extrai por pedido `{orderId, sku, nome, date, qty, receivedCents}` e confere
      que a soma por dia bate com o extrato diário.
- [x] T025 [P] [US3] Unit test de match em `tests/reports/match.test.ts`: Shopee casa por ID exato;
      TikTok casa por produto/SKU+data+qtd+valor; ambíguo → fila de conferência (sem falso vínculo).

### Implementation for User Story 3

- [x] T026 [P] [US3] Parser Shopee em `src/lib/reports/shopee.ts`: lê xlsx (SheetJS ou zip+xml) e csv;
      extrai transações "Renda do pedido" {orderId, receivedCents}.
- [x] T027 [P] [US3] Parser TikTok em `src/lib/reports/tiktok.ts`: lê xlsx/csv; aba "Detalhes do
      pedido" → {orderId, sku, nome, date, qty, receivedCents}.
- [x] T028 [US3] Match em `src/lib/reports/match.ts`: cruza NFe ↔ relatório (Shopee por ID do pedido
      no nome da NFe; TikTok por produto/SKU+data+qtd+valor coerente); retorna matches de alta
      confiança + fila de ambíguos.
- [x] T029 [US3] Server Action + UI em `src/app/(dashboard)/sales/`: importar relatório (upload
      xlsx/csv), aplicar match, gravar `receivedCents`, mostrar conferência manual dos ambíguos.
- [x] T030 [US3] Gravar recebido via match e recalcular `net`/`fee`/`liquid` (reuso do profit-engine);
      recebido permanece editável manualmente (FR-016).

**Checkpoint**: Todos os stories funcionais.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Recálculo, documentação e validação final.

- [x] T031 [P] Script de recálculo em `src/lib/db/recalc-profit.ts`: reprocessar `net`/`fee`/`liquid`
      das vendas existentes a partir de `received`/`freight`/`cost × quantity`; re-calcular
      `suggestedPriceCents` das variantes com produto+faixas.
- [x] T032 [P] README: documentar que **reembolsos** nos relatórios são **ignorados** nesta versão e
      marcados como melhoria/ponto a verificar; registrar formato dos relatórios e estratégia de match.
- [x] T033 [P] Rodar `quickstart.md`: validar os 3 cenários de ponta a ponta.
- [x] T034 Rodar `pnpm test`, `pnpm typecheck` e `pnpm lint:check`; corrigir falhas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências.
- **Foundational (Phase 2)**: Depende do Setup — **BLOQUEIA** todos os stories.
- **User Stories (Phase 3+)**: Dependem da Fundação; executados em ordem de prioridade (P1 → P2 → P3).
- **Polish (Final)**: Depende dos stories concluídos.

### User Story Dependencies

- **US1 (P1)**: após Foundational; sem dependência de outros stories.
- **US2 (P2)**: após Foundational; usa domínio de preço/faixas (T005) e schema (T002).
- **US3 (P3)**: após Foundational; usa profit-engine (T004) e schema `receivedCents` (T002).

### Within Each User Story

- Testes escritos ANTES e falhando antes da implementação.
- Domínio → serviço → action → UI.
- Story completa antes de ir ao próximo.

### Parallel Opportunities

- Setup/Foundational tasks marcadas [P] em paralelo.
- Testes de cada story marcados [P] em paralelo.
- Domínios dentro de um story marcados [P] em paralelo.

---

## Implementation Strategy

### MVP First (US1)

1. Setup → Foundational.
2. US1 (lucro correto + frete + qtd). **STOP e VALIDATE**.
3. US2 (margem unificada + faixas). **STOP e VALIDATE**.
4. US3 (importação de relatórios). **STOP e VALIDATE**.
5. Polish.

### Incremental Delivery

Cada story entrega valor sem quebrar os anteriores: US1 corrige o lucro; US2 centraliza a
precificação; US3 automatiza o recebido. O dono pediu tudo de uma vez, bem fatiado.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência.
- [Story] mapeia a task à user story.
- Cada story é completável e testável independentemente.
- Confirmar testes falham antes de implementar.
- Commit após cada task ou grupo lógico.
- Fonte da verdade: recebido (lucro); bruto da NFe imutável; custo congelado × quantidade.