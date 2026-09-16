/**
 * Teto MEI (R$) e apuração de faturamento para controle de limite anual.
 * Constitution §V + US5: valor é configurável via `settings` (mei_limit_cents),
 * default R$ 81.000. Limite NUNCA em float; guardamos centavos.
 */

import { getNumberSetting } from "../db/settings";
import { formatBRL } from "./money";

export const DEFAULT_MEI_LIMIT_CENTS = 81_000 * 100; // R$ 81.000,00

/** Lê o teto atual com fallback para o default da constituição. */
export function getMeiLimitCents(opts?: { db?: import("../db/client").Db }): number {
  return getNumberSetting("mei_limit_cents", DEFAULT_MEI_LIMIT_CENTS, opts);
}

/** Percentual do teto já usado em centavos de percentual (0..10000, i.e. 100.00%). */
export function usedRatioBps(grossCentsSoFar: number, limitCents: number): number {
  if (limitCents <= 0) return 0;
  return Math.round((grossCentsSoFar / limitCents) * 10000);
}

/** Human-readable: "R$ X de R$ 81.000 (Y%)" — para dashboard/cabecalho. */
export function formatTetoProgress(usedCents: number, limitCents: number): string {
  const pct = ((usedCents / limitCents) * 100).toFixed(1);
  return `${formatBRL(usedCents)} de ${formatBRL(limitCents)} (${pct}%)`;
}
