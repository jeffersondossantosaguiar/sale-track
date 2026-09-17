# Research: Seção Configurações com Navegação Lateral

**Feature**: `003-settings-navigation` | **Date**: 2026-09-17

## Phase 0 — Knowns / Unknowns

### Knowns

- Stack: Next.js App Router fullstack + Server Actions, Tailwind + ShadCN/UI, Biome, Vitest.
- Navegação atual: header top em `(dashboard)/layout.tsx` com 4 links (Dashboard, Vendas, Produtos,
  Caixa) — sem sidebar e sem submenus.
- `PricingSettingsPanel` em `products/pricing-settings-panel.tsx` agrega parâmetros globais +
  materiais + impressoras; será dividido e movido para `/settings/*`.
- `taxes-panel.tsx` em Vendas agrega (a) config taxa padrão, (b) resumo por canal, (c) lista
  operacional. Só (a) migra.
- `teto-form.tsx` no Dashboard é o único editor do teto MEI; passará a viver em `/settings/mei`.
- Actions reutilizadas: `setGlobalParams`, `create/update/deleteMaterial`, `create/update/deletePrinter`,
  `setChannelFeeFrom`, `setMeiLimitFrom`. Só o `revalidatePath` muda.
- Constitution: `biome check` + typecheck antes de commit; SDD por feature; sem mudança de schema fora
  de migração; dados financeiros imutáveis.

### Unknowns (resolvidos na entrevista de grill-me)

- Escopo de Configurações → consolida tudo (precificação, impressoras, taxas, teto MEI).
- Estrutura de navegação → sidebar lateral com item + submenu (accordion).
- Impressoras → separadas em rota própria (`/settings/printers`).
- Taxas por canal → só a config (a) migra; resumo+lista ficam em Vendas.
- Teto MEI no Dashboard → leitura pura (barra + %), edição em `/settings/mei`.
- Sidebar responsiva → fixa em desktop (`lg:`), drawer/hambúrguer em telas pequenas.
- Sem sub-menu interno nas páginas `/settings/*` — o accordion do sidebar é a navegação.

## Decisions

- **Navegação**: `Sidebar` cliente lê `usePathname` para destacar item ativo e auto-abrir o accordion
  em `/settings/*`. Drawer mobile via estado + overlay.
- **Rotas**: grupo `(dashboard)/settings/` com página por bloco; `/settings` index redireciona para
  `/settings/pricing`.
- **Reutilização**: nenhuma action é recriada; apenas `revalidatePath` ajustado. Nenhuma migração.

## Risks / Mitigations

- **Regressão em Vendas** (taxes-panel) → extrair apenas o bloco (a); testes existentes + validação
  manual do resumo/lista.
- **Perda de funcionalidade ao dividir pricing panel** → extrair componentes mantendo as mesmas
  actions e estados; validar US2/US3 isoladamente.
- **Sidebar mobile** → drawer com overlay e fechamento ao clicar fora/selecionar.