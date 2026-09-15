# Research — Controle de Vendas MEI (sale-track)

**Fase 0 do /speckit.plan** — resolve incertezas levantadas no planejamento ao contexto do
domínio.

## Decisões consolidadas

### D1 — Teto de faturamento do MEI (configurável)
**Decisão**: padrão R$ 81.000/ano (MEI), configurável pelo usuário.
**Rationale**: teto vigente em 2026; há propostas em tramitação (R$ 130–145 mil) que podem
virar lei. O teto não pode ser constante fixa no código.
**Contexto legal**: Nota emitida para venda de mercadoria usa **NFe modelo 55** (padrão
nacional único). Venda a PF presencial **não exige nota** no MEI hoje, mas conta no
faturamento (DASN-SIMEI).

### D2 — Canal detectado por padrão de nome de arquivo, confirmado pelo usuário
**Decisão**: o sistema sugere o canal pelo padrão do nome do arquivo; o usuário confirma/ajusta
por lote antes de importar.
**Rationale**: padrões observados — Shopee (`..._invoice_file_<n>_<uuid>.xml`, `_invoice_file_`).
TikTok (`<nº>.xml` com ~13 dígitos). Nome de arquivo é sinal, não garantia; fica editável.

### D3 — Venda = pedido = 1 nota
**Decisão**: uma venda = um XML = um número de nota. Dois pedidos do mesmo cliente = duas
vendas. 2 itens num pedido = 1 venda com 2 linhas. Presencial = venda sem nota, lançada à mão.

### D4 — Deduplicação por número de nota
**Decisão**: chave única = nº + série + data da nota; reimportar o mesmo XML nunca duplica. O
XML bruto é guardado para re-vinculação e auditoria.

### D5 — Marketplace: taxa e líquido separados do faturamento
**Decisão**: faturamento (MEI/DASN) usa o valor bruto da nota. O **caixa** controla o dinheiro
real (taxas retidas e repasses). A taxa chega pré-preenchida por canal (regra configurável) e
**editável por venda** usando o detalhamento real do painel. `líquido = bruto − taxa` exibido
por venda/relatório.

### D6 — Custo congelado na venda
**Decisão**: cada venda guarda o custo vigente do produto no dia da venda. Alterar custo/preço
posterior não muda vendas passadas (a NFe não muda). Botão "aplicar custo atual às vendas sem
custo" preenche só as que nunca tiveram custo.

### D7 — Estorno = status, não exclusão
**Decisão**: estorno tem data própria, remove a venda do faturamento, zera o líquido e sugere
lançamento de reembolso no caixa. Nada de apagar registro.

### D8 — Caixa (lançamentos com categoria)
**Decisão**: entradas/saídas com data, tipo, categoria (taxas, filamento, energia, manutenção,
embalagem, outros), valor, descrição e vínculo opcional a venda. Saldo = entradas − saídas.
Separado do faturamento (D1/D5).

### D9 — Stack / arquitetura
**Decisão**: Next.js (Node LTS) fullstack + SQLite (Drizzle + better-sqlite3) + parse XML em
Web Worker + Tailwind/ShadCN + Biome. Local, single-user, sem login.
**Rationale**: simplicidade operacional (1 processo, 1 comando), caminho de evolução claro
(APIs de marketplace futuras como Next Route Handlers/Server Actions), stack tipada conforme
constitution V.

## Verificações de ambiente
- Node v24.19.0 disponível; Node 22 LTS compatível; SQLite nativo sem serviços externos.
- `bun` não está instalado → usar Node LTS conforme constitution.

## Riscos / limites assumidos
- NFS-e (serviço) fora de escopo; apenas NFe 55 (mercadoria) — validar na implementação.
- Taxas do marketplace variam (percentual + fixo, cupons, parcelamento, estorno); o valor por
  venda é a fonte verdade, preenchida manualmente.
- Teto MEI pode mudar por lei (2026–2028) → parametrizável.
- Sem integração com APIs nas duas primeiras fases (fase futura via Route Handlers).
