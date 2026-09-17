import {
  type CostBreakdown,
  computeVariantCost,
  energyCostCents,
  filamentCostCents,
  laborCostCents,
  machineCostCents,
} from "@/lib/domain/cost";
import {
  type GlobalEnergyParams,
  type PrinterInput,
  globalEnergyPerHour,
  globalMachinePerHour,
  printerEnergyPerHour,
  printerMachinePerHour,
} from "@/lib/domain/printer";
import { describe, expect, it } from "vitest";

/**
 * 004-US1/T003 — Motor de custo corrigido (constitution §III):
 * - Mão de obra = SÓ tempo manual (impressão é trabalho da máquina).
 * - Energia e Máquina separadas; energia deriva do kWh real.
 */

const energyParams: GlobalEnergyParams = { kwhRateCents: 88, hoursPerWeek: 72 };

function printer(overrides: Partial<PrinterInput> = {}): PrinterInput {
  return {
    id: 1,
    acquisitionCents: 448_200,
    usefulLifeYears: 10,
    powerWatts: 350,
    maintenanceCentsPerHour: 25,
    active: true,
    ...overrides,
  };
}

describe("printer.energyPerHour / machinePerHour (004)", () => {
  it("energia por hora = W/1000 × R$/kWh", () => {
    // 350W × R$0,88/kWh = 0,308 → 31 centavos/h
    expect(printerEnergyPerHour(printer(), energyParams)).toBe(31);
  });

  it("máquina por hora = depreciação + manutenção (sem energia)", () => {
    // depreciação = 448200 / (10 × 72×52) = 448200/37440 ≈ 11,97 → 12; + 25 = 37
    expect(printerMachinePerHour(printer(), energyParams)).toBe(37);
  });

  it("globais usam a impressora ativa mais cara (por componente)", () => {
    const caro = printer({ id: 2, powerWatts: 500, maintenanceCentsPerHour: 40 });
    const barato = printer({ id: 1, powerWatts: 200, maintenanceCentsPerHour: 10 });
    expect(globalEnergyPerHour([barato, caro], energyParams)).toBe(Math.round(0.5 * 88)); // 44
    // máquina = depreciação(12) + manutenção(40) = 52
    expect(globalMachinePerHour([barato, caro], energyParams)).toBe(52);
  });

  it("0 quando não há impressora ativa", () => {
    const inativa = printer({ active: false });
    expect(globalEnergyPerHour([inativa], energyParams)).toBe(0);
    expect(globalMachinePerHour([inativa], energyParams)).toBe(0);
  });
});

describe("cost.labor (004)", () => {
  it("mão de obra usa SÓ o tempo manual (impressão NÃO conta)", () => {
    // 30min manual a R$12,89/h = 0,5 × 1289 = 644,5 → 645
    expect(laborCostCents(30, 1289)).toBe(645);
    // a assinatura só recebe manualTimeMin — o tempo de impressão não é entrada
  });
});

describe("cost.energy / machine (004)", () => {
  it("energia = tempo × energia/h global", () => {
    // 60min a 31 centavos/h = 31
    expect(energyCostCents(60, 31)).toBe(31);
  });
  it("máquina = tempo × máquina/h global", () => {
    // 60min a 37 centavos/h = 37
    expect(machineCostCents(60, 37)).toBe(37);
  });
});

describe("cost.computeVariantCost (004)", () => {
  it("soma linhas (filamento, energia, máquina, mão de obra, embalagem, acessórios)", () => {
    const breakdown: CostBreakdown = computeVariantCost(
      {
        printTimeMin: 281, // 4,683h
        manualTimeMin: 15, // 0,25h
        filamentMaterialPricePerKgCents: 9000, // R$90/kg
        filamentGrams: 87,
        packagingCents: 200,
        accessoriesCents: 0,
      },
      31, // energia/h (kWh real, 350W, R$0,88)
      37, // máquina/h (depreciação + manutenção)
      { laborCostPerHourCents: 1289 },
    );
    // filamento = round(87/1000 × 9000) = 783
    // energia   = round(281/60 × 31) = round(145,2) = 145
    // máquina   = round(281/60 × 37) = round(173,3) = 173
    // mão obra  = round(15/60 × 1289) = round(322,25) = 322
    // embalagem = 200; acessórios = 0
    expect(breakdown).toEqual({
      filamentCents: 783,
      energyCents: 145,
      machineCents: 173,
      laborCents: 322,
      packagingCents: 200,
      accessoriesCents: 0,
      totalCents: 783 + 145 + 173 + 322 + 200,
    });
  });

  it("filamento = peso/1000 × R$/kg", () => {
    expect(filamentCostCents(87, 9000)).toBe(783);
  });
});
