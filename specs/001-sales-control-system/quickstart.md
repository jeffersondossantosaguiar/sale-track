# Quickstart — Controle de Vendas MEI (sale-track)

Guia de validação ponta a ponta. **Fase 1 do /speckit.plan**; cenários reais, sem detalhe de
implementação. Referencia contratos e modelo de dados em vez de duplicar.

## Pré-requisitos
- Node.js LTS 22+ instalado.
- Repositório clonado (`git clone` + `npm install` + `npm run db:migrate`).
- XMLs de exemplo (fictícios em `tests/fixtures/xml/`).

## Cenário de validação rápida (prova o fluxo completo)

1. **Iniciar**: `npm run dev` → abrir `http://localhost:3000`.
2. **Cadastrar produto**: nome "Porta-chaves Dragão", preço R$ 25,00, custo est. R$ 5,00,
   código `PC-DRAG`. Salvar; conferir margem 80%.
3. **Importar XMLs**: arrastar os XMLs fictícios de teste (um padrão Shopee `..._invoice_file_...`,
   um TikTok `<nº>.xml`) → conferir que o canal foi **detectado**; confirmar o lote.
4. **Confirmar vendas**: 2 vendas criadas, valor bruto e itens corretos, sem linhas órfãs.
5. **Dedup**: reenviar o mesmo arquivo Shopee → aviso "já importado", nada duplicado.
6. **Estornar**: estornar a venda TikTok → some do faturamento do mês; sugerido saída de caixa.
7. **Caixa**: lançar a taxa real da Shopee (entrada líquida) e um gasto de filamento
   (categoria filamento) → saldo e gasto por categoria batem.
8. **Dashboard**: conferir faturamento do mês, % do teto MEI usado e vendas por canal.

## Critérios de sucesso medíveis (fonte: spec.md)
- Importação de um mês em **< 10 min** com zero digitação por venda.
- **0 duplicatas**; reenvio nunca gera venda nova.
- Faturamento MEI (bruto) e caixa (líquido+taxa) **exibidos separados**, conferíveis com o
  painel do marketplace.
- Resposta "quanto do teto MEI já usei" em **< 60 s**.
- Extrato mensal exportável usado como base da DASN-SIMEI.

## Contratos e modelo
- Importação XML: [contracts/xml-import.md](./contracts/xml-import.md)
- Entidades: [data-model.md](./data-model.md)
