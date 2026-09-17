# Contract — Profit Engine (lucro, frete, taxa)

**Feature**: `005-pricing-profit-rework` | Contrato do domínio de apuração financeira.

Domínio puro em `src/lib/domain/cxmoney.ts` (sem I/O). Dinheiro em centavos inteiros; percentuais em
bps. Regras pela constitution I/III.

## Funções

### `profitOf(receivedCents, costCents): MoneyCents`
- **Lucro** = `received − cost`. Pode ser negativo (prejuízo).
- Erro se `received` ou `cost` não forem inteiros seguros (`assertCents`).
- Não aceita `received` nulo (caso "pendente" é tratado fora, com nil).

### `netOfReceived(receivedCents, grossCents): MoneyCents`
- **Net financeiro** = `received` quando presente; senão `gross`. (Presencial sem relatório usa gross.)

### `feeOf(productCents, receivedCents): MoneyCents`
- **Taxa** = `product − received` = `(gross − freight) − received`. Somente quando ambos presentes;
  senão retorna nil (taxa pendente).

### `productOf(grossCents, freightCents): MoneyCents`
- `product = gross − freight`, via `safeSub`. Freight default 0.

## Invariantes (testáveis)
- `profitOf(11_17, 5_00) === 6_17` (recebido R$11,17, custo R$5,00).
- `feeOf(product=19_28, received=11_17) === 8_11` (nota Shopee 260907C6P2FS35).
- `productOf(156_49, 23_87) === 132_62` (nota 2609167NCGVX7X).
- Nil (pendente) quando recebido ausente → lucro pendente, nunca inventado.
- Rejeita centavos não inteiros e overflow de inteiro seguro.

## Estimativa (exibição separada, não apurado)
A estimativa por faixa usa `pricing-engine.feeForPrice` + `computeProfitCents(practiced, cost)` e é
exibida marcada como **estimativa** — nunca como lucro apurado.