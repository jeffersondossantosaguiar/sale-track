import { bpsOf } from "./money";

/**
 * Cálculo financeiro do faturamento (T028) — margem e líquido.
 * Constitution §III/§V: SEMPRE centavos inteiros; aritmética determinística,
 * com guardas de inteiro seguro (nunca overflow silencioso).
 *
 *   líquido = bruto − taxa                 (netOf)
 *   margem  = bruto − taxa − custo congelado   (marginOf = liquid_cents)
 *   taxa    = % do marketplace em basis points (feeFromBps)
 */

export type MoneyCents = number; // invariante: inteiro seguro

function assertCents(value: number, what: string): void {
  if (!Number.isInteger(value)) throw new RangeError(`cxmoney: ${what} deve ser centavos inteiros (${value})`);
}

function assertBps(value: number): void {
  if (!Number.isInteger(value)) throw new RangeError(`cxmoney: bps deve ser inteiro (${value})`);
}

function safeSub(a: number, b: number, what: string): MoneyCents {
  const result = a - b;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`cxmoney: overflow de inteiro seguro em ${what} (${a} - ${b})`);
  }
  return result;
}

/** Taxa do marketplace em centavos a partir de percentual em basis points. */
export function feeFromBps(grossCents: MoneyCents, feeBps: number): MoneyCents {
  assertCents(grossCents, "bruto");
  assertBps(feeBps);
  return bpsOf(grossCents, feeBps);
}

/** Líquido = bruto − taxa (com guarda de inteiro seguro). */
export function netOf(grossCents: MoneyCents, feeCents: MoneyCents): MoneyCents {
  assertCents(grossCents, "bruto");
  assertCents(feeCents, "taxa");
  return safeSub(grossCents, feeCents, "líquido");
}

/** Margem = bruto − taxa − custo congelado. Pode ser negativa (prejuízo). */
export function marginOf(grossCents: MoneyCents, feeCents: MoneyCents, costCents: MoneyCents): MoneyCents {
  assertCents(grossCents, "bruto");
  assertCents(feeCents, "taxa");
  assertCents(costCents, "custo");
  return safeSub(safeSub(grossCents, feeCents, "margem"), costCents, "margem");
}

/** Margem relativa em basis points (10.000 = 100%); sature em 0 sem base. */
export function marginBpsOf(grossCents: MoneyCents, margin: MoneyCents): number {
  assertCents(grossCents, "bruto");
  assertCents(margin, "margem");
  if (grossCents <= 0) return 0;
  const result = Math.round((margin * 10_000) / grossCents);
  return Number.isSafeInteger(result) ? result : 0;
}
