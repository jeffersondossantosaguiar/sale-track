# Quickstart: Vínculo de Itens TikTok por Descrição

Guia de validação ponta-a-ponta da feature 006. Pré-requisito: schema migrado (ou banco em memória nos testes).

## Pré-requisitos

- Node ≥22, pnpm.
- Dependências instaladas: `pnpm install`.
- Comandos: `pnpm test`, `pnpm typecheck`, `pnpm lint:check`, `pnpm db:migrate`.

## Validação 1 — Testes automatizados (red-green)

```bash
pnpm test
```

Cobre (contrato em `contracts/link.md`, regras em `data-model.md`):
- Chave de vínculo por canal (`itemMatchKey`): TikTok usa descrição; Shopee/presencial usam `cProd` (`tests/xml-link.test.ts`).
- Fila sem vínculo agrupa TikTok por descrição; backfill do vínculo manual casa só a descrição certa; novo import casa por descrição (`tests/unlinked.test.ts`).
- Reparo (migração `0008`) idempotente e no-op em base limpa (`tests/catalog.test.ts`).

Resultado esperado: **todos os testes verdes** (149+).

## Validação 2 — Typecheck e lint

```bash
pnpm typecheck
pnpm lint:check
```

## Validação 3 — Reparo no banco real (botão)

Na tela **Produtos → Fila de códigos sem vínculo**, clique em **"Reparar vínculos TikTok"** (ou rode a Server Action via a função `repairTikTokLinks`).

Esperado (com os dados atuais):
- Ash Greninja passa de 54 para 36 vendas (28 Shopee + 8 TikTok com descrição dele).
- Produtos Luffy/Sauron/Jotaro/Mimikyu/Goku-Vegeta/Jinx/Marcadores voltam à fila sem vínculo (TikTok), agrupados por descrição.
- `product_codes` perde o `('Padrao','tiktok')` e ganha `('Ash Greninja Low Poly Pokemon | …', 'tiktok')` para auto-vínculo futuro.

Clicar novamente → "Nenhum vínculo TikTok incorreto" (idempotência).

## Validação 4 — Novo import TikTok casa por descrição

Após o reparo, importar uma nota TikTok com descrição já vinculada → item casa automaticamente por descrição (ver coluna Vendas/produto e fila).

## Detalhes

- Contrato de vínculo: `contracts/link.md`
- Modelo de dados e SQL do reparo: `data-model.md`
- Tasks de implementação: `tasks.md` (gerado por `/speckit.tasks`)