/**
 * Derivação do custo/hora de ENERGIA e de MÁQUINA a partir das impressoras
 * cadastradas (US4/T005, corrigido em 004). Constitution §III/§V: centavos inteiros.
 *
 * Decisão do dono (research §5): o dono NÃO atribui produto a impressora (usa a
 * que estiver livre) → usa-se a impressora MAIS CARA como referência global.
 *
 * 004: energia e máquina são derivadas e expostas SEPARADAMENTE (a planilha as
 * mostra em linhas distintas). A energia usa o kWh real; a máquina é depreciação
 * + manutenção.
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

/** Depreciação por hora de uma impressora (aquisição amortizada pela vida útil). */
export function printerDepreciationPerHour(printer: PrinterInput, params: GlobalEnergyParams): number {
  const hoursPerYear = params.hoursPerWeek * 52;
  return hoursPerYear > 0 ? Math.round(printer.acquisitionCents / (printer.usefulLifeYears * hoursPerYear)) : 0;
}

/** Custo de ENERGIA por hora de uma impressora: (W/1000) × R$/kWh. */
export function printerEnergyPerHour(printer: PrinterInput, params: GlobalEnergyParams): number {
  return Math.round((printer.powerWatts / 1000) * params.kwhRateCents);
}

/** Custo de MÁQUINA por hora de uma impressora: depreciação + manutenção (sem energia). */
export function printerMachinePerHour(printer: PrinterInput, params: GlobalEnergyParams): number {
  return printerDepreciationPerHour(printer, params) + printer.maintenanceCentsPerHour;
}

/** ENERGIA/hora global = a MAIOR entre as impressoras ativas. 0 se nenhuma. */
export function globalEnergyPerHour(printers: PrinterInput[], params: GlobalEnergyParams): number {
  const values = printers.filter((p) => p.active).map((p) => printerEnergyPerHour(p, params));
  return values.length ? Math.max(...values) : 0;
}

/** MÁQUINA/hora global = a MAIOR entre as impressoras ativas. 0 se nenhuma. */
export function globalMachinePerHour(printers: PrinterInput[], params: GlobalEnergyParams): number {
  const values = printers.filter((p) => p.active).map((p) => printerMachinePerHour(p, params));
  return values.length ? Math.max(...values) : 0;
}
