import type { GlobalEnergyParams, PrinterInput } from "./printer";

/**
 * Motor de CUSTO da variante (US2/T013, corrigido em 004) — funções puras em
 * centavos inteiros. Constitution §III/§V: aritmética determinística,
 * arredondamentos explícitos.
 *
 *   custo = filamento + energia + máquina + mão de obra + embalagem + acessórios
 *
 * 004: **mão de obra usa SÓ o tempo manual** (a impressão é trabalho da máquina,
 * já precificada em energia + máquina). Energia e máquina são linhas separadas.
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
  energyCents: number;
  machineCents: number;
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

/** Custo de ENERGIA = tempo de impressão (min)/60 × R$/hora global de energia. */
export function energyCostCents(printTimeMin: number, globalEnergyPerHourCents: number): number {
  return round((printTimeMin / 60) * globalEnergyPerHourCents);
}

/** Custo de MÁQUINA = tempo de impressão (min)/60 × R$/hora global de máquina. */
export function machineCostCents(printTimeMin: number, globalMachinePerHourCents: number): number {
  return round((printTimeMin / 60) * globalMachinePerHourCents);
}

/**
 * Custo de mão de obra = TEMPO MANUAL (min)/60 × R$/hora. O tempo de impressão
 * NÃO entra (004) — quem "trabalha" na impressão é a máquina.
 */
export function laborCostCents(manualTimeMin: number, laborCostPerHourCents: number): number {
  return round((manualTimeMin / 60) * laborCostPerHourCents);
}

/** Custo total com detalhamento por linha. `globalEnergy`/`globalMachine` e `labor` já derivados. */
export function computeVariantCost(
  input: VariantCostInput,
  globalEnergyPerHourCents: number,
  globalMachinePerHourCents: number,
  labor: LaborParams,
): CostBreakdown {
  const filamentCents = filamentCostCents(input.filamentGrams, input.filamentMaterialPricePerKgCents);
  const energyCents = energyCostCents(input.printTimeMin, globalEnergyPerHourCents);
  const machineCents = machineCostCents(input.printTimeMin, globalMachinePerHourCents);
  const laborCents = laborCostCents(input.manualTimeMin, labor.laborCostPerHourCents);
  const breakdown: CostBreakdown = {
    filamentCents,
    energyCents,
    machineCents,
    laborCents,
    packagingCents: input.packagingCents,
    accessoriesCents: input.accessoriesCents,
    totalCents: 0,
  };
  breakdown.totalCents =
    filamentCents + energyCents + machineCents + laborCents + input.packagingCents + input.accessoriesCents;
  return breakdown;
}

export type { PrinterInput, GlobalEnergyParams };
