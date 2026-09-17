import { listMaterials } from "@/lib/catalog/service";
import { getNumberSetting } from "@/lib/db/settings";
import type { Metadata } from "next";
import GlobalParamsPanel from "./global-params-panel";
import MaterialsPanel from "./materials-panel";

export const metadata: Metadata = {
  title: "Precificação · sale-track",
};

export default function PricingSettingsPage() {
  const materials = listMaterials();
  const initial = {
    kwhRateCents: getNumberSetting("kwh_rate_cents", 0),
    hoursPerWeek: getNumberSetting("hours_per_week", 0),
    laborCostPerHourCents: getNumberSetting("labor_cost_per_hour_cents", 0),
  };
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
        <GlobalParamsPanel initial={initial} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <MaterialsPanel initialMaterials={materials} />
      </div>
    </div>
  );
}
