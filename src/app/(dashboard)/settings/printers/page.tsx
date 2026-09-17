import { listPrinters } from "@/lib/catalog/service";
import type { Metadata } from "next";
import PrintersPanel from "./printers-panel";

export const metadata: Metadata = {
  title: "Impressoras · sale-track",
};

export default function PrintersPage() {
  const printers = listPrinters();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Impressoras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre suas impressoras como referência; o custo/hora global de energia+máquina usa a impressora mais cara e
          se aplica a todas as variantes pelo tempo de impressão.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <PrintersPanel initialPrinters={printers} />
      </div>
    </div>
  );
}
