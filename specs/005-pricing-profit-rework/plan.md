# Implementation Plan: Precificação e Apuração de Lucro por Canal

**Branch**: `005-pricing-profit-rework` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação funcional de `specs/005-pricing-profit-rework/spec.md`

**Note**: Plan preenchido pelo `/speckit.plan` a partir da especificação, do research e da constitution.

## Summary

Reformular a **apuração de lucro** (passa a usar o **valor recebido** como verdade — `lucro = recebido −
custo`, com frete lido automaticamente da NFe) e a **precificação** (margem **unificada por produto**,
campo livre; taxa de cada canal como **tabela de faixas** de comissão% + fixa, editável; preço sugerido
por canal calculado por iteração sobre as faixas). Adiciona a **importação dos relatórios** de saldo
(Shopee) e de renda (TikTok) para preencher o recebido por pedido, com conferência manual para
matches ambíguos. Corrige bugs do editor de preço por canal (hooks em loop, unidade de margem, lucro
ignorando taxas) e do importador NFe (custo ignorando quantidade).

## Technical Context

**Language/Version**: TypeScript (Node.js LTS 22) no servidor; app Next.js.

**Primary Dependencies**: Next.js (App Router fullstack + Server Actions), Drizzle ORM +
better-sqlite3, Tailwind CSS + ShadCN/UI (Radix), Biome, Vitest + Testing Library. Leitura de
relatórios xlsx/csv sem dependência pesada: parse via `xlsx` (SheetJS) ou zip+xml próprio; decidido no
research.

**Storage**: SQLite — arquivo local único. Migrações versionadas via `drizzle-kit`.

**Testing**: Vitest (unit do motor de lucro/preço, tabela de faixas, iteração, parsing de relatórios,
match), testes de importação NFe com fixtures (frete, quantidade) e testes de relatórios com fixtures
xlsx/csv.

**Target Platform**: Navegador local (localhost); acessível de celular na mesma rede.

**Project Type**: Web application fullstack (Next.js), single-user, sem login.

**Performance Goals**: preço sugerido por iteração < 10ms; parse de relatório de até ~mil linhas
< 1s; recálculo de lucro por venda imediato.

**Constraints**: local-first e offline; dinheiro em centavos inteiros; venda passada imutável (custo
congelado; recebido editável, mas rastreado); o valor bruto da nota (`vNF`) é imutável; canal
presencial preservado (recebido digitado); dados de teste podem ser migrados/recriados.

**Scale/Scope**: 1 usuário, dezenas de produtos, poucos milhares de vendas. SQLite comporta.

## Constitution Check

*GATE: passa — o design cumpre os cinco princípios:*
- **I (Integridade dos Dados Financeiros)** — o lucro passa a derivar do **recebido** (verdade), nunca
  inventado; bruto da nota imutável; custo congelado por item × quantidade; recebido editável é rastreado.
- **II (Simplicidade Local / Single-User)** — local, SQLite, sem infra extra; parser de relatório é
  domínio puro, não integração de sistema.
- **III (Modelo de Dinheiro Verificável)** — centavos inteiros; lucro traça de volta ao recebido e ao
  custo; taxa é derivada (bruto − frete − recebido), rastreável.
- **IV (Testes no Pipeline de Importação)** — importador NFe (frete, quantidade) e importador de
  relatórios (parse, match) exigem testes antes de serem confiáveis (red-green-refactor).
- **V (Stack Tipada)** — TypeScript/Next/Drizzle/Biome; migrações versionadas para reformular o schema.

Sem violações a justificar → sem Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-pricing-profit-rework/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 (/speckit.plan)
├── data-model.md        # Fase 1 (/speckit.plan)
├── quickstart.md        # Fase 1 (/speckit.plan)
├── contracts/
│   ├── profit-engine.md # Contrato de lucro/taxa/frete
│   └── pricing-engine.md# Contrato do preço sugerido por faixas
├── spec.md              # Especificação funcional (/speckit.specify)
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Fase 2 (/speckit.tasks - NÃO criado por /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── domain/
│   │   ├── cxmoney.ts        # lucro = recebido − custo; taxa derivada (novos helpers)
│   │   ├── pricing.ts        # faixas de taxa + preço sugerido por iteração
│   │   └── fees.ts           # helpers de faixa (percentToBps, tier lookup)
│   ├── xml/
│   │   ├── parser.ts         # extrai vFrete
│   │   └── importer.ts       # totalCost × qtd; produto = bruto − frete; recebido; lucro
│   ├── catalog/service.ts    # usa margem do produto + faixas
│   ├── sales/service.ts      # presencial com recebido; lucro = recebido − custo
│   ├── reports/              # NOVO: parser + match de relatórios
│   │   ├── shopee.ts         # relatório de saldo (xlsx/csv)
│   │   ├── tiktok.ts         # income, aba Detalhes do pedido (xlsx/csv)
│   │   └── match.ts          # cruza NFe ↔ relatório; fila de conferência
│   └── db/
│       ├── schema.ts         # margin_bps, freight_cents, received_cents, channel_fee_tiers
│       └── migrations/       # migração 0006
├── app/actions/
│   ├── catalog.ts            # upsert usa margem do produto + faixas
│   └── reports.ts            # NOVO: importa relatório
└── app/(dashboard)/
    ├── products/             # editor com margem do produto + faixas (fix hooks/units)
    └── sales/                # import de relatórios + campo recebido
```

**Structure Decision**: single Next.js fullstack project (Default), domínio puro em `src/lib/domain`,
persistência em `src/lib/db`, serviços em `src/lib/{catalog,sales,xml,reports}`, Server Actions em
`src/app/actions`, UI em `src/app/(dashboard)`. Padrão já estabelecido nas features 002–004.

## Complexity Tracking

Nenhuma violação — o desenho segue a arquitetura existente sem novas camadas.