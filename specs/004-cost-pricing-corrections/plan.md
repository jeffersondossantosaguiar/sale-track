# Implementation Plan: Correções no Motor de Custo e Precificação

**Branch**: `004-cost-pricing-corrections` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação funcional de `specs/004-cost-pricing-corrections/spec.md`

## Summary

Corrigir o motor de custo/precificação para refletir o uso real: **mão de obra = só tempo manual**
(impressão é trabalho da máquina), **Energia e Máquina em linhas separadas** com energia derivada do
kWh real (R$ 0,88), **taxa de canal % gravada como bps** (corrigindo valores existentes 20→2000 /
16→1600) e **parâmetros globais que recarregam e propagam** (`recalcAllCosts`). Ajustar dados de
produção (`kwh=88`, `labor=1289`) e recalcular as variantes existentes.

## Technical Context

**Language/Version**: TypeScript (Node.js LTS 22) no servidor; app Next.js.

**Primary Dependencies**: Next.js (App Router + Server Actions), Drizzle ORM + better-sqlite3,
Tailwind CSS, Biome, Vitest.

**Storage**: SQLite (fonte de verdade). Migração de **dados** em `settings` (sem mudança de schema).

**Testing**: Vitest (unit do motor de custo/preço em centavos) — red-green-refactor para a nova
fórmula (constitution §III).

**Target Platform**: Navegador local (localhost).

**Project Type**: Web application fullstack (Next.js), single-user, sem login.

**Performance Goals**: recálculo de custo em tempo real (< 100ms); `recalcAllCosts` sob demanda.

**Constraints**: local-first/offline; dinheiro em centavos inteiros; `practicedPriceCents` imutável
(FR-011); custos congelados em vendas passadas intactos (D6); presencial fora do escopo.

**Scale/Scope**: 1 usuário, dezenas de produtos.

## Constitution Check

*GATE: passa — o design cumpre os cinco princípios:*
- **I (Integridade dos Dados Financeiros)** — preço praticado intocável; custos congelados não mudam. ✓
- **II (Simplicidade Local / Single-User)** — local, SQLite, domínio puro. ✓
- **III (Modelo de Dinheiro Verificável)** — centavos inteiros; motor corrigido e coberto por unit tests. ✓
- **IV (Testes no Pipeline de Importação)** — não há mudança no pipeline de import; apenas motor e
  dados. ✓
- **V (Stack Tipada)** — TypeScript/Next/Drizzle/Biome; migração de dados versionada. ✓

Sem violações a justificar → sem Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-cost-pricing-corrections/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 (decisões do grill + investigação)
├── data-model.md        # Fase 1 (settings/detalhamento; sem schema novo)
├── quickstart.md        # Fase 1
├── contracts/
│   └── pricing-engine.md# Delta 004 (canônico em specs/002, atualizado)
├── spec.md              # Especificação funcional (/speckit.specify)
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── actions/
│   │   ├── catalog.ts        # setGlobalParams → recalcAllCosts
│   │   └── sales-fees.ts     # setChannelFeeFrom: % → bps (×100)
│   └── (dashboard)/
│       ├── settings/pricing/page.tsx           # passa valores iniciais ao painel
│       ├── settings/pricing/global-params-panel.tsx  # carrega valores salvos
│       └── products/products-panel.tsx         # detalhamento Energia + Máquina
├── lib/
│   ├── db/
│   │   ├── migrations/0005_*.sql               # correção de settings (dados)
│   │   └── recalc-costs.ts                     # recálculo inicial das variantes
│   └── domain/
│       ├── cost.ts                             # labor = só manual; split energia/máquina
│       ├── printer.ts                          # energyPerHour / machinePerHour separados
│       └── pricing.ts                          # (inalterado)
└── tests/
    ├── cost.test.ts                            # novo (red-green)
    ├── pricing.test.ts                         # ajustado
    └── fees.test.ts                            # % → bps
```

**Structure Decision**: domínios puros em `src/lib/domain/` (centavos inteiros), testáveis com Vitest.
Correção de dados via migração SQL versionada + script de recálculo.

## Complexity Tracking

*Nenhuma violação da Constitution Check a justificar — tabela vazia.*