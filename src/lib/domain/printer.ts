/**
 * Derivação do custo/hora global de ENERGIA + MÁQUINA a partir das impressoras
 * cadastradas (US4/T005). Constitution §III/§V: centavos inteiros.
 *
 * Decisão do dono (research §5): o dono NÃO atribui produto a impressora (usa a
 * que estiver livre) → usa-se a impressora MAIS CARA como custo/hora global.
 */

export type PrinterInput = {
  id: number;
  acquisitionCents: number;
  usefulLifeYears: number;
  powerWatts: number;
  maintenanceCentsPerHour: number;
  active: boolean;
};

export type GlobalEnergyParams = {
  kwhRateCents: number; // R$/kWh (ex.: 90 = R$ 0,90)
  hoursPerWeek: number; // horas de uso/semana (ex.: 72)
};

/** Custo por hora de uma única impressora, em centavos (inteiro). */
export function printerCostPerHour(printer: PrinterInput, params: GlobalEnergyParams): number {
  const hoursPerYear = params.hoursPerWeek * 52;
  const depreciationPerHour =
    hoursPerYear > 0 ? Math.round(printer.acquisitionCents / (printer.usefulLifeYears * hoursPerYear)) : 0;
  const energyPerHour = Math.round((printer.powerWatts / 1000) * params.kwhRateCents); // (W/1000) × R$/kWh
  return depreciationPerHour + energyPerHour + printer.maintenanceCentsPerHour;
}

/** Custo/hora global = a MAIS CARA entre as impressoras ativas. 0 se nenhuma. */
export function globalMachineCostPerHour(printers: PrinterInput[], params: GlobalEnergyParams): number {
  const costs = printers.filter((p) => p.active).map((p) => printerCostPerHour(p, params));
  return costs.length ? Math.max(...costs) : 0;
}
