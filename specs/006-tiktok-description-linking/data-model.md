# Data Model: Vínculo de Itens TikTok por Descrição

## Entidades e mudanças

### SaleItem (sem mudança de schema)
- Chave de vínculo **semântica** por canal:
  - `cProd` → canais Shopee / presencial / geral
  - `description` → canal TikTok
- `variant_id` (null = sem vínculo / fila), `frozen_cost_cents` (null = sem custo; nunca revertido — D6).

### ProductCode (sem mudança de schema; semântica ampliada)
- Para o TikTok, `code` passa a conter a **descrição** do produto (com `channel='tiktok'`), em vez do `'Padrao'` genérico.
- Para Shopee/presencial/geral, `code` continua sendo o `cProd`.
- `channel` mantém `null` = vale para qualquer canal (geral).

### UnlinkedGroup (derivado em runtime)
- Agrupamento da fila passa a ser por **chave de vínculo** (`description` p/ TikTok; `cProd` p/ demais) × canal.
- Campos: `cProd` (para TikTok = descrição, usada como chave), `channel`, `description`, `count`, `totalCents`, `firstSaleDate`.

## Regras de validação

- `itemMatchKey(channel, item)`:
  - `channel === 'tiktok'` → `normalizeMatch(item.description)` (fallback: `cProd`)
  - senão → `cProd`
- `normalizeMatch(s)`: `s.trim().toLowerCase()` com colapso de espaços (para casamento tolerante a espaço/caixa).
- Vínculo correto no reparo: `instr(lower(description), lower(nome_do_produto_vinculado)) > 0`.

## Transições de estado

- **Sem vínculo → vinculado**: backfill de `variant_id` via vínculo manual (por chave por canal) ou import automático (por `product_codes`).
- **Vinculado → sem vínculo (reparo)**: somente via migração `0008` idempotente, apenas para itens TikTok cujo produto vinculado não consta na descrição; `frozen_cost_cents` volta a null apenas quando estava null (nunca reverte custo aplicado).

## Reparo de dados (ação `repairTikTokLinks` — sem migração/schema)

O reparo é uma **Server Action explícita** (`repairTikTokLinksAction`) disparada por botão no painel "Fila de códigos sem vínculo" — alinhado ao §I (retificação explícita) e ao padrão existente de `applyCurrentCost`. Não há mudança de schema (nenhuma migração). Lógica em `catalog/service.ts`:

1. `DELETE FROM product_codes WHERE code = 'Padrao' AND channel = 'tiktok'` (remove código genérico aprendido).
2. `UPDATE sale_items SET variant_id = NULL, frozen_cost_cents = NULL` para itens TikTok com `variant_id` não-nulo **sem custo congelado** (D6: nunca altera custo aplicado) cujo produto vinculado **não está contido** na descrição (`instr(lower(description), lower(name)) = 0`).
3. `INSERT` (via `createProductCode`) um código por **descrição** para os itens mantidos (`channel='tiktok'`), para auto-vínculo futuro.

- Idempotente: na 2ª execução não há itens pendentes nem código `'Padrao'`, e os códigos por descrição já existem (unique `(code, channel)`).
- `product_codes.code` aceita até 255 caracteres (limite aumentado de 60) para acomodar descrições do TikTok.