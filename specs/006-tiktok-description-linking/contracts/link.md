# Contrato de Vínculo de Itens por Canal

O vínculo de um item de venda a uma variante é resolvido por uma **chave de vínculo** que depende do canal. Este contrato documenta a regra, usada pelo import automático, pela fila sem vínculo e pelo reparo.

## Regra da chave

```
chaveDeVinculo(channel, item) =
    channel == 'tiktok'  → normalizar(item.description)   // fallback: item.cProd
    senão                → item.cProd                      // shopee | presencial | geral
```

`normalizar(s)` = `s.trim().toLowerCase()` com colapso de espaços múltiplos em um único.

## Função pura

`itemMatchKey(channel: Channel, item: { cProd: string; description?: string }): string`

- Retorna a chave usada para casar com `product_codes.code` e para agrupar a fila.
- Ex.: `itemMatchKey('tiktok', {cProd:'Padrao', description:'Luffy Low Poly…'})` → `'luffy low poly…'` (normalizada).

## Vínculo automático (import)

- `linkItems(items, channel, codes)` casa cada item pela sua chave (`cProd` ou `description`).
- Match em `product_codes`: preferir `channel` específico > `geral` (channel null); casar apenas `channel === 'tiktok'` quando a chave for descrição.
- Sem match → `variant_id = null` (vai para a fila). Nunca bloqueia o lote.

## Fila sem vínculo

- Agrupar por **(chaveDeVinculo, channel)**.
- Para TikTok, a chave é a descrição → cada produto vira um grupo próprio (não colapsa em `'Padrao'`).
- `UnlinkedGroup.cProd` carrega a chave (para TikTok = descrição).

## Vínculo manual (backfill)

`linkUnlinkedToVariant({variantId, cProd, channel})`:
- Aprende `product_codes` com `code = chave` (para TikTok, `code = descrição`, `channel='tiktok'`).
- Backfill de `sale_items` apenas onde `chaveDeVinculo(channel, item)` casa e `channel` é o mesmo.
- Nunca altera `frozen_cost_cents` já definido.

## Reparo de dados (migração idempotente)

- Desvincular item TikTok quando o produto vinculado **não está contido** na descrição.
- Remover códigos aprendidos genéricos (`'Padrao'`, `'tiktok'`).
- Aprender descrições corretas dos itens mantidos (para auto-vínculo futuro).
- Sem efeito em base limpa.

## Pré-condições / invariantes

- Canal é sempre `'shopee' | 'tiktok' | 'presencial'`.
- `cProd` é obrigatório em `sale_items`; `description` é obrigatória e não-vazia em itens importados.
- `product_codes` tem unique em `(code, channel)` — descrição + `'tiktok'` é único por variante.