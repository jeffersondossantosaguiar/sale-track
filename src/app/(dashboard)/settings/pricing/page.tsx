import { listMaterials } from "@/lib/catalog/service";
import type { Metadata } from "next";
import GlobalParamsPanel from "./global-params-panel";
import MaterialsPanel from "./materials-panel";

export const metadata: Metadata = {
  title: "Precificação · sale-track",
};

export default function PricingSettingsPage() {
  const materials = listMaterials();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Precificação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parâmetros globais (energia, horas/semana, mão de obra) e materiais de filamento alimentam o custo por hora
          global (usa-se a impressora mais cara).
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <GlobalParamsPanel />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <MaterialsPanel initialMaterials={materials} />
      </div>
    </div>
  );
}
