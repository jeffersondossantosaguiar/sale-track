import { buildExtratoCsv } from "@/lib/dashboard/extrato";
import { buildDashboardStats, monthFromParam, monthToParam } from "@/lib/dashboard/service";

/**
 * T043 — Exporta o extrato mensal (CSV) para a declaração do MEI/DASN.
 * GET /api/export?m=YYYY-MM (omitido → mês atual). Roda no servidor; read-only.
 */

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const month = monthFromParam(url.searchParams.get("m"));
  const stats = buildDashboardStats(month);
  const csv = buildExtratoCsv(stats);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-${monthToParam(month)}.csv"`,
    },
  });
}
