import { CASH_CATEGORIES, type CashCategory, type CashType } from "./cash";

/**
 * Lógica do ledger de CAIXA (US3/T034) — NUNCA mistura com faturamento NFe (D5/D8).
 * Funções puras sobre linhas de lançamento (array); só contam lançamentos ATIVOS:
 *   - status deve ser "normal" (estornado NÃO participa);
 *   - entrada de reversão (reversalOfId) NÃO participa (a original estornada é o
 *     fato; a reversão existe só para auditoria/rastro — "estorno aparece com data").
 */

export type CashLedgerRow = {
  type: CashType;
  amountCents: number;
  status: string | null;
  reversalOfId: number | null;
  category?: string;
};

export function cashSignOf(type: CashType): 1 | -1 {
  return type === "entrada" ? 1 : -1;
}

/** Converte centavos em valor assinado (entrada +, saída −). */
export function signedOf(amountCents: number, type: CashType): number {
  return cashSignOf(type) * amountCents;
}

/** Lançamento participa do saldo? (não estornado e não é uma reversão). */
export function isActive(row: CashLedgerRow): boolean {
  return (row.status ?? "normal") === "normal" && row.reversalOfId === null;
}

/** Saldo = soma assinada dos lançamentos ativos. */
export function totalOf(rows: readonly CashLedgerRow[]): number {
  return rows.reduce((sum, row) => (isActive(row) ? sum + signedOf(row.amountCents, row.type) : sum), 0);
}

/** Totais por tipo (entrada/saída) dos lançamentos ativos. */
export function typeOf(rows: readonly CashLedgerRow[]): { entrada: number; saida: number } {
  let entrada = 0;
  let saida = 0;
  for (const row of rows) {
    if (!isActive(row)) continue;
    if (row.type === "entrada") entrada += row.amountCents;
    else saida += row.amountCents;
  }
  return { entrada, saida };
}

/** Líquido por categoria (entrada − saída) dos lançamentos ativos. */
export function ownership(rows: readonly CashLedgerRow[]): Record<CashCategory, number> {
  const output = Object.fromEntries(CASH_CATEGORIES.map((category) => [category, 0])) as Record<CashCategory, number>;
  for (const row of rows) {
    if (!isActive(row) || !row.category) continue;
    const category = row.category as CashCategory;
    output[category] += signedOf(row.amountCents, row.type);
  }
  return output;
}

/** Resumo pronto para a página/actions do caixa (T035). */
export type CashSummary = {
  total: number;
  entrada: number;
  saida: number;
  byCategory: Record<CashCategory, number>;
};

export function summarize(rows: readonly CashLedgerRow[]): CashSummary {
  const { entrada, saida } = typeOf(rows);
  return { total: totalOf(rows), entrada, saida, byCategory: ownership(rows) };
}
