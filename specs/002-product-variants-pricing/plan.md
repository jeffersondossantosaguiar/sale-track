# Implementation Plan: Catálogo com Variantes e Precificação por Canal

**Branch**: `002-product-variants-pricing` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação funcional de `specs/002-product-variants-pricing/spec.md`

**Note**: Plan preenchido pelo `/speckit.plan` a partir da especificação e da constitution.

## Summary

Evoluir o cadastro de produtos para o modelo **Produto → Variante** (SKU único, insumos de custo por
linha) e adicionar um **motor de custo/precificação** que calcula o custo de cada variante
(filamento + energia/máquina + mão de obra + embalagem + acessórios) e o **preço sugerido por canal**
(Shopee/TikTok) a partir do custo, das taxas do canal (fixa + percentual) e de uma margem por canal.
O preço **praticado** é decisão do dono e fica congelado (o sugerido é só ajuda). Vendas/importação
passam a operar na granularidade de variante, mantendo a integridade financeira e a imutabilidade do
custo congelado.

## Technical Context

**Language/Version**: TypeScript (Node.js LTS 22) no servidor; app Next.js.

**Primary Dependencies**: Next.js (App Router fullstack + Server Actions), Drizzle ORM +
better-sqlite3, Tailwind CSS + ShadCN/UI (Radix), Biome, Vitest + Testing Library + Playwright.

**Storage**: SQLite — arquivo local único (fonte de verdade). Migrações versionadas via
`drizzle-kit`.

**Testing**: Vitest (unit do motor de custo/preço em centavos, validação de SKU único, migração dos
vínculos) + RTL (formulário de variantes/precificação) + testes de importação com NFes de fixture
validando o vínculo na granularidade de variante (constitution §IV aplicado ao pipeline que muda).

**Target Platform**: Navegador local (localhost); acessível de celular na mesma rede Wi-Fi.

**Project Type**: Web application fullstack (Next.js), single-user, sem login.

**Performance Goals**: recalcular custo de uma variante em tempo real no formulário (< 100ms);
catálogo lista sem atraso perceptível.

**Constraints**: local-first e offline; sem contas/credenciais; dinheiro em centavos inteiros; vendas
passadas imutáveis (custo congelado); o canal presencial fica **fora do escopo** (comportamento atual
preservado); dados de teste podem ser migrados/recriados.

**Scale/Scope**: 1 usuário, dezenas de produtos, cada um com poucas variantes. SQLite comporta
holgadamente.

## Constitution Check

*GATE: passa — o design cumpre os cinco princípios:*
- **I (Integridade dos Dados Financeiros)** — custo congelado na venda na granularidade de variante;
  preço praticado intocável pelo motor; editar variante/material nunca altera vendas passadas. ✓
- **II (Simplicidade Local / Single-User)** — local, SQLite, sem infra extra; o motor de custo é um
  domínio puro, não uma integração. ✓
- **III (Modelo de Dinheiro Verificável)** — custo e preço em centavos inteiros, rastreáveis linha a
  linha; sugerido deriva de registros (material, taxas, margem), não de chute. ✓
- **IV (Testes no Pipeline de Importação)** — o vínculo cProd → variante e o congelamento do custo da
  variante exigem testes antes de serem confiáveis; motor de custo testado por unit (red-green-refactor). ✓
- **V (Stack Tipada)** — TypeScript/Next/Drizzle/Biome; migrações versionadas para reformular o
  schema. ✓

Sem violações a justificar → sem Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-product-variants-pricing/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 (/speckit.plan)
├── data-model.md        # Fase 1 (/speckit.plan)
├── quickstart.md        # Fase 1 (/speckit.plan)
├── contracts/
│   └── pricing-engine.md# Contrato do motor de custo/preço (/speckit.plan)
├── spec.md              # Especificação funcional (/speckit.specify)
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Fase 2 (/speckit.tasks - NÃO criado por /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/
│   │   └── products/             # Catálogo: produto → variantes (formulário de custo/preço)
│   ├── actions/                  # Server Actions (catalog, pricing, settings, import)
│   └── ...
├── lib/
│   ├── db/
│   │   ├── schema.ts             # products(mod) + variants + materials + variant_prices +
│   │   │                         #   printers + variant_accessories + product_codes(mod) +
│   │   │                         #   sale_items(mod)
│   │   ├── client.ts
│   │   └── migrations/           # migração de reformulação + seed de parâmetros
│   ├── domain/
│   │   ├── cost.ts               # motor de custo (filamento, energia+máquina, mão de obra...)
│   │   ├── pricing.ts            # preço sugerido/praticado por canal
│   │   ├── printer.ts            # deriva R$/hora global (impressora mais cara)
│   │   └── catalog.ts            # zod/schemas de variante, material, SKU único
│   ├── catalog/service.ts        # CRUD produto/variante/material/preço
│   └── xml/link.ts (mod)         # vínculo cProd → variante
└── tests/                        # unit (cost/pricing/printer/link) + RTL + fixtures NFe
```

**Structure Decision**: Next.js fullstack single-process com Server Actions; o motor de custo/preço
são **domínios puros** em `src/lib/domain/` (centavos inteiros), testáveis com Vitest. O schema é
reformulado via migração Drizzle (dados recriáveis). A UI de catálogo passa a editar produto →
variantes com detalhamento de custo e preços por canal.

## Complexity Tracking

*Nenhuma violação da Constitution Check a justificar — tabela vazia.*