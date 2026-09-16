import { type Db, getDb } from "@/lib/db/client";
import { cashEntries } from "@/lib/db/schema";
import { type CashLedgerRow, type CashSummary, summarize } from "@/lib/domain/cashier";
import { getMeiLimitCents } from "@/lib/domain/meieto";
import { usedRatioBps } from "@/lib/domain/meieto";
import {
  type ChannelSummaryRow,
  type FiscalMonth,
  type SaleRow,
  annualGross,
  byChannelSummary,
  listSales,
  monthRange,
  monthlyGross,
} from "@/lib/sales/service";
import { and, gte, lt } from "drizzle-orm";

/**
 * Dashboard (US6/T042 + T044).
 * T044 — Integridade composicional: TODO número exibido traça até os registros do
 * banco; nada é inventado/tabelado no cliente. Cada bloco é uma agregação direta
 * sobre `sales`/`cash_entries` (ledgers separados, D5/D8). O teste de dashboard
 * reexporta os mesmos totais por soma independente das linhas brutas.
 */

export type DashboardStats = {
  month: FiscalMonth;
  monthLabel: string;
  /** Faturamento bruto do mês (NF + presencial − estornos) — FR-012/FR-014. */
  monthGross: number;
  /** Vendas normais do mês (para extrato e conferência — traça ao banco). */
  sales: SaleRow[];
  /** Vendas do mês por canal: bruto, taxas, líquido (FR-012). */
  byChannel: ChannelSummaryRow[];
  /** Caixa do mês: saldo, entradas, saídas e gastos por categoria (FR-012). */
  cash: CashSummary;
  /** Faturamento do ano-calendário (1º jan..31 dez, local). */
  yearGross: number;
  /** Teto configurável (FR-013), default R$ 81.000,00. */
  meiLimitCents: number;
  /** % do teto usado, em base-points (0..10000). */
  meiUsedBps: number;
};

function dbOf(opts?: { db?: Db }): Db {
  return opts?.db ?? getDb().db;
}

export function buildDashboardStats(month: FiscalMonth, opts?: { db?: Db }): DashboardStats {
  const db = dbOf(opts);
  const { start, end } = monthRange(month);
  const year = month.year;
  const meiLimitCents = getMeiLimitCents({ db });
  const monthGross = monthlyGross(month, { db });
  const yearGross = annualGross(year, { db });

  const cashRows = db
    .select()
    .from(cashEntries)
    .where(and(gte(cashEntries.date, start), lt(cashEntries.date, end)))
    .all() as CashLedgerRow[];

  return {
    month,
    monthLabel: `${String(month.month).padStart(2, "0")}/${month.year}`,
    monthGross,
    sales: listSales({ db }),
    byChannel: byChannelSummary({ db, month }),
    cash: summarize(cashRows),
    yearGross,
    meiLimitCents,
    meiUsedBps: usedRatioBps(yearGross, meiLimitCents),
  };
}

/** Mês atual (default) quando `m` (YYYY-MM) é ausente/inválido. */
export function monthFromParam(m: string | null | undefined): FiscalMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(String(m ?? ""));
  if (!match) return currentMonth();
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return currentMonth();
  return { year, month };
}

export function currentMonth(): FiscalMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthToParam(month: FiscalMonth): string {
  return `${month.year}-${String(month.month).padStart(2, "0")}`;
}
