import type { FiscalMonth } from "@/lib/sales/service";

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function friendlyMonth(month: FiscalMonth): string {
  const name = MONTH_NAMES[month.month - 1] ?? String(month.month);
  return `${name} de ${month.year}`;
}
