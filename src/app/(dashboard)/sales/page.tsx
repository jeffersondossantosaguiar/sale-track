import type { Metadata } from "next";
import XmlImportForm from "./import-form";

export const metadata: Metadata = {
  title: "Importar XML · sale-track",
};

export default function SalesImportPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Importar vendas (NFe 55)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleciona os XMLs baixados do painel (Shopee/TikTok). O canal é sugerido pelo nome do arquivo e pode ser
          ajustado antes de confirmar.
        </p>
      </div>
      <XmlImportForm />
    </div>
  );
}
