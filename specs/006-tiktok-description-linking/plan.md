# Implementation Plan: Vínculo de Itens TikTok por Descrição

**Branch**: `006-tiktok-description-linking` | **Date**: 2026-09-17 | **Spec**: `specs/006-tiktok-description-linking/spec.md`

**Input**: Feature specification from `/specs/006-tiktok-description-linking/spec.md`

## Summary

Itens do TikTok usam um código genérico `'Padrao'` no `cProd`, então o vínculo por `cProd` (`linkCProd`) colapsa todos os itens num único grupo e contamina a contagem de vendas (ex.: Ash Greninja = 54 no lugar de ~46). A correção tem duas partes:

1. **Vincular TikTok por descrição**: a chave de vínculo passa a ser por canal — `description` para TikTok, `cProd` para Shopee/presencial/geral. A fila sem vínculo agrupa o TikTok por descrição; o vínculo manual/backfill e o "aprender" usam a descrição.
2. **Reparar dados**: **Server Action explícita** (`repairTikTokLinksAction`) + botão no painel "Fila de códigos sem vínculo" — desvincular itens TikTok cujo produto vinculado não consta na descrição, remover o código genérico aprendido `('Padrao','tiktok')`, e registrar um código por descrição para os mantidos. Sem mudança de schema (sem migração); idempotente e alinhado ao §I (retificação explícita).

## Technical Context

**Language/Version**: TypeScript, Node ≥22

**Primary Dependencies**: Next.js 16 (App Router + Server Actions), Drizzle ORM + better-sqlite3, Zod

**Storage**: SQLite local (single-user), migrações versionadas em `src/lib/db/migrations`

**Testing**: Vitest (red-green-refactor)

**Target Platform**: Web local (Next.js)

**Project Type**: Aplicação web fullstack (local, single-user)

**Performance Goals**: N/A (single-user local; agrupamento da fila já em SQL)

**Constraints**: Números financeiros em centavos inteiros; NFe imutável; custo congelado na venda (D6); migrações versionadas (V)

**Scale/Scope**: Poucos produtos/itens; reparo idempotente e no-op em base limpa

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§IV Testes obrigatórios no pipeline de importação** (NON-NEGOTIABLE): a mudança no casamento de itens (por descrição no TikTok) exige testes red-green antes de ser confiável. **Atende**: testes novos em `xml-link`, `unlinked` e `catalog`.
- **§I Integridade dos dados financeiros**: o reparo não altera valores silenciosamente; desvincula itens explicitamente e preserva `frozen_cost_cents` (D6). **Atende**: reparo idempotente, sem tocar custo já congelado.
- **§V Migrações versionadas**: qualquer mudança de schema só via migração. Esta feature **não altera schema** (reparo é ação em runtime; única mudança de validação é o limite de `product_codes.code` 60→255, sem DDL). **Atende**.
- **§II Simplicidade local**: solução reutiliza o modelo existente (`product_codes`, chave de vínculo), sem nova infra. **Atende**.

Sem violações. Complexidade Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/006-tiktok-description-linking/
├── plan.md              # este arquivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── xml/link.ts               # chave de vínculo por canal (cProd vs description)
│   ├── catalog/service.ts        # fila sem vínculo + linkUnlinkedToVariant + repairTikTokLinks (TikTok)
│   └── domain/catalog.ts         # limite product_codes.code 60 → 255
├── app/(dashboard)/products/unlinked-panel.tsx  # agrupamento por descrição + botão de reparo
└── app/actions/catalog.ts        # linkUnlinked + repairTikTokLinksAction

tests/
├── xml-link.test.ts              # chave por canal
├── unlinked.test.ts              # agrupamento/backfill por descrição (TikTok)
└── catalog.test.ts               # repairTikTokLinks idempotente
```

**Structure Decision**: Estrutura existente do monorepo (aplicação Next.js única). A mudança fica em `src/lib/xml/link.ts`, `src/lib/catalog/service.ts` e na migração de dados; UI mínima em `unlinked-panel.tsx`.

## Complexity Tracking

N/A (sem violações de constitution).