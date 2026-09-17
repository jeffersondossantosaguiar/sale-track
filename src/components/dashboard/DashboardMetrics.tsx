import { formatBRL } from "@/lib/domain/money";
import { CalendarDays, TrendingUp, Wallet } from "lucide-react";
import MetricCard from "./MetricCard";

type DashboardMetricsProps = {
  monthLabel: string;
  year: number;
  monthGrossCents: number;
  yearGrossCents: number;
  cashTotalCents: number;
  cashEntradaCents: number;
  cashSaidaCents: number;
};

export default function DashboardMetrics({
  monthLabel,
  year,
  monthGrossCents,
  yearGrossCents,
  cashTotalCents,
  cashEntradaCents,
  cashSaidaCents,
}: DashboardMetricsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Métricas">
      <MetricCard
        icon={TrendingUp}
        iconClassName="bg-violet-100 text-violet-600"
        label="Faturamento do mês"
        value={formatBRL(monthGrossCents)}
        secondary={monthLabel}
      />
      <MetricCard
        icon={CalendarDays}
        iconClassName="bg-orange-100 text-orange-600"
        label="Faturamento do ano"
        value={formatBRL(yearGrossCents)}
        secondary={`Acumulado de ${year}`}
      />
      <MetricCard
        icon={Wallet}
        iconClassName="bg-cyan-100 text-cyan-600"
        label="Caixa do mês"
        value={formatBRL(cashTotalCents)}
        secondary={`Entradas ${formatBRL(cashEntradaCents)} · Saídas ${formatBRL(cashSaidaCents)}`}
      />
    </section>
  );
}
