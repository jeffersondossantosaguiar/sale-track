import { getMeiLimitCents } from "@/lib/domain/meieto";
import type { Metadata } from "next";
import TetoForm from "./teto-form";

export const metadata: Metadata = {
  title: "Teto MEI · sale-track",
};

export default function MeiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Teto MEI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste o teto anual do MEI (default R$ 81.000,00). O Dashboard mostra o progresso em leitura.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <TetoForm initialCents={getMeiLimitCents()} />
      </div>
    </div>
  );
}
