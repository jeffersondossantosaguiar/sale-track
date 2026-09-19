# Tasks: Vínculo de Itens TikTok por Descrição

**Input**: Design documents from `/specs/006-tiktok-description-linking/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Testes obrigatórios (constitution §IV) — red-green.

**Organization**: Tasks agrupadas por user story (US1 = vínculo por descrição; US2 = reparo).

## Phase 1: Vínculo por descrição (US1 — P1)

**Goal**: Itens TikTok são vinculados pela descrição (chave por canal); Shopee/presencial seguem por `cProd`.

**Independent Test**: `tests/xml-link.test.ts` e `tests/unlinked.test.ts` verificam chave por canal, agrupamento por descrição e backfill/auto-vínculo TikTok.

### Tests for User Story 1 ⚠️ (escrever primeiro; devem FALHAR antes da implementação)

- [x] T001 [P] [US1] Teste de `itemMatchKey` por canal em `tests/xml-link.test.ts`
- [x] T002 [P] [US1] Teste de `linkItems`/`linkCProd` com chave por canal (TikTok descrição; Shopee cProd) em `tests/xml-link.test.ts`
- [x] T003 [US1] Teste de `listUnlinkedGroups` agrupando TikTok por descrição em `tests/unlinked.test.ts`
- [x] T004 [US1] Teste de `linkUnlinkedToVariant` com backfill por descrição (só casa a descrição certa) em `tests/unlinked.test.ts`
- [x] T005 [US1] Teste de auto-vínculo de novo import TikTok por descrição em `tests/unlinked.test.ts`

### Implementation for User Story 1

- [x] T006 [US1] Adicionar `itemMatchKey(channel, item)` + refatorar `linkItems` para usar a chave por canal em `src/lib/xml/link.ts`
- [x] T007 [US1] `listUnlinkedGroups` agrupar por chave por canal (`CASE WHEN channel='tiktok' THEN description ELSE c_prod END`) em `src/lib/catalog/service.ts`
- [x] T008 [US1] `linkUnlinkedToVariant` aprender/backfill por descrição no TikTok (usa a chave) em `src/lib/catalog/service.ts`
- [x] T009 [US1] Ajustar `unlinked-panel.tsx` para chave de grupo por descrição (TikTok) e tooltip — `src/app/(dashboard)/products/unlinked-panel.tsx`

**Checkpoint**: US1 funcional e testado isoladamente.

---

## Phase 2: Reparo de dados (US2 — P2)

**Goal**: Base existente corrigida — itens TikTok contaminados desvinculados; código genérico removido; descrições corretas aprendidas.

**Independent Test**: `tests/catalog.test.ts` valida a migração `0008` (idempotência + no-op em base limpa).

### Tests for User Story 2 ⚠️

- [x] T010 [P] [US2] Teste de reparo: desvincula TikTok cujo produto não está na descrição e mantém o correto em `tests/catalog.test.ts`
- [x] T011 [P] [US2] Teste de idempotência: rodar o reparo duas vezes não altera nada na 2ª em `tests/catalog.test.ts`

### Implementation for User Story 2

- [x] T012 [US2] Implementar `repairTikTokLinks` em `src/lib/catalog/service.ts`, `repairTikTokLinksAction` em `src/app/actions/catalog.ts` e botão "Reparar vínculos TikTok" em `unlinked-panel.tsx`

**Checkpoint**: US1 e US2 funcionando de forma independente.

---

## Phase 3: Polish & Cross-Cutting

- [ ] T013 [P] Rodar `pnpm test`, `pnpm typecheck`, `pnpm lint:check`
- [ ] T014 Rodar o botão/`repairTikTokLinks` e verificar no banco real (Ash Greninja ~36; Luffy/Sauron/etc. na fila)
- [x] T015 Atualizar `spec.md`/checklists conforme resultados (se aplicável)

**Status de sincronização (2026-09-19)**: US1 e US2 já estão refletidas no código e nos testes
(`src/lib/xml/link.ts`, `src/lib/catalog/service.ts`, `src/app/actions/catalog.ts`,
`src/app/(dashboard)/products/unlinked-panel.tsx`, `tests/xml-link.test.ts`,
`tests/unlinked.test.ts`, `tests/catalog.test.ts`). Ficam pendentes apenas a validação completa
de pipeline e a execução/verificação no banco real.

---

## Dependencies & Execution Order

- US1 (Phase 1) independente; US2 (Phase 2) depende de US1 (regra de "vínculo correto" por descrição) mas testável separadamente.
- Testes antes de implementação (red-green).
- Sequência: T001–T009 → T010–T012 → T013–T015.
