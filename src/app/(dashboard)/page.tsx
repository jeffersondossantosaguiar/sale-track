import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import ExpensesByCategory, { type ExpenseCategoryRow } from "@/components/dashboard/ExpensesByCategory";
import MeiLimitCard from "@/components/dashboard/MeiLimitCard";
import SalesByChannel from "@/components/dashboard/SalesByChannel";
import { friendlyMonth } from "@/components/dashboard/monthLabel";
import { buildDashboardStats, monthFromParam, monthToParam } from "@/lib/dashboard/service";
import { CASH_CATEGORY_LABELS } from "@/lib/domain/cash";
import type { Metadata } from "next";
import MonthPicker from "./month-picker";

export const metadata: Metadata = {
  title: "Dashboard · sale-track",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = monthFromParam(m);
  const stats = buildDashboardStats(month);

  const pct = Math.min(stats.meiUsedBps / 100, 100);
  const over = stats.meiUsedBps > 10_000;

  const gastos: ExpenseCategoryRow[] = Object.entries(stats.cash.byCategory)
    .filter(([, amount]) => amount < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([category, amount]) => ({
      category,
      label: CASH_CATEGORY_LABELS[category as keyof typeof CASH_CATEGORY_LABELS] ?? category,
      amountCents: amount,
    }));

  const monthLabel = friendlyMonth(month);

  return (
    <div className="space-y-6">
      <DashboardHeader monthLabel={monthLabel}>
        <MonthPicker value={monthToParam(month)} />
      </DashboardHeader>

      <DashboardMetrics
        monthLabel={monthLabel}
        year={month.year}
        monthGrossCents={stats.monthGross}
        yearGrossCents={stats.yearGross}
        cashTotalCents={stats.cash.total}
        cashEntradaCents={stats.cash.entrada}
        cashSaidaCents={stats.cash.saida}
      />

      <MeiLimitCard usedCents={stats.yearGross} limitCents={stats.meiLimitCents} usedPct={pct} over={over} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesByChannel monthLabel={monthLabel} rows={stats.byChannel} />
        <ExpensesByCategory monthLabel={monthLabel} rows={gastos} />
      </div>
    </div>
  );
}
