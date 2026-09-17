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

/**
 * Apuração por "recebido" (005) — o valor que cai na conta é a fonte da verdade.
 *
 *   produto = bruto − frete                      (productOf)
 *   taxa    = produto − recebido                (feeOf, derivada, somente-leitura)
 *   lucro   = recebido − custo congelado         (profitOf)
 *   net     = recebido ?? bruto                  (netOfReceived)
 */

/** Produto = bruto − frete (frete default 0). */
export function productOf(grossCents: MoneyCents, freightCents: MoneyCents): MoneyCents {
  assertCents(grossCents, "bruto");
  assertCents(freightCents, "frete");
  return safeSub(grossCents, freightCents, "produto");
}

/** Taxa = produto − recebido (derivada). Pode ser negativa em casos anômalos; nil quando recebido ausente. */
export function feeOf(productCents: MoneyCents, receivedCents: MoneyCents | null): MoneyCents | null {
  assertCents(productCents, "produto");
  if (receivedCents === null) return null;
  assertCents(receivedCents, "recebido");
  return safeSub(productCents, receivedCents, "taxa");
}

/** Lucro = recebido − custo. Pode ser negativo (prejuízo). */
export function profitOf(receivedCents: MoneyCents, costCents: MoneyCents): MoneyCents {
  assertCents(receivedCents, "recebido");
  assertCents(costCents, "custo");
  return safeSub(receivedCents, costCents, "lucro");
}

/** Net financeiro = recebido ?? bruto. */
export function netOfReceived(receivedCents: MoneyCents | null, grossCents: MoneyCents): MoneyCents {
  assertCents(grossCents, "bruto");
  if (receivedCents === null) return grossCents;
  assertCents(receivedCents, "recebido");
  return receivedCents;
}
