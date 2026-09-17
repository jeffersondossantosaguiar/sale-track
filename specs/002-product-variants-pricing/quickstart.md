# Quickstart — Catálogo com Variantes e Precificação por Canal

Guia de validação ponta a ponta. **Fase 1 do /speckit.plan**; cenários reais, sem detalhe de
implementação. Referencia contratos e modelo de dados em vez de duplicar.

## Pré-requisitos
- Node.js LTS 22+ instalado.
- Repositório clonado (`npm install` + `npm run db:migrate`).
- NFes reais de Shopee/TikTok com múltiplos itens/variantes para validar o vínculo (ou fixtures em
  `tests/fixtures/xml/`).

## Configuração inicial
1. **Parâmetros globais** (Produtos → Precificação): tarifa de energia (R$/kWh), horas/semana, custo
   de mão de obra (R$/hora).
2. **Impressoras**: cadastrar 2 impressoras (aquisição, vida útil, consumo W, manutenção).
3. **Materiais**: cadastrar "PLA Preto" com preço por kg.
4. **Taxas por canal**: confirmar taxa fixa e percentual de Shopee e TikTok.

## Cenário de validação rápida (prova o fluxo completo)

Navegação: **Dashboard** (`/`), **Produtos** (`/products`).

1. **Iniciar**: `npm run dev` → abrir `http://localhost:3000`.
2. **Cadastrar produto com variantes** (Produtos): produto "Porta-chaves Dragão" com 2 variantes —
   "Preto" (peso 100g, PLA Preto, tempo 120min) e "Kit Preto+Argola" (mesmo + acessório "argola"
   R$ 0,50). Conferir que cada uma gerou SKU único e o produto simples gera 1 variante default.
3. **Conferir o detalhamento de custo**: para a variante "Preto", conferir as linhas filamento,
   energia+máquina, mão de obra (destacada), embalagem e acessórios; somam no custo total igual à
   planilha do dono.
4. **Preço por canal** (Shopee/TikTok): definir margem por canal; conferir o preço sugerido de cada
   canal conforme o contrato; ajustar o preço praticado.
5. **Congelar praticado**: mudar o preço do material ou um parâmetro global → o sugerido recalcula,
   o praticado **não** muda.
6. **Importar NFes** (Vendas): importar NFes reais de Shopee/TikTok com múltiplos itens → conferir
   que o vínculo casou na **variante** e que cada item congelou o custo da variante vigente.
7. **Imutabilidade**: editar o custo de uma variante já vendida → a margem da venda passada não muda.
8. **SKU duplicado**: tentar reutilizar um SKU → o sistema recusa.
9. **Sem vínculo**: item importado sem variante correspondente → entra na lista de códigos sem
   vínculo (fluxo atual preservado).

## Critérios de sucesso medíveis (fonte: spec.md)
- Cadastro de produto com variantes em **< 2 min**.
- Custo e detalhamento por linha conferem com a planilha, **0 divergência**.
- Preço sugerido confere com `(custo + taxa_fixa) / (1 − taxa% − margem%)` em **100%** dos casos.
- Preço praticado permanece inalterado após mudanças de custo/margem/taxa (teste automatizado).
- Importação vincula itens e congela custos na granularidade de variante com a mesma taxa de acerto
  do modelo anterior.

## Contratos e modelo
- Motor de custo/preço: [contracts/pricing-engine.md](./contracts/pricing-engine.md)
- Entidades: [data-model.md](./data-model.md)