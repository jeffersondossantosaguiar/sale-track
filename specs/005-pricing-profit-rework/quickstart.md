# Quickstart — Precificação e Apuração de Lucro por Canal

**Feature**: `005-pricing-profit-rework` | Guia de validação de ponta a ponta.

Pré-requisitos: Node.js + pnpm; banco migrado/seedado (`pnpm db:migrate && pnpm db:seed`); app local
(`pnpm dev`).

## Setup

```bash
pnpm install
pnpm db:migrate       # aplica migrações (inclui 0006)
pnpm db:seed          # seeds (inclui faixas Shopee/TikTok e margem default)
pnpm dev
```

## Cenários de validação

### 1. Lucro = recebido − custo (US1)
1. Importe a NFe `2609167NCGVX7X...xml` (Shopee). Conferir:
   - `bruto` = R$156,49; `frete` = R$23,87 (lido do `vFrete`).
   - 3 linhas de item; a linha dos 2 aparadores tem `quantity = 2`.
2. Informe `recebido` = R$110,00. Conferir:
   - `taxa` derivada = `(156,49 − 23,87) − 110,00` = R$22,62 (somente-leitura).
   - `lucro` = `110,00 − Σ(custo × quantidade)`.
3. Deixe uma venda sem `recebido`: o lucro fica **pendente** (não exibe número); estimativa por faixa
   (se houver) aparece à parte marcada.

### 2. Precificação com margem unificada + faixas (US2)
1. Cadastre um produto com margem 30% (campo livre). Conferir que o preço sugerido de Shopee e TikTok
   usam essa margem.
2. Abra Configurações → Taxas por canal. Digite faixas (ex.: `<= 79,99 = 20% + 4`); conferir prévia em
   linhas estruturadas e validação (faixas sobrepostas são rejeitadas).
3. Altere uma faixa ou o custo: o **sugerido** recalcula; o **praticado** não muda.
4. Teste comissão+margem ≥ 100% → erro claro, nada gravado.

### 3. Importação de relatórios (US3)
1. Suba o relatório de saldo do Shopee (xlsx). Conferir que o `recebido` de cada pedido é preenchido
   pelo valor do relatório, casado pelo **ID do pedido** no nome da NFe (ex.: `260907C6P2FS35 → 11,17`).
2. Suba o income do TikTok (xlsx, aba "Detalhes do pedido"). Conferir que o recebido por pedido é
   preenchido (produto/SKU + data + quantidade + valor coerente), somando ao extrato diário.
3. Vendas sem match confiável entram na **fila de conferência manual**; confirme/ajuste o recebido.
4. Edite manualmente um `recebido` e confira que lucro/taxa recalculam.

## Comandos de teste

```bash
pnpm test                 # vitest run (unit + fixtures)
pnpm typecheck            # tsc --noEmit
pnpm lint:check           # biome check
```

## Critérios de aceite (resumo)
- Lucro de venda com recebido = recebido − custo (× quantidade).
- Frete automático da NFe; bruto imutável.
- Preço sugerido por produto+faixas, praticado intocável.
- Importação de relatórios preenche recebido (≥ 90% alta confiança); ambíguos → conferência.
- Venda sem recebido → lucro pendente, nunca inventado.