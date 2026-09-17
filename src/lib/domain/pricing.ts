/**
 * Precificação por canal (US3/T018) — funções puras em centavos inteiros.
 * Constitution §III/§V: aritmética determinística, arredondamentos explícitos.
 *
 *   preço_sugerido = (custo + taxa_fixa_canal) / (1 − taxa_var%_canal − margem%)
 *
 * Validação do dono (research §6): custo R$10, taxa fixa R$2, taxa % 10%, margem
 * 40% → (10+2)/(1−0,10−0,40) = R$24. A fórmula preserva a margem líquida já
 * descontando as taxas do canal.
 */

export type ChannelFee = {
  feeFixedCents: number; // taxa fixa (centavos)
  feeRateBps: number; // taxa percentual em basis points (0..10000)
};

export type PriceInput = {
  costCents: number;
  marginBps: number; // margem em basis points (0..10000)
};

/** Faixa de taxa de um canal (005). maxCents null = faixa aberta acima. */
export type ChannelFeeTier = {
  minCents: number; // faixa mínima (inclusiva)
  maxCents: number | null; // faixa máxima (inclusiva); null = aberto acima
  commissionBps: number; // comissão % em basis points (0..10000)
  fixedCents: number; // taxa fixa (centavos)
};

/** Preço sugerido por canal; erro se margem + taxa % ≥ 100% (denominador ≤ 0). */
export function computeSuggestedPriceCents(costCents: number, marginBps: number, fee: ChannelFee): number {
  const denominatorBps = 10_000 - fee.feeRateBps - marginBps;
  if (denominatorBps <= 0) {
    throw new RangeError(
      `pricing: margem + taxa do canal ≥ 100% (margem ${marginBps}b, taxa ${fee.feeRateBps}b) — inválido`,
    );
  }
  const numerator = costCents + fee.feeFixedCents;
  return Math.round((numerator * 10_000) / denominatorBps);
}

/** Escolhe a faixa cujo min ≤ price ≤ max (max null = acima). Erro se nenhuma. */
export function feeForPrice(priceCents: number, tiers: ChannelFeeTier[]): ChannelFeeTier {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new RangeError(`pricing: preço inválido para faixa (${priceCents})`);
  }
  const tier = tiers.find((t) => priceCents >= t.minCents && (t.maxCents === null || priceCents <= t.maxCents));
  if (!tier) {
    throw new RangeError(`pricing: nenhuma faixa de taxa contém o preço ${priceCents}c`);
  }
  return tier;
}

/**
 * Preço sugerido por faixas (005) — resolve por iteração, pois a faixa depende do
 * preço que depende da faixa. Formula por faixa: (custo + fixa)/(1 − comissão − margem).
 * Erro se comissão+margem ≥ 100% ou se não convergir após limite de iterações.
 */
export function computeSuggestedPriceCentsByTiers(
  costCents: number,
  marginBps: number,
  tiers: ChannelFeeTier[],
): number {
  if (!Number.isInteger(costCents) || costCents < 0) throw new RangeError(`pricing: custo inválido (${costCents})`);
  const MAX_ITER = 6;
  const priceForTier = (t: ChannelFeeTier): number => {
    const denominatorBps = 10_000 - t.commissionBps - marginBps;
    if (denominatorBps <= 0) {
      throw new RangeError(
        `pricing: margem + comissão da faixa ≥ 100% (margem ${marginBps}b, comissão ${t.commissionBps}b) — inválido`,
      );
    }
    return Math.round(((costCents + t.fixedCents) * 10_000) / denominatorBps);
  };

  if (tiers.length === 0) {
    throw new RangeError("pricing: canal sem faixas de taxa configuradas");
  }

  // Candidato inicial: margem sobre custo (sem taxa), para descobrir a faixa.
  let price = Math.round((costCents * 10_000) / (10_000 - marginBps));
  if (price <= 0) price = costCents + 1;

  let prevTier: ChannelFeeTier | null = null;
  for (let i = 0; i < MAX_ITER; i++) {
    let tier: ChannelFeeTier;
    try {
      tier = feeForPrice(price, tiers);
    } catch {
      // Preço fora das faixas: usa a faixa de menor limite que recebe um preço >= custo+margem.
      tier = tiers[tiers.length - 1];
    }
    price = priceForTier(tier);
    if (prevTier && prevTier === tier) return price;
    prevTier = tier;
  }
  throw new RangeError("pricing: preço sugerido não convergiu sobre as faixas de taxa");
}

/** Lucro esperado = preço praticado − custo (centavos; pode ser negativo). */
export function computeProfitCents(practicedPriceCents: number, costCents: number): number {
  return practicedPriceCents - costCents;
}

/** Lucro relativo em basis points (10.000 = 100%); 0 se praticado ≤ 0. */
export function computeProfitBps(practicedPriceCents: number, costCents: number): number {
  if (practicedPriceCents <= 0) return 0;
  const profit = computeProfitCents(practicedPriceCents, costCents);
  return Math.round((profit * 10_000) / practicedPriceCents);
}
