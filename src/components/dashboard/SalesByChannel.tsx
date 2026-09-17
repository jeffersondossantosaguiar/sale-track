import { formatBRL } from "@/lib/domain/money";
import type { ChannelSummaryRow } from "@/lib/sales/service";
import { type LucideIcon, ShoppingCart, Store } from "lucide-react";
import EmptyState from "./EmptyState";

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  presencial: Store,
};

function channelIcon(channel: string): LucideIcon {
  return CHANNEL_ICONS[channel] ?? ShoppingCart;
}

type SalesByChannelProps = {
  monthLabel: string;
  rows: ChannelSummaryRow[];
};

export default function SalesByChannel({ monthLabel, rows }: SalesByChannelProps) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold">Vendas por canal</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{monthLabel}</p>

      {rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Nenhuma venda neste mês." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="px-2 py-2 font-medium">
                  Canal
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Vendas
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Bruto
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Taxas
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Líquido
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const Icon = channelIcon(row.channel);
                return (
                  <tr key={row.channel} className="transition-colors hover:bg-muted/50">
                    <td className="px-2 py-3">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        {row.channel}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">{row.count}</td>
                    <td className="px-2 py-3 text-right tabular-nums">{formatBRL(row.grossCents)}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                      − {formatBRL(row.feeCents)}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatBRL(row.netCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
