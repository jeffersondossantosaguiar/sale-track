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
