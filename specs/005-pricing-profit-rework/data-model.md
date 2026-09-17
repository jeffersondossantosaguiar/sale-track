# Data Model — Precificação e Apuração de Lucro por Canal

**Fase 1 do /speckit.plan** — entidades e relações derivadas da spec `005-pricing-profit-rework`.

> Dinheiro é armazenado em **centavos inteiros** (integers). Percentuais como **basis points**
> (inteiros 0..10000, onde 10000 = 100%). Nunca ponto flutuante.

## Mudanças em relação ao modelo atual (004)

- `products` **ganha** `margin_bps` (margem unificada, campo livre).
- `variant_prices` **perde** `margin_bps` (margem sobe para o produto); mantém `practiced_price_cents`
  (congelado) e `suggested_price_cents` (recalculado).
- `sales` **ganha** `freight_cents` e `received_cents`; redefine `net_cents`/`liquid_cents`.
- Nova entidade: `channel_fee_tiers` (faixas de taxa por canal). Substitui as chaves
  `channel_fee_bps_<canal>` e `channel_fee_fixed_cents_<canal>` das settings para **precificação**.
- Nova entidade (lógica, sem persistência própria): relatório de recebido (Shopee/TikTok) → grava
  `received_cents`.

## Entidades

### Product (`products`) — modificado
Contêiner de variantes; agora carrega a **margem unificada**.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| name | text | |
| categoryId | FK → categories null | |
| **marginBps** | integer | **novo**; margem % do preço bruto (0..10000), campo livre; default 3500 |
| active | boolean | |
| createdAt / updatedAt | datetime | |

### VariantPrice (`variant_prices`) — modificado
Preço por variante × canal. A margem sai daqui (vira do produto).

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| variantId | FK → variants (cascade) | |
| channel | text (shopee\|tiktok) | |
| ~~marginBps~~ | — | **removido** (margem = product.marginBps) |
| suggestedPriceCents | integer | recalculado pelo produto + faixas do canal |
| practicedPriceCents | integer | preço que o dono decide (congelado) |
| UNIQUE(variantId, channel) | | |

### ChannelFeeTier (`channel_fee_tiers`) — nova
Faixa de taxa por canal, para **precificação** (preço sugerido) e estimativa.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| channel | text (shopee\|tiktok) | |
| minCents | integer | faixa mínima (inclusiva) do preço do item |
| maxCents | integer null | faixa máxima (inclusiva); null = sem teto (≥) |
| commissionBps | integer | comissão % (0..10000) |
| fixedCents | integer | taxa fixa (R$) |
| createdAt / updatedAt | datetime | |

Regras de faixa: `min ≤ preço ≤ max` (max null = aberto acima). Faixas de um canal **não podem se
sobrepor**; validação no editor.

### Sale (`sales`) — modificado
A apuração de lucro muda para a verdade do recebido.

| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| channel | text (shopee\|tiktok\|presencial) | |
| saleDate | datetime | |
| status | text (normal\|refunded) | |
| refundDate | datetime null | |
| grossCents | integer | **bruto da nota (vNF), imutável** — faturamento/MEI |
| **freightCents** | integer | **novo**; `vFrete` da NFe, default 0 |
| **receivedCents** | integer null | **novo**; valor que cai na conta (verdade); null = pendente |
| feeCents | integer | **derivado** = `(gross − freight) − received`; somente-leitura |
| netCents | integer | = `received` (ou `gross` quando recebido ausente) |
| liquidCents | integer | **lucro** = `received − Σ(custo × quantidade)`; pendente quando sem recebido |
| invoiceNumber / serie / issueDate / xmlFilename / ... | | mantidos |

**Cálculo derivado** (via `profit-engine`):
- `product = gross − freight`
- `fee = product − received` (somente quando received presente; senão, campo vazio/estimativa)
- `net = received ?? gross`
- `liquid = (received ?? nil) − Σ(frozenCost × quantity)` → nil quando sem recebido

### SaleItem (`sale_items`) — sem mudança de colunas
Mantém `frozenCostCents` (custo congelado por item) e `quantity`. Custo agregado = `Σ(frozenCost ×
quantity)` (correção do importador que ignorava quantidade).

### Variant (`variants`) — sem mudança
Mantém `costCents` (cache do motor de custo). Não guarda margem.

### Settings — mudança
- Chaves `channel_fee_bps_<canal>` e `channel_fee_fixed_cents_<canal>` **deixam de ser usadas para
  precificação** (substituídas por `channel_fee_tiers`). Se ainda usadas para o fallback de estimativa,
  preservadas como valores únicos — decidido na implementação.
- `product.margin_bps` default: 3500.

## Relações
- **Product 1—N Variant**: produto tem N variantes (≥1).
- **Variant 1—N VariantPrice**: preço por canal (praticado + sugerido).
- **ChannelFeeTier N—1 Channel**: faixas por canal (via coluna `channel`).

## Invariantes
1. `grossCents` (vNF) é **imutável**; usado para faturamento/MEI.
2. `liquidCents = receivedCents − Σ(frozenCostCents × quantity)`; sem recebido → **pendente** (nil).
3. `feeCents = (grossCents − freightCents) − receivedCents`, **derivado e somente-leitura**.
4. `netCents = receivedCents ?? grossCents`.
5. `suggestedPriceCents = (costCents + fixa_da_faixa) / (1 − comissão_da_faixa − product.marginBps)`,
   resolvido por **iteração** sobre as faixas; erro se comissão+margem ≥ 100%.
6. `practicedPriceCents` **não muda** quando custo/margem/faixas mudam — só ação manual.
7. Faixas de um canal são **contíguas e não sobrepostas** (validação no editor).
8. `receivedCents` editável manualmente, mas rastreado (nunca silencioso).
9. Custo de venda multiplica congelado × quantidade.
10. Todo valor monetário é inteiro (centavos); percentuais como `Bps` inteiros.

## Migrações
Via Drizzle (`drizzle-kit migrate`), versionadas em `src/lib/db/migrations/` (nova `0006`). Dados de
teste podem ser recriados. Nunca alterar schema fora de migração (constitution V).