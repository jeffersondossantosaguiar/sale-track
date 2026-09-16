# Quickstart — Controle de Vendas MEI (sale-track)

Guia de validação ponta a ponta. **Fase 1 do /speckit.plan**; cenários reais, sem detalhe de
implementação. Referencia contratos e modelo de dados em vez de duplicar.

## Pré-requisitos
- Node.js LTS 22+ instalado.
- Repositório clonado (`git clone` + `npm install` + `npm run db:migrate`).
- XMLs de exemplo (fictícios em `tests/fixtures/xml/`).

## Cenário de validação rápida (prova o fluxo completo)

Navegação: **Dashboard** (`/`), **Vendas** (`/sales`), **Produtos** (`/products`), **Caixa** (`/cash`).

1. **Iniciar**: `npm run dev` → abrir `http://localhost:3000` (cai no Dashboard).
2. **Cadastrar produto** (Produtos): nome "Porta-chaves Dragão", preço R$ 25,00, custo est. R$ 5,00,
   código `PC-DRAG` (canal Shopee). Salvar; conferir margem 80%.
3. **Importar XMLs** (Vendas): arrastar os XMLs fictícios de teste (um padrão Shopee `..._invoice_file_...`,
   um TikTok `<nº>.xml`) → conferir que o canal foi **detectado**; confirmar o lote.
4. **Confirmar vendas**: 2 vendas criadas, valor bruto e itens corretos, sem linhas órfãs.
5. **Dedup**: reenviar o mesmo arquivo Shopee → aviso "nota já importada", nada duplicado.
6. **Estornar venda** (Vendas, lista abaixo das taxas): estornar a venda TikTok → ela sai do
   faturamento/mês e do dashboard; se a venda tiver entrado no caixa (presencial), entra um
   reembolso no caixa na data do estorno.
7. **Taxas/líquido** (Vendas): configurar a % padrão da Shopee em "Taxa padrão por canal" →
   novas importações já nascem com a taxa; editar a taxa de uma venda específica e ver o
   líquido recalcular (bruto nunca muda).
8. **Caixa** (`/cash`): lançar as entradas/saídas por categoria (ex.: gasto de filamento) e
   conferir saldo e gasto por categoria; usar o estorno de lançamento quando precisar corrigir.
9. **Dashboard** (`/`): conferir faturamento do mês, % do teto MEI usado (barra configurável) e
   vendas por canal; trocar o mês pelo seletor.
10. **Extrato**: abrir `http://localhost:3000/api/export?m=AAAA-MM` para baixar o CSV mensal
   (faturamento por tipo + caixa) usado como base da DASN-SIMEI.

## Critérios de sucesso medíveis (fonte: spec.md)
- Importação de um mês em **< 10 min** com zero digitação por venda.
- **0 duplicatas**; reenvio nunca gera venda nova.
- Faturamento MEI (bruto) e caixa (líquido+taxa) **exibidos separados**, conferíveis com o
  painel do marketplace.
- Resposta "quanto do teto MEI já usei" em **< 60 s** (Dashboard).
- Extrato mensal exportável usado como base da DASN-SIMEI.

## Contratos e modelo
- Importação XML: [contracts/xml-import.md](./contracts/xml-import.md)
- Entidades: [data-model.md](./data-model.md)
- Guia diário de uso (dono): [../../docs/guia-mei.md](../../docs/guia-mei.md)