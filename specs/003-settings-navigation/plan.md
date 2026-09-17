# Implementation Plan: Seção Configurações com Navegação Lateral

**Branch**: `003-settings-navigation` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação funcional de `specs/003-settings-navigation/spec.md`

**Note**: Plan preenchido pelo `/speckit.plan` a partir da especificação e da constitution.

## Summary

Reorganizar a navegação do app: substituir a **barra de navegação superior** por um **menu lateral**
(sidebar) com item expansível **Configurações** (accordion). Consolidar sob `/settings` os parâmetros
que hoje estão espalhados: **precificação** (parâmetros globais + materiais, vindos de Produtos),
**impressoras** (rota própria, separada da precificação), **taxas por canal** (só a configuração da
taxa padrão, vinda de Vendas) e **teto MEI** (edição movida do Dashboard). O Dashboard mantém o teto
em **leitura pura** (barra + % + "X de Y"). Nenhuma lógica de domínio ou schema muda — apenas UI,
rotas e `revalidatePath`.

## Technical Context

**Language/Version**: TypeScript (Node.js LTS 22) no servidor; app Next.js.

**Primary Dependencies**: Next.js (App Router fullstack + Server Actions), Tailwind CSS + ShadCN/UI
(Radix), Biome, Vitest + Testing Library.

**Storage**: SQLite — **sem migração** nesta feature (não altera schema).

**Testing**: RTL/component para o menu lateral (accordion, item ativo, drawer mobile) e testes
existentes garantindo que não há regressão. Nenhum teste de domínio novo (domínio não muda).

**Target Platform**: Navegador local (localhost); acessível de celular na mesma rede Wi-Fi (daí o
drawer mobile).

**Project Type**: Web application fullstack (Next.js), single-user, sem login.

**Performance Goals**: navegação entre rotas sem recarregamento perceptível; sidebar leve.

**Constraints**: local-first; sem mudança de schema/domínio; a config de taxa padrão sai de Vendas
mas o resumo+lista operacional permanece lá; teto MEI read-only no Dashboard; dinheiro em centavos.

**Scale/Scope**: 1 usuário; reorganização de UI/rotas — baixo risco de dados.

## Constitution Check

*GATE: passa — o design cumpre os cinco princípios:*
- **I (Integridade dos Dados Financeiros)** — nenhum número financeiro é alterado; as actions de
  escrita são as mesmas, apenas com `revalidatePath` novo. ✓
- **II (Simplicidade Local / Single-User)** — reorganização de UI sem infra extra; não adiciona
  complexidade de negócio. ✓
- **III (Modelo de Dinheiro Verificável)** — domínio e centavos intactos; movimentação só de UI. ✓
- **IV (Testes no Pipeline de Importação)** — não toca no pipeline; testes existentes cobrem. ✓
- **V (Stack Tipada)** — TypeScript/Next/Biome; `biome check` + typecheck obrigatórios. ✓

Sem violações a justificar → sem Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-settings-navigation/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 (/speckit.plan)
├── data-model.md        # Fase 1 (/speckit.plan — reutiliza entidades existentes)
├── quickstart.md        # Fase 1 (/speckit.plan)
├── spec.md              # Especificação funcional (/speckit.specify)
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # header top → sidebar (fixa desktop + drawer mobile)
│   │   ├── sidebar.tsx             # (novo) menu lateral com accordion Configurações
│   │   ├── page.tsx                # dashboard: teto MEI read-only (remover TetoForm)
│   │   ├── products/
│   │   │   ├── page.tsx            # remove <PricingSettingsPanel>
│   │   │   └── pricing-settings-panel.tsx  # DELETADO (substituído pelos painéis de /settings)
│   │   ├── sales/
│   │   │   └── taxes-panel.tsx     # remove bloco de config de taxa (mantém resumo+lista)
│   │   └── settings/               # (novo grupo)
│   │       ├── page.tsx            # index (redireciona para /settings/pricing)
│   │       ├── pricing/page.tsx    # GlobalParamsPanel + MaterialsPanel
│   │       ├── pricing/global-params-panel.tsx
│   │       ├── pricing/materials-panel.tsx
│   │       ├── printers/page.tsx   # PrintersPanel
│   │       ├── printers/printers-panel.tsx
│   │       ├── sales-channels/page.tsx      # ChannelFeesPanel
│   │       ├── sales-channels/channel-fees-panel.tsx
│   │       └── mei/page.tsx        # TetoForm (movido de teto-form.tsx)
│   ├── actions/
│   │   ├── catalog.ts              # revalidatePath → /settings/*
│   │   └── sales-fees.ts           # setChannelFeeFrom revalidatePath → /settings/sales-channels
│   └── ...
```

**Structure Decision**: grupo `(dashboard)/settings/` com uma página por bloco de configuração. O
menu lateral é um componente cliente (`sidebar.tsx`) que lê `usePathname` para destacar o item ativo
e auto-abrir o accordion em `/settings/*`. Drawer mobile via estado + overlay. Reaproveita todas as
server actions existentes.

## Complexity Tracking

*Nenhuma violação da Constitution Check a justificar — tabela vazia.*