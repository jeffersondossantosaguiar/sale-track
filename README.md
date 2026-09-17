# sale-track

Controle de vendas MEI (impressão 3D): faturamento, caixa, importação de NFe 55 (Shopee/TikTok),
catálogo com variantes, precificação por canal e apuração de lucro. Single-user, local (SQLite),
sem login. Documentação funcional em `docs/` e decisões de design em `specs/`.

## Comandos

```bash
pnpm install
pnpm db:migrate     # aplica migrações versionadas
pnpm db:seed        # configurações + faixas de taxa padrão por canal
pnpm dev            # app local (acessível de celular na mesma rede)
pnpm test           # vitest
pnpm typecheck      # tsc --noEmit
pnpm lint           # biome (--write)
pnpm tsx src/lib/db/recalc-profit.ts   # recálculo de lucro (recebido) e preços sugeridos
```

## Modelo de apuração de lucro

O **lucro** de uma venda é calculado a partir do **valor recebido** (o que cai na conta), não do valor
da nota:

- `bruto` = vNF (imutável, p/ faturamento/MEI) · `frete` = vFrete (automático)
- `produto = bruto − frete`
- `taxa = produto − recebido` (derivada, somente-leitura)
- `lucro = recebido − Σ(custo × quantidade)` · sem recebido → **pendente** (estimativa por faixa à parte)

O recebido é preenchido manualmente em **Vendas** ou automaticamente pela **importação de relatórios**
exportados (Shopee: relatório de saldo; TikTok: income, aba "Detalhes do pedido"), cruzando com as NFe.

## Precificação

- Margem **unificada por produto** (campo livre, % do preço bruto).
- Taxa de cada canal = **tabela de faixas** (comissão% + fixa por valor do item), editável em
  Configurações → Taxas por canal (texto → linhas estruturadas). Sem subsídio (decisão do dono).
- **Preço sugerido** por canal = iteração sobre as faixas; **praticado** fica congelado (promoção/desconto).

## Notas e melhorias pendentes

- **Reembolsos** nos relatórios (Shopee/TikTok) são **ignorados por ora** (linhas com valor a liquidar
  0 não preenchem recebido). **Ponto a verificar / melhoria futura**: tratar reembolso como estorno da
  venda (status `refunded`).
- **Match TikTok** é por produto/SKU + data + quantidade + valor coerente (nome da NFe é timestamp, não
  casa por ID). Matches ambíguos/sem confiança vão para conferência manual em **Vendas**.
- **Canal novo** sem relatório funciona em modo manual (recebido digitado), como o canal presencial.