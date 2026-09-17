# Quickstart: Seção Configurações com Navegação Lateral

**Feature**: `003-settings-navigation` | **Date**: 2026-09-17

## Setup

1. `pnpm install`
2. `pnpm dev` (ou comando padrão do projeto)

## Validação ponta a ponta

### 1. Menu lateral (US1)

1. Abrir o app → o menu lateral aparece com Dashboard, Vendas, Produtos, Caixa e Configurações.
2. Clicar em **Configurações** → expande para Precificação, Impressoras, Taxas por canal, Teto MEI.
3. Clicar em **Precificação** → a rota é `/settings/pricing` e o item fica destacado.
4. Em janela estreita, o menu vira hambúrguer; abrir e fechar o drawer.

### 2. Precificação (US2)

1. Em `/settings/pricing`, alterar R$/kWh, horas/semana e mão de obra; salvar.
2. Adicionar/editar/remover um material de filamento.
3. Conferir que o custo das variantes em `/products` acompanha.

### 3. Impressoras (US3)

1. Em `/settings/printers`, cadastrar 2 impressoras, editar uma, remover outra.
2. Conferir que o custo/hora global usa a impressora mais cara (via custo das variantes).

### 4. Taxas por canal (US4)

1. Em `/settings/sales-channels`, alterar a % e a taxa fixa de um canal.
2. Conferir que em `/sales` o resumo por canal reflete e a lista operacional permanece (sem edição de
   taxa padrão ali).

### 5. Teto MEI (US5)

1. Em `/settings/mei`, alterar o teto e salvar.
2. No Dashboard, conferir a % atualizada na barra, sem input de edição (leitura).

## Critérios de sucesso

- Navegar para qualquer rota de Configurações em ≤ 2 cliques.
- Edição de precificação/impressoras/taxas/teto funciona como antes (sem perda).
- Resumo+lista de Vendas intactos.
- `biome check` + typecheck + testes passam; nenhuma migração de schema.