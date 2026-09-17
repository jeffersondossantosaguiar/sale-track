# Research: Vínculo de Itens TikTok por Descrição

## Questão em aberto

- **NEEDS CLARIFICATION → Como distinguir produtos do TikTok se todos usam o mesmo `cProd='Padrao'`?**
  - **Decisão**: usar a **descrição** (`sale_items.description`) como chave de vínculo para o canal TikTok, e `cProd` para os demais canais.
  - **Rationale**: a NFe do TikTok não carrega código por produto — o `cProd` é o genérico `'Padrao'`; a única informação discriminadora é o nome/descrição do produto. Reutiliza o modelo `product_codes` (gravando a descrição como `code`, com `channel='tiktok'`) e o fluxo de vínculo/backfill existente.
  - **Alternativas consideradas**:
    - Correlacionar por relatório TikTok (já usado em 005 para o recebido) — resolve recebido, mas não o vínculo de itens/produtos; fora de escopo.
    - Match por substring difusa — maior complexidade; não justificado agora (YAGNI). Normalização leve (colapso de espaços + minúsculas) cobre os casos comuns.

## Tecnologias / práticas

- **Drizzle + SQLite**: agrupamento da fila por expressão `CASE WHEN channel='tiktok' THEN description ELSE c_prod END` no `listUnlinkedGroups`; backfill condicional no `linkUnlinkedToVariant`.
- **Idempotência do reparo**: migração `0008` com `DELETE`/`UPDATE`/`INSERT ... SELECT` condicionais que são no-op em base limpa. Uso de `instr(lower(description), lower(nome_produto))` para decidir "correto" (nome contido na descrição).
- **Testes (constitution §IV)**: funções puras de chave de vínculo em `xml/link.ts` testáveis isoladamente; integração da fila/backfill em `unlinked.test.ts`; reparo em `catalog.test.ts`.

## Convenções existentes (do código)

- `linkCProd(cProd, channel, codes)` em `src/lib/xml/link.ts` é a função pura de casamento; `linkItems` chama por item.
- `linkUnlinkedToVariant(input: {variantId, cProd, channel})` em `catalog/service.ts` aprende o código e faz backfill por `cProd`+canal.
- `listUnlinkedGroups` agrupa por `(cProd, channel)`.
- A fila usa `(cProd, channel)` como chave; `UnlinkedGroup` expõe `cProd`, `channel`, `description`.
- `frozen_cost_cents` só muda via ação explícita (D6); o reparo desvincula (null) sem reverter custo aplicado.

## Conclusões

- A solução é **local e mínima**: introduzir `itemMatchKey(channel, item)` (descrição p/ TikTok, cProd p/ demais), usar essa chave em `link.ts`, `listUnlinkedGroups` e `linkUnlinkedToVariant`, e uma migração idempotente de reparo.