---

description: "Task list for feature 001-sales-control-system"
---

# Tasks: Controle de Vendas MEI (sale-track)

**Input**: Plan from `specs/001-sales-control-system/plan.md`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md,
contracts/xml-import.md

**Tests**: Requeridos (mandatory) para o pipeline de importação de XML — ver constitution
§IV. Testes para as demais stories são opcionais na spec; incluídos apenas onde solicitado.

**Organization**: Tasks agrupados por user story, em ordem de prioridade (US1 P1 → US6 P3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do projeto e estrutura base

- [x] T001 Setup Next.js (App Router) + Tailwind + ShadCN + Biome em `src/` (Next 15, React 19, Node LTS 22)
- [x] T002 [P] Instalar dependências de dados: `drizzle-orm` + `better-sqlite3` + `drizzle-kit`
- [x] T003 [P] Configurar `tsconfig.json` paths (`@/*`) e o Biome (`npm run lint` = `biome check`)
- [x] T004 Criar variáveis de ambiente e `.env.example` (nenhum segredo; app local single-user)
- [x] T005 Configurar barrel de atalhos: `tsx` + scripts npm (`db:generate`, `db:migrate`, `db:seed`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura core — DEVE estar completa antes de qualquer user story

**⚠️ CRITICAL**: Nenhum trabalho de user story começa antes desta fase

- [x] T006 Definir schema Drizzle completo em `src/lib/db/schema.ts` (cats, products, sales, sale_items, cash_entries, settings, product_codes) conforme `data-model.md`
- [x] T007 [P] Criar cliente SQLite `src/lib/db/client.ts` (better-sqlite3, WAL, foreign keys ON)
- [x] T008 [P] Configurar Drizzle Kit + pasta `src/lib/db/migrations/` (migrações versionadas; nunca alterar schema fora de migração)
- [x] T009 [P] Criar `src/lib/domain/money.ts` — helpers de centavos inteiros (parse/format BRL); NUNCA float
- [x] T010 [P] Criar `src/lib/domain/meiteto.ts` — cálculo de faturamento acumulado e % do teto (teto configurável, default 81.000)
- [x] T011 [P] Criar `src/lib/settings.ts` — leitura/escrita de `settings` (teto MEI, % padrão de taxa por canal)
- [x] T012 Seed de dados iniciais (categorias padrão + canal via `products/seed.ts`)
- [x] T013 [P] Configurar Server Actions em `src/app/actions/` e validação de input (zod) para mutações

**Checkpoint**: Fundação pronta — stories podem iniciar em paralelo ✅ (2026-09-16)

---

## Phase 3: User Story 1 - Importar notas fiscais e controlar o faturamento (Priority: P1) 🎯 MVP

**Goal**: Importar XMLs de NFe em lote (dedup por nº da nota), detectar canal pelo nome do arquivo
(editável no lote), e alimentar o faturamento MEI (valor bruto vs. teto configurável).

**Independent Test**: Importar os fixtures de `tests/fixtures/xml/` (Shopee + TikTok + um
repetido) e verificar: 3 notas → 2 vendas únicas, canal detectado, faturamento do mês fecha
correto e o teto % aparece no dashboard.

### Tests for User Story 1 (REQUIRED — constitution §IV) ⚠️

> **NOTE**: Escrever ANTES da implementação; devem FALHAR inicialmente. Red-green-refactor.

- [x] T014 [P] [US1] Unit test parse XML NFe 55 → `tests/xml-parser.test.ts` (e `tests/xml-worker.test.ts`)
- [x] T015 [US1] Unit test dedup por nº da nota (mesma NF não importa 2x) → `tests/xml-dedup.test.ts`
- [x] T016 [P] [US1] Unit test detecção de canal pelo nome do arquivo (`..._invoice_file_...` → Shopee; nº puro → TikTok) → `tests/xml-channel.test.ts`
- [x] T017 [US1] Unit test casamento `cProd` → produto → `tests/xml-link.test.ts`
- [x] T018 [P] [US1] Contract test do schema XML importado → `tests/contract-xml-import.test.ts`
- [x] T019 [US1] Integration test do fluxo completo de import (XML → venda + faturamento) → `tests/integration-import.test.ts`

### Implementation for User Story 1

- [x] T020 [P] [US1] Criar `src/lib/xml/parser.ts` — parse do XML NFe 55 (itens, totais, data, nº)
- [x] T021 [P] [US1] Criar `src/lib/xml/channel.ts` — detecção de canal por padrão do nome; canal descartável = erro/confirmação manual
- [x] T022 [P] [US1] Criar `src/lib/xml/worker.ts` — Web Worker para parse em lote (app responsivo)
- [x] T023 [US1] Criar `src/lib/xml/link.ts` — vínculo `cProd` → produto (códigos por canal via `product_codes`)
- [x] T024 [US1] Criar Server Action `importXml` em `src/app/actions/xml-import.ts` (dedup por nº da nota; itens sem vínculo → fila "códigos sem vínculo")
- [x] T025 [US1] Criar UI de importação em `src/app/(dashboard)/sales/page.tsx` + `sales/import-form.tsx` (lote, edição de canal, preview antes de confirmar)
- [x] T026 [US1] Gravar XML bruto com a venda (`data/storage/` ao invés de `public/storage/` — PII fora do docroot, raiz estática p/ tracing) e impedir re-import da mesma NF

**Checkpoint**: US1 funcional e testável isoladamente (MVP completo) ✅ (2026-09-16)
- Validação real (local): 1.185 XMLs (1.155 Shopee + 30 TikTok) → 0 falhas de parse,
  1.184 vendas + 1 "já importado", faturamento R$ 44.014,71 (≈54,3% do teto R$ 81.000),
  re-import 100% idempotente. Fixtures em `tests/fixtures/xml/` (dados fictícios no
  formato real — sem PII). Verificado também: `cProd` TikTok genérico ("Padrao") cai na
  fila de itens sem vínculo (vínculo por descrição fica para US2).

---

## Phase 4: User Story 2 - Cadastrar produtos e precificar (Priority: P2)

**Goal**: Catálogo manual de produtos com preço/custo; vínculo multi-código por canal; custo
congelado na venda.

**Independent Test**: Cadastrar produto com 2 códigos (Shopee/TikTok), vender, e verificar
que o custo fica congelado mesmo alterando o cadastro depois.

### Implementation for User Story 2

- [x] T027 [P] [US2] Criar model/CRUD de `CATEGORIES` e `PRODUCTS` em `src/app/(dashboard)/products/` (Server Actions + zod)
  - `src/lib/domain/catalog.ts` (schemas zod: nomes normalizados, centavos inteiros) + `src/lib/catalog/service.ts`
    (CRUD com `Db` injectável; exclusões bloqueadas em uso — D7) + `src/app/actions/catalog.ts` + UI
    (`categories-panel.tsx` / `products-panel.tsx`).
  - Migração `0002_categories_products` escrita manualmente (drizzle-kit gera interativo e pede rename no
    prompt; coluna foi criada, não renomeada) — tabela `categories` + `products.category_id` FK (drop `category` texto).
  - Testes: `tests/catalog.test.ts` (12 casos) + seed cookie-cutter `Geral` (removível).
- [x] T028 [P] [US2] Criar `src/lib/domain/cxmoney.ts` — margem = (bruto − taxa − custo congelado), em centavos
  - `feeFromBps` (taxa por basis points), `netOf` (líquido), `marginOf` (margem = `liquid_cents`),
    `marginBpsOf` (relativa). Guardas de inteiro/overflow; importer.ts usa `netOf`/`marginOf` (fonte única).
  - Testes: `tests/cxmoney.test.ts` (8 casos, TDD).
- [x] T029 [US2] Gestão de `product_codes` (multi-código por canal) em `src/app/api/products/codes/` ou Server Action
  - Server Actions (`getProductCodes`/`addProductCode`/`removeProductCode` em `src/app/actions/catalog.ts`)
    + serviço (`createProductCode`/`listProductCodes`/`deleteProductCode` em `src/lib/catalog/service.ts`).
  - Canal `"geral"` → NULL (vale p/ qualquer canal); unicidade por (code, channel) case-insensitive
    (NULL não é dedup pelo índice UNIQUE — checagem explícita); mesmo code ok em canais distintos.
  - Schema zod (`productCodeInputSchema`/`productCodeChannelSchema`) + labels no domínio.
  - UI: `codes-panel.tsx` embutido no `products-panel.tsx` (botão "N códigos" por linha; listar/adicionar/remover).
  - Testes: `tests/codes.test.ts` (7 casos, TDD) — inclui gancho no `linkCProd` (código casa cProd no import).
- [x] T030 [US2] UI do catálogo em `src/app/(dashboard)/products/` (tabela, edição, preço/custo)
  - Refino: contadores no header (produtos/categorias), filtro por nome, margem R$ + % (via `marginBpsOf`),
    rodapé de totais (preço/custo/margem esperada via `marginOf`), estados vazios com filtro.
  - Verificado: 65/65 testes, typecheck, biome, build (4 rotas) e dev `/products` 200.
- [ ] T031 [US2] Resolver fila "códigos sem vínculo" — vínculo manual posterior aprende e atualiza novas importações

**Checkpoint**: US1 + US2 funcional; venda com margem correta

---

## Phase 5: User Story 3 - Controlar o caixa (Priority: P2)

**Goal**: Registrar entradas/saídas por categoria, aplicar estornos com data (nunca excluir),
e manter histórico imutável de faturamento.

**Independent Test**: Lançar entrada e saída, estornar, e verificar que o estorno aparece com
data e o faturamento NFe não muda.

### Implementation for User Story 3

- [ ] T032 [P] [US3] CRUD de `CASH_ENTRIES` (entradas/saídas por categoria) em `src/app/(dashboard)/cash/` (Server Actions + zod)
- [ ] T033 [US3] Modelo de estorno explícito: estorno é status com data (não exclusão), em `src/lib/domain/cash.ts`
- [ ] T034 [US3] Lógica de caixa separada do faturamento (ledger de caixa ≠ faturamento NFe) em `src/lib/domain/cashier.ts`
- [ ] T035 [US3] UI do caixa em `src/app/(dashboard)/cash/` (entrada/saída, categoria, estorno)

**Checkpoint**: US3 funcional; caixa e estorno consistentes

---

## Phase 6: User Story 4 - Registrar venda presencial (Priority: P2)

**Goal**: Lançar venda à mão (sem XML) usando o catálogo e fluxo de caixa.

**Independent Test**: Lançar venda presencial ligada a produto e ver margem; estornar e ver caixa revertido.

### Implementation for User Story 4

- [ ] T036 [US4] Server Action `createPresentialSale` em `src/app/actions/sales-presential.ts` (produto, quantidade, valor)
- [ ] T037 [US4] Integrar venda presencial ao faturamento (bruto) + lançamento de entrada no caixa
- [ ] T038 [US4] UI de venda presencial em `src/app/(dashboard)/sales/presential.tsx` (catálogo rápido, busca)

**Checkpoint**: US4 funcional; venda presencial = lógica de caixa

---

## Phase 7: User Story 5 - Acompanhar taxas e valor líquido (Priority: P3)

**Goal**: Taxa por venda pré-preenchida por % padrão do canal (configurável), editável por
venda; líquido = bruto − taxa.

**Independent Test**: Configurar % da Shopee, importar venda, e ver a taxa pré-preenchida
com líquido calculado; editar a taxa de uma venda específica.

### Implementation for User Story 5

- [ ] T039 [US5] Campo taxa editável por venda (default = % padrão do canal) em `src/app/actions/sales-fees.ts`
- [ ] T040 [US5] Cálculo de líquido (bruto − taxa) e persistência por venda em `src/lib/domain/` — sem mutar faturamento bruto
- [ ] T041 [US5] UI de taxas na tela da venda (edição, valor líquido visível)

**Checkpoint**: US5 funcional; líquido correto sem alterar faturamento

---

## Phase 8: User Story 6 - Dashboard e extrato para declaração (Priority: P3)

**Goal**: Dashboard mensal/anual (faturamento vs. teto MEI, % usado) e extrato exportável
para declaração do MEI/DASN.

**Independent Test**: Ver o % do teto MEI no dashboard e gerar export com o extrato do mês.

### Implementation for User Story 6

- [ ] T042 [US6] Dashboard em `src/app/(dashboard)/page.tsx` — faturamento mensal, acumulado anual, % do teto (barra)
- [ ] T043 [US6] Extrato exportável (CSV) em `src/app/api/export/route.ts` — faturamento + caixa para DASN
- [ ] T044 [US6] Validação NFe imutável: toda exibição traça até registro do banco (compositional integrity)

**Checkpoint**: Todas as stories funcionais

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias que atravessam múltiplas stories

- [ ] T045 Rodar `npm run db:migrate` + validação do `quickstart.md` ponta a ponta
- [ ] T046 Documentação final em `docs/` (rodapé de uso para MEI)
- [ ] T047 Revisão de segurança: sem segredos, sem float em dinheiro, validação de input em toda mutação
- [ ] T048 Revisão de integridade financeira: NFe imutável, estornos explícitos, dedup idempotente

---

## Dependencies & Execution

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa imediatamente
- **Foundational (Phase 2)**: depende do Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3+)**: todas dependem da Foundational; depois podem seguir em paralelo
  ou na ordem de prioridade P1 → P3
- **Polish (Fase 9)**: depende de todas as stories desejadas completas

### User Story Dependencies

- **US1 (P1)**: começa após Foundational — sem dependências de outras stories
- **US2 (P2)**: começa após Foundational — integra com US1 (vínculo `cProd` da US1 usa `product_codes` da US2), testável independente
- **US3 (P2)**: começa após Foundational — independente de US1/US2, testável isoladamente
- **US4 (P2)**: depende de US2 (usa catálogo) + US3 (caixa) para margem/estorno
- **US5 (P3)**: depende de US1 (importação) + US2 (margem), testável isoladamente
- **US6 (P3)**: depende de US1 (faturamento) e demais; entrega visão consolidada

### Within Each User Story

- Testes (quando obrigatórios) são escritos PRIMEIRO e devem FALHAR
- Models antes de services; services antes de endpoints
- Story completa antes de avançar para a próxima prioridade

### Parallel Opportunities

- Setup [P], Foundational [P], e todos os tasks marcados [P] podem rodar em paralelo
- Uma vez a Foundational completa, todas as user stories podem iniciar em paralelo (se houver equipe)
- Red-green-refactor em cada task de teste [US1]

---

## Implementation Strategy

### MVP First (US1 Only)

1. Fase 1 Setup + Fase 2 Foundational
2. Fase 3 US1 (importação XML + faturamento) → **STOP** → testar e validar
3. Deploy/demo do MVP (importar 3 XMLs → vendas + teto %)

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 → testar/demo (MVP)
3. US2 → testar (catálogo+preço)
4. US3 → testar (caixa/estorno)
5. US4 → testar (venda presencial)
6. US5 → testar (taxas/líquido)
7. US6 → testar (dashboard/extrato)

### Parallel Team Strategy

1. Equipe completa Setup + Foundational juntos
2. A partir da Foundational:
   - Dev A: US1, Dev B: US2, Dev C: US3
3. US4–US6 seguem na ordem; stories integram e são testáveis individualmente
