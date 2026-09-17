import { recalcAllCosts } from "@/lib/catalog/service";
import { feeOf, netOfReceived, productOf, profitOf } from "@/lib/domain/cxmoney";
import { eq, sql } from "drizzle-orm";
import { createDb, getDb } from "./client";
import { saleItems, sales } from "./schema";

/**
 * 005 — Recálculo de lucro por RECEBIDO e dos preços sugeridos.
 * - Vendas: net = received ?? gross; fee = (gross − freight) − received; lucro = received − custo×qty.
 *   Sem recebido → lucro pendente (0). Bruto imutável.
 * - Variantes: recalcula costCents + suggestedPriceCents (margem do produto + faixas);
 *   praticado permanece congelado. Idempotente.
 *
 * Uso: `pnpm tsx src/lib/db/recalc-profit.ts`
 */
export function recalcProfit(dbPath?: string): { sales: number; variants: number } {
  const { db, sqlite } = dbPath ? createDb({ url: dbPath }) : getDb();

  const costBySale = db
    .select({
      saleId: saleItems.saleId,
      cost: sql<number>`coalesce(sum(${saleItems.frozenCostCents} * ${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .groupBy(saleItems.saleId)
    .all();
  const costMap = new Map(costBySale.map((r) => [r.saleId, r.cost]));

  const rows = db.select().from(sales).all();
  for (const sale of rows) {
    const received = sale.receivedCents;
    const net = netOfReceived(received, sale.grossCents);
    const product = productOf(sale.grossCents, sale.freightCents);
    const fee = feeOf(product, received) ?? 0;
    const liquid = received === null ? 0 : profitOf(received, costMap.get(sale.id) ?? 0);
    db.update(sales).set({ feeCents: fee, netCents: net, liquidCents: liquid }).where(eq(sales.id, sale.id)).run();
  }

  recalcAllCosts(db);
  const variantCount =
    (sqlite.prepare("SELECT count(*) AS n FROM variants").get() as { n: number } | undefined)?.n ?? 0;
  const total = rows.length;
  if (dbPath) sqlite.close();
  return { sales: total, variants: variantCount };
}

if (process.argv[1]?.endsWith("recalc-profit.ts")) {
  const path = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:/, "") : undefined;
  const { sales: nSales, variants: nVariants } = recalcProfit(path);
  console.log(`\n recalc-profit — ${nSales} venda(s) e ${nVariants} variante(s) recalculadas ✓`);
}
