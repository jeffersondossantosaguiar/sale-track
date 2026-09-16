import { listCashEntries } from "@/lib/cash/service";
import { summarize } from "@/lib/domain/cashier";
import type { Metadata } from "next";
import CashPanel from "./cash-panel";

export const metadata: Metadata = {
  title: "Caixa · sale-track",
};

export default function CashPage() {
  const entries = listCashEntries();
  const summary = summarize(entries);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Controle de caixa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ledger do dinheiro real (D5) — separado do faturamento das notas fiscais. Estorno nunca apaga um lançamento: o
          original vira <em>estornado</em> com data e uma reversão entra com data própria (D7).
        </p>
      </div>
      <CashPanel initialEntries={entries} initialSummary={summary} />
    </div>
  );
}
