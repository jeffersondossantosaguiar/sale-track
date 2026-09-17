import type { GlobalEnergyParams, PrinterInput } from "./printer";

/**
 * Motor de CUSTO da variante (US2/T013) — funções puras em centavos inteiros.
 * Constitution §III/§V: aritmética determinística, arredondamentos explícitos.
 *
 *   custo = filamento + energia+máquina + mão de obra + embalagem + acessórios
 *
 * Detalhamento por linha, com a mão de obra destacada separadamente (não é
 * escondida) — o dono quer saber quanto deve de mão de obra mesmo que o
 * dinheiro volte para ele no fim do dia.
 */

export type VariantCostInput = {
  printTimeMin: number;
  manualTimeMin: number;
  filamentMaterialPricePerKgCents: number | null; // null = sem material/filamento
  filamentGrams: number;
  packagingCents: number;
  accessoriesCents: number; // soma dos acessórios
};

export type LaborParams = {
  laborCostPerHourCents: number; // R$/hora de mão de obra
};

export type CostBreakdown = {
  filamentCents: number;
  energyMachineCents: number;
  laborCents: number;
  packagingCents: number;
  accessoriesCents: number;
  totalCents: number;
};

function round(v: number): number {
  return Math.round(v);
}

/** Custo de filamento = peso(g)/1000 × R$/kg do material. 0 se sem material. */
export function filamentCostCents(grams: number, pricePerKgCents: number | null): number {
  if (pricePerKgCents == null || grams <= 0) return 0;
  return round((grams / 1000) * pricePerKgCents);
}

/** Custo de energia+máquina = tempo de impressão (min)/60 × R$/hora global. */
export function energyMachineCostCents(printTimeMin: number, globalMachineCostPerHourCents: number): number {
  return round((printTimeMin / 60) * globalMachineCostPerHourCents);
}

/** Custo de mão de obra = (impressão + manual)/60 × R$/hora. */
export function laborCostCents(printTimeMin: number, manualTimeMin: number, laborCostPerHourCents: number): number {
  return round(((printTimeMin + manualTimeMin) / 60) * laborCostPerHourCents);
}

/** Custo total com detalhamento por linha. `globalMachine` e `laborPerHour` já derivados. */
export function computeVariantCost(
  input: VariantCostInput,
  globalMachineCostPerHourCents: number,
  labor: LaborParams,
): CostBreakdown {
  const filamentCents = filamentCostCents(input.filamentGrams, input.filamentMaterialPricePerKgCents);
  const energyMachineCents = energyMachineCostCents(input.printTimeMin, globalMachineCostPerHourCents);
  const laborCents = laborCostCents(input.printTimeMin, input.manualTimeMin, labor.laborCostPerHourCents);
  const breakdown: CostBreakdown = {
    filamentCents,
    energyMachineCents,
    laborCents,
    packagingCents: input.packagingCents,
    accessoriesCents: input.accessoriesCents,
    totalCents: 0,
  };
  breakdown.totalCents =
    filamentCents + energyMachineCents + laborCents + input.packagingCents + input.accessoriesCents;
  return breakdown;
}

export type { PrinterInput, GlobalEnergyParams };
