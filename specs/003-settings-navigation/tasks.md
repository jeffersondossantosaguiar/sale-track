---

description: "Task list for feature 003-settings-navigation"
---

# Tasks: Seção Configurações com Navegação Lateral

**Input**: Design documents from `specs/003-settings-navigation/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Component tests para o menu lateral (accordion, item ativo, drawer mobile); testes
existentes para regressão. Domínio não muda — sem testes de domínio novos.

**Organization**: Tasks agrupados por user story, em ordem (US1 P1 → US5 P2).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bases da nova navegação (projeto já existe das features 001/002).

- [x] T001 [P] Criar `src/app/(dashboard)/sidebar.tsx` (componente cliente): itens Dashboard,
      Vendas, Produtos, Caixa + accordion **Configurações** com 4 subitens; marca item ativo via
      `usePathname`; auto-abre o accordion quando a rota é `/settings/*`.
- [x] T002 [P] Criar helpers de navegação (array de itens/labels/rotas) em `src/app/(dashboard)/nav.ts`
      reutilizados pelo sidebar (evita duplicação de labels como "Precificação", "Impressoras"...).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reestruturação do `layout.tsx` — DEVE estar pronta antes das rotas de conteúdo.

**⚠️ CRITICAL**: Nenhuma rota `/settings/*` de conteúdo é integrada antes desta fase.

- [x] T003 Reestruturar `src/app/(dashboard)/layout.tsx`: substituir o header top por layout com
      sidebar fixa à esquerda no desktop (`lg:`) e drawer (hambúrguer) no mobile; renderiza
      `<Sidebar />` + `<main>{children}</main>`.
- [x] T004 Criar `src/app/(dashboard)/settings/page.tsx` (index do grupo) que redireciona para
      `/settings/pricing` (`redirect`).

**Checkpoint**: Fundação pronta — rotas de conteúdo podem iniciar.

---

## Phase 3: User Story 1 - Acessar Configurações pelo menu lateral (Priority: P1) 🎯 MVP

**Goal**: Menu lateral funcional com accordion de Configurações e item ativo.

**Independent Test**: Abrir o app, ver o menu lateral, expandir Configurações, navegar para as 4
rotas, conferir item ativo; em janela estreita, abrir o drawer pelo hambúrguer.

### Tests for User Story 1

- [x] T005 [P] [US1] Component test do sidebar em `tests/` (RTL): accordion expande/recolhe; item
      ativo destacado; accordion auto-abre em `/settings/*`; drawer abre/fecha no mobile.

### Implementation for User Story 1

- [x] T006 [US1] Implementar/refinar `sidebar.tsx` conforme T001 (accordion + item ativo + drawer).
- [x] T007 [US1] Ajustar `layout.tsx` (T003) para responder ao drawer (estado aberto/fechado, fechar
      ao clicar fora ou selecionar item).

**Checkpoint**: US1 funcional e testável isoladamente.

---

## Phase 4: User Story 2 - Configurar precificação em Configurações (Priority: P1)

**Goal**: `/settings/pricing` com parâmetros globais + materiais, movido de Produtos.

**Independent Test**: Em `/settings/pricing`, alterar R$/kWh, horas/semana, mão de obra e um material;
conferir que salvam e que o custo das variantes acompanha.

### Implementation for User Story 2

- [x] T008 [P] [US2] Extrair bloco de **parâmetros globais** do `pricing-settings-panel.tsx` em
      `src/app/(dashboard)/settings/pricing/global-params-panel.tsx` (usa `setGlobalParams`).
- [x] T009 [P] [US2] Extrair bloco de **materiais** do `pricing-settings-panel.tsx` em
      `src/app/(dashboard)/settings/pricing/materials-panel.tsx` (usa
      `getMaterials/create/update/deleteMaterial`).
- [x] T010 [US2] Criar `src/app/(dashboard)/settings/pricing/page.tsx` compondo
      `GlobalParamsPanel` + `MaterialsPanel` (server component com `listMaterials()`).

**Checkpoint**: US2 funcional e testável isoladamente.

---

## Phase 5: User Story 3 - Gerenciar impressoras em Configurações (Priority: P1)

**Goal**: `/settings/printers` com CRUD de impressoras separado.

**Independent Test**: Em `/settings/printers`, cadastrar 2 impressoras, editar uma e remover outra;
conferir custo/hora global pela mais cara e recálculo das variantes.

### Implementation for User Story 3

- [x] T011 [P] [US3] Extrair bloco de **impressoras** do `pricing-settings-panel.tsx` em
      `src/app/(dashboard)/settings/printers/printers-panel.tsx` (usa
      `getPrinters/create/update/deletePrinter`).
- [x] T012 [US3] Criar `src/app/(dashboard)/settings/printers/page.tsx` compondo `PrintersPanel`
      (server component com `listPrinters()`).

**Checkpoint**: US3 funcional e testável isoladamente.

---

## Phase 6: User Story 4 - Configurar taxas por canal em Configurações (Priority: P2)

**Goal**: `/settings/sales-channels` com a config da taxa padrão; Vendas mantém resumo+lista.

**Independent Test**: Em `/settings/sales-channels`, alterar taxa % e fixa de um canal; conferir que
salva, que o resumo em Vendas reflete e que a próxima venda usa a nova taxa.

### Implementation for User Story 4

- [x] T013 [P] [US4] Extrair bloco de **config de taxa padrão** de `taxes-panel.tsx` em
      `src/app/(dashboard)/settings/sales-channels/channel-fees-panel.tsx` (usa `setChannelFeeFrom`,
      lê `getChannelFeeBps`/`getChannelFeeFixedCents`).
- [x] T014 [US4] Criar `src/app/(dashboard)/settings/sales-channels/page.tsx` compondo
      `ChannelFeesPanel` (server component).
- [x] T015 [US4] Remover o bloco de **config de taxa padrão** de `src/app/(dashboard)/sales/taxes-panel.tsx`,
      mantendo resumo por canal + lista operacional/estorno.

**Checkpoint**: US4 funcional e testável isoladamente.

---

## Phase 7: User Story 5 - Configurar teto MEI em Configurações (Priority: P2)

**Goal**: `/settings/mei` com edição; Dashboard com teto read-only.

**Independent Test**: Em `/settings/mei`, alterar o teto; conferir que o Dashboard mostra a % atualizada
sem input.

### Implementation for User Story 5

- [x] T016 [US5] Criar `src/app/(dashboard)/settings/mei/page.tsx` usando o `TetoForm` (movido).
- [x] T017 [US5] Mover `src/app/(dashboard)/teto-form.tsx` → `src/app/(dashboard)/settings/mei/teto-form.tsx`.
- [x] T018 [US5] Atualizar `src/app/(dashboard)/page.tsx`: remover `<TetoForm>`; manter o bloco do
      teto como leitura (barra + % + "X de Y" via `stats.meiLimitCents`).

**Checkpoint**: US5 funcional e testável isoladamente.

---

## Phase 8: Cleanup & Cross-Cutting Concerns

**Purpose**: Remoção do painel antigo, ajustes de actions e validação.

- [x] T019 [P] Remover `<PricingSettingsPanel>` e imports de `src/app/(dashboard)/products/page.tsx`;
      **deletar** `src/app/(dashboard)/products/pricing-settings-panel.tsx`.
- [x] T020 [P] Ajustar `revalidatePath` em `src/app/actions/catalog.ts`: para
      `setGlobalParams`, `create/update/deleteMaterial` e `create/update/deletePrinter`, revalidar as
      rotas `/settings/*` correspondentes (mantendo `/products` onde o painel operacional usa).
- [x] T021 [P] Ajustar `src/app/actions/sales-fees.ts`: `setChannelFeeFrom` passa a revalidar
      `/settings/sales-channels` (mantendo `/sales`); remover `revalidatePath("/products")`.
- [x] T022 [P] Atualizar `docs/domain.md` com a nova estrutura de navegação/configurações
      (governance da constitution).
- [x] T023 Rodar `biome check` (lint + format) e `tsc --noEmit` (typecheck) e corrigir pendências.
- [x] T024 Rodar testes existentes + component tests novos; validar `quickstart.md` ponta a ponta.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — inicia imediatamente.
- **Foundational (Phase 2)**: depende do Setup; **BLOQUEIA** as rotas de conteúdo.
- **User Stories (Phase 3+)**: dependem da Foundational.
  - US1 (P1) → US2/US3 (P1) → US4/US5 (P2).
- **Cleanup (Final)**: depende de todas as stories.

### User Story Dependencies

- **US1 (P1)**: inicia após Foundational; sem deps de outras stories (define o sidebar).
- **US2 (P1)**: inicia após Foundational; usa ações de material/parâmetros existentes.
- **US3 (P1)**: inicia após Foundational; usa ações de impressora existentes.
- **US4 (P2)**: inicia após Foundational; T015 depende de US1 (navegação pronta) e das ações de taxa.
- **US5 (P2)**: inicia após Foundational; T018 depende de US1 (Dashboard acessível).

### Within Each User Story

- Componentes de UI antes de integrar na rota; server actions reutilizadas (não recriadas).

### Parallel Opportunities

- Setup T001/T002 em paralelo.
- Foundational T003/T004 em paralelo.
- US2 (T008/T009/T010) e US3 (T011/T012) em paralelo após a Foundational.
- Cleanup T019/T020/T021/T022 em paralelo.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (sidebar + navegação)
4. **STOP e VALIDATE**: US1 isolada

### Incremental Delivery

1. Setup + Foundational → sidebar e grupo /settings prontos
2. US1 (menu lateral) → testar → demo (MVP)
3. US2 (precificação) e US3 (impressoras) → testar
4. US4 (taxas por canal) → testar
5. US5 (teto MEI) → testar
6. Cleanup (remover painel antigo + actions) → validar

---

## Notes

- [P] = arquivos diferentes, sem dependências não concluídas.
- [Story] = mapeia a tarefa à user story da spec para rastreabilidade.
- **Sem migração de schema**; **sem mudança de domínio**. Reorganização de UI/rotas apenas.
- O `FeesState` retornado por `setChannelFeeFrom` é maior que o necessário à página de settings, mas
  é inofensivo (não duplica o painel de Vendas).
- `products/page.tsx` continua chamando `listMaterials` (o `ProductsPanel` usa materiais).
- Verificar testes antes de implementar; commitar após cada grupo lógico.