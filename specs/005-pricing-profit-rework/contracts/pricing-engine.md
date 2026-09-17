# Contract — Pricing Engine (preço sugerido por faixas)

**Feature**: `005-pricing-profit-rework` | Contrato do domínio de precificação.

Domínio puro em `src/lib/domain/pricing.ts` e `src/lib/domain/fees.ts`. Dinheiro em centavos;
percentuais em bps. Substitui a margem por canal pela **margem do produto** e a taxa única pela
**tabela de faixas**.

## Tipos

```ts
export type ChannelFeeTierInput = {
  minCents: number;        // faixa mínima (inclusiva)
  maxCents: number | null; // faixa máxima (inclusiva); null = aberto acima
  commissionBps: number;   // comissão % (0..10000)
  fixedCents: number;      // taxa fixa (R$)
};

export type FeeInput = { costCents: number; marginBps: number };
```

## Funções

### `feeForPrice(priceCents, tiers): { commissionBps, fixedCents }`
- Escolhe a faixa cujo `min ≤ price ≤ max` (max null = acima). `commissionBps` e `fixedCents` da faixa.
- Erro se `price < 0`; erro se nenhuma faixa contém o preço (`RangeError`).

### `computeSuggestedPriceCents(costCents, marginBps, tiers): number`
- Resolve por **iteração** (limite 6):
  1. candidato inicial = `(cost + primeira_fixa) / (1 − primeira_comissão − margem)` (ou `cost * (1+margem)`
     quando sem faixa aplicável).
  2. acha a faixa de `candidato` via `feeForPrice`.
  3. `candidato = (cost + faixa.fixedCents) / (1 − faixa.commissionBps/10000 − marginBps/10000)`.
  4. repete até a faixa estabilizar (2 iterações com mesma faixa).
- Erro (`RangeError`) se `commissionBps/10000 + marginBps/10000 ≥ 1` (denominador ≤ 0) ou se não
  convergir após 6 iterações.
- `marginBps` é a margem **do produto** (não do canal).

### `percentToBps(percent)`, `normalizeBps` (fees.ts)
- `percentToBps(20) === 2000`; clampa 0..10000.

## Faixas padrão (seed/editor, editáveis)

**Shopee** (comissão % + fixa):
| Faixa do item | Comissão | Fixa |
|---|---|---|
| ≤ 79,99 | 20% | R$4,00 |
| 80,00 – 99,99 | 14% | R$4,00 |
| 100,00 – 199,99 | 14% | R$20,00 |
| 200,00 – 499,99 | 14% | R$26,00 |
| ≥ 500,00 | 14% | R$26,00 |

**TikTok** (base = preço após desconto do vendedor ≈ preço praticado):
| Faixa do item | Comissão | Fixa |
|---|---|---|
| < 50,00 | 10% | R$4,00 |
| ≥ 50,00 | 6% | R$6,00 |

Sem subsídio (decisão do dono).

## Invariantes (testáveis)
- `computeSuggestedPriceCents(10_00, 3000, [{min:0,max:null,commission:2000,fixed:4_00}])` preserva
  margem líquida 30% (validação numérica na implementação).
- Comissão+margem ≥ 100% → `RangeError`, sem gravar sugerido.
- Faixas sobrepostas → validação no editor rejeita.