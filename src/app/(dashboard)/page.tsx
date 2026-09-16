import { buildDashboardStats, monthFromParam, monthToParam } from "@/lib/dashboard/service";
import { CASH_CATEGORY_LABELS } from "@/lib/domain/cash";
import { formatBRL } from "@/lib/domain/money";
import type { Metadata } from "next";
import MonthPicker from "./month-picker";
import TetoForm from "./teto-form";

/**
 * T042 — Dashboard mensal/anual: faturamento do mês e do ano, % do teto MEI
 * (barra), caixa do mês (entradas/saídas/saldo), gastos por categoria e vendas
 * por canal (bruto, taxas, líquido). Tudo derivado do banco (T044).
 * FR-012/FR-013/FR-014.
 */

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

  const gastos = Object.entries(stats.cash.byCategory)
    .filter(([, amount]) => amount < 0)
    .sort((a, b) => a[1] - b[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mês exibido: {stats.monthLabel}</p>
        </div>
        <MonthPicker value={monthToParam(month)} />
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        <div className="bg-card px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Faturamento {stats.monthLabel}</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(stats.monthGross)}</p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Faturamento {month.year}</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(stats.yearGross)}</p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Caixa do mês</p>
          <p className="mt-1 text-lg font-semibold">
            {formatBRL(stats.cash.total)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Entradas {formatBRL(stats.cash.entrada)} · Saídas {formatBRL(stats.cash.saida)}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">Teto anual MEI</p>
          <TetoForm initialCents={stats.meiLimitCents} />
        </div>
        <div className="mt-3 space-y-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatBRL(stats.yearGross)} de {formatBRL(stats.meiLimitCents)} ({pct.toFixed(1)}%)
            {over && " — ultrapassou o teto!"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Vendas por canal — {stats.monthLabel}</h2>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-1 py-1">Canal</th>
                  <th className="px-1 py-1 text-right">Vendas</th>
                  <th className="px-1 py-1 text-right">Bruto</th>
                  <th className="px-1 py-1 text-right">Taxas</th>
                  <th className="px-1 py-1 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.byChannel.map((row) => (
                  <tr key={row.channel}>
                    <td className="px-1 py-2">{row.channel}</td>
                    <td className="px-1 py-2 text-right">{row.count}</td>
                    <td className="px-1 py-2 text-right">{formatBRL(row.grossCents)}</td>
                    <td className="px-1 py-2 text-right">− {formatBRL(row.feeCents)}</td>
                    <td className="px-1 py-2 text-right font-medium">{formatBRL(row.netCents)}</td>
                  </tr>
                ))}
                {stats.byChannel.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-1 py-2 text-xs text-muted-foreground">
                      Nenhuma venda neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Gastos por categoria — {stats.monthLabel}</h2>
          <div className="mt-3 divide-y divide-border">
            {gastos.map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between py-2 text-sm">
                <span>{CASH_CATEGORY_LABELS[category as keyof typeof CASH_CATEGORY_LABELS] ?? category}</span>
                <span className="text-muted-foreground">− {formatBRL(-amount)}</span>
              </div>
            ))}
            {gastos.length === 0 && <p className="py-2 text-xs text-muted-foreground">Sem saídas neste mês.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
