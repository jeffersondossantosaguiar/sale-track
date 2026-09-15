# Data Model — Controle de Vendas MEI (sale-track)

**Fase 1 do /speckit.plan** — entidades e relações derivadas da especificação (FR-001..FR-015).

> Dinheiro é armazenado em **centavos inteiros** (integers). Não há ponto flutuante.

## Entidades

### Product (`products`)
Catálogo de produtos do dono. Fonte de preço/custo para novas vendas.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | autogerado |
| name | text | nome exibido |
| category | text | impressão/categoria |
| salePriceCents | integer | preço de venda (atual) |
| estimatedCostCents | integer | custo estimado atual (filamento+energia) |
| active | boolean | p/ ocultar sem apagar |
| createdAt | datetime | |

**Codes** (`product_codes`): um produto tem **vários códigos** por canal/receita.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| productId | FK → products | |
| code | text | `cProd` usado na nota |
| channel | text (shopee\|tiktok\|manual) | canal onde o código vale (null = geral) |

> o `cProd` do import casa primeiro pelo nome do arquivo/canal + this row; sem match → fila
> "códigos sem vínculo".

### Sale (`sales`)
Uma venda = um pedido = uma nota (presencial = nota nula). Data, canal, valor e status.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| channel | text (shopee\|tiktok\|presencial) | |
| saleDate | date | data da venda/nota |
| status | text (normal\|estornado) | estorno = status, nunca exclusão |
| refundDate | date null | preenchido se estornado |
| grossCents | integer | valor bruto da venda (NF ou manual) |
| feeCents | integer default 0 | taxa marketplace (editável por venda) |
| netCents | integer | = gross − fee (faturamento p/ MEI usa gross; caixa usa líquido) |
| invoiceNumber | text null | nº da nota (Shopee/TikTok) |
| xmlFilename | text null | nome do XML de origem |
| xmlStoredPath | text null | cópia do XML em public/storage (auditoria) |
| note | text | observação |
| createdAt | datetime | |

**LineItems** (`sale_items`): itens da venda, com custo congelado.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| saleId | FK → sales | |
| productId | FK → products null | preenchido se cProd casou |
| cProd | text | código do produto na nota (bruto) |
| description | text | descrição vinda do XML |
| qty | integer | quantidade |
| unitPriceCents | integer | valor unitário |
| frozenCostCents | integer null | custo do produto vigente na data da venda (congelado) |

### CashEntry (`cash_entries`)
Lançamentos de caixa (dinheiro real). Independe do faturamento (D5).

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| date | date | |
| type | text (entrada\|saida) | |
| category | text (taxas\|filamento\|energia\|manutencao\|embalagem\|venda\|outros) | |
| amountCents | integer | sempre > 0; sinal vem do type |
| description | text | |
| saleId | FK → sales null | vínculo opcional (ex.: reembolso de estorno) |
| createdAt | datetime | |

### Settings (`settings`)
Configuração chave-valor (teto MEI, taxas padrão por canal).

| Campo | Tipo | Notas |
|---|---|---|
| key | text PK | e.g., `mei_annual_limit_cents`, `fee_rate_shopee`, `fee_rate_tiktok` |
| value | text | valor serializado (texto/percentual) |
| updatedAt | datetime | |

## Relações
- **Product 1—N ProductCode**: cada produto tem vários códigos por canal.
- **Sale 1—N SaleItem**: venda tem N itens; item opcionalmente aponta a um produto.
- **SaleItem N—1 Product**: vínculo por `cProd` (fila de sem-vínculo quando não casa).
- **Sale 1—0..1 XML**: nota associada (arquivo + nº), quando marketplace.
- **Sale 0..1—N CashEntry**: caixa pode referenciar a venda (ex.: estorno/reembolso).

## Invariantes
1. `netCents == grossCents − feeCents` (calculado e armazenado; testado).
2. `frozenCostCents` de uma venda nunca muda quando o produto é editado (imutabilidade).
3. Estorno: `status=estornado` + `refundDate`; a venda **não** conta mais no faturamento MEI e
   gera sugestão de saída de caixa (reembolso).
4. Dedup por `invoiceNumber + saleDate` — nunca duas vendas com a mesma nota.
5. `amountCents` é inteiro ≥ 1; não há zeros fantasmas.

## Migrações
Todas via Drizzle (`drizzle-kit migrate`), versionadas em `src/lib/db/migrations/`. Nenhuma
alteração de schema fora do processo de migração (constitution V).
