import type { DashboardStats } from "./service";

/**
 * Extrato mensal exportável (US6/T043) — base para a declaração do MEI/DASN
 * (FR-014): faturamento do mês por tipo (cada venda + totais por canal) e caixa
 * (entradas/saídas/saldo e gastos por categoria). Segue os MESMOS agregados do
 * dashboard (que traçam ao banco, T044). CSV `;` (Excel BR), centavos inteiros.
 */

export function buildExtratoCsv(stats: DashboardStats): string {
  const lines: string[] = [];

  lines.push("# sale-track — extrato mensal (base de declaração MEI/DASN-SIMEI)");
  lines.push(`mes;${stats.monthLabel}`);
  lines.push("");
  lines.push("emitido_em;faturamento_bruto_cents;faturamento_anual_cents;teto_mei_cents;teto_usado_bps");
  lines.push(`${stats.monthLabel};${stats.monthGross};${stats.yearGross};${stats.meiLimitCents};${stats.meiUsedBps}`);
  lines.push("");

  lines.push("vendas;data;canal;nf;bruto_cents;taxa_cents;liquido_cents");
  for (const sale of stats.sales) {
    if (sale.status !== "normal") continue;
    lines.push(
      [
        `venda-${sale.id}`,
        sale.saleDate.toISOString().slice(0, 10),
        sale.channel,
        sale.invoiceNumber ?? "",
        sale.grossCents,
        sale.feeCents,
        sale.netCents,
      ].join(";"),
    );
  }
  const gross = stats.sales.filter((sale) => sale.status === "normal").reduce((sum, sale) => sum + sale.grossCents, 0);
  const fee = stats.sales.filter((sale) => sale.status === "normal").reduce((sum, sale) => sum + sale.feeCents, 0);
  const net = stats.sales.filter((sale) => sale.status === "normal").reduce((sum, sale) => sum + sale.netCents, 0);
  lines.push(`totais_do_mes;;;;${gross};${fee};${net}`);
  lines.push("");

  lines.push("por_canal;vendas;bruto_cents;taxa_cents;liquido_cents");
  for (const row of stats.byChannel) {
    lines.push(`${row.channel};${row.count};${row.grossCents};${row.feeCents};${row.netCents}`);
  }
  lines.push("");

  lines.push("caixa_do_mes;entrada_cents;saida_cents;saldo_cents");
  lines.push(`;${stats.cash.entrada};${stats.cash.saida};${stats.cash.total}`);
  lines.push("");
  lines.push("caixa_por_categoria;liquido_cents");
  for (const [category, amount] of Object.entries(stats.cash.byCategory)) {
    lines.push(`${category};${amount}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
