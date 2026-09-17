import { formatBRL } from "@/lib/domain/money";
import { Layers, type LucideIcon, MoreHorizontal, Package, Percent, Wallet, Wrench, Zap } from "lucide-react";
import EmptyState from "./EmptyState";

export type ExpenseCategoryRow = {
  category: string;
  label: string;
  amountCents: number;
};

const CATEGORY_ICONS: Partial<Record<string, LucideIcon>> = {
  filamento: Layers,
  energia: Zap,
  manutencao: Wrench,
  taxas: Percent,
  embalagem: Package,
};

type ExpensesByCategoryProps = {
  monthLabel: string;
  rows: ExpenseCategoryRow[];
};

export default function ExpensesByCategory({ monthLabel, rows }: ExpensesByCategoryProps) {
  const max = rows.reduce((acc, row) => Math.max(acc, Math.abs(row.amountCents)), 0);

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold">Gastos por categoria</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{monthLabel}</p>

      {rows.length === 0 ? (
        <EmptyState icon={Wallet} title="Sem saídas neste mês." />
      ) : (
        <ul className="mt-5 space-y-5">
          {rows.map((row) => {
            const Icon = CATEGORY_ICONS[row.category] ?? MoreHorizontal;
            const ratio = max === 0 ? 0 : (Math.abs(row.amountCents) / max) * 100;
            return (
              <li key={row.category}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    {row.label}
                  </span>
                  <span className="font-medium tabular-nums text-muted-foreground">
                    − {formatBRL(-row.amountCents)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-red-300" style={{ width: `${ratio}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
