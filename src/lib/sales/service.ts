import { type Db, getDb } from "@/lib/db/client";
import { cashEntries, products, saleItems, sales } from "@/lib/db/schema";
import { marginOf } from "@/lib/domain/cxmoney";
import { presentialSaleInputSchema } from "@/lib/domain/presential";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";

/**
 * Serviço de VENDAS (US4/T036–T037).
 * - listSales: lista faturamento (NF importadas + presenciais), presencial
 *   marcada no canal (US4.1).
 * - monthlyGross: soma do mês para o controle do teto MEI = NF + presencial
 *   (US4.2) — todo `gross` de vendas normais; estornos de caixa NÃO entram aqui
 *   (ledgers separados, D5/D8); refunds (status != normal) ficam de fora.
 * - createPresentialSale: venda sem NFe — faturamento (sales + sale_items) E
 *   caixa (cash_entries, entrada "venda") numa única transação (T037).
 */

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type SaleRow = {
  id: number;
  channel: string;
  saleDate: Date;
  status: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  liquidCents: number;
  invoiceNumber: string | null;
  itemCount: number;
  firstItem: string | null;
};

const now = () => new Date();

function dbOf(opts?: { db?: Db }): Db {
  return opts?.db ?? getDb().db;
}

function zodMessage(issues: { message: string }[]): string {
  return issues.map((issue) => issue.message).join("; ");
}

export function listSales(opts?: { db?: Db }): SaleRow[] {
  const db = dbOf(opts);

  const rows = db
    .select({
      id: sales.id,
      channel: sales.channel,
      saleDate: sales.saleDate,
      status: sales.status,
      grossCents: sales.grossCents,
      feeCents: sales.feeCents,
      netCents: sales.netCents,
      liquidCents: sales.liquidCents,
      invoiceNumber: sales.invoiceNumber,
    })
    .from(sales)
    .orderBy(sql`${sales.saleDate} desc, ${sales.id} desc`)
    .all();

  const items = db
    .select({
      saleId: saleItems.saleId,
      count: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      first: sql<string | null>`min(${saleItems.description})`,
    })
    .from(saleItems)
    .groupBy(saleItems.saleId)
    .all();
  const bySale = new Map(items.map((item) => [item.saleId, item]));

  return rows.map((row) => ({
    ...row,
    itemCount: bySale.get(row.id)?.count ?? 0,
    firstItem: bySale.get(row.id)?.first ?? null,
  }));
}

/** Faturamento bruto do mês (year, month 1–12): vendas normais daquele mês. */
export function monthlyGross(month: { year: number; month: number }, opts?: { db?: Db }): number {
  const db = dbOf(opts);
  const start = new Date(month.year, month.month - 1, 1);
  const end = new Date(month.year, month.month, 1);
  const row = db
    .select({ total: sql<number>`coalesce(sum(${sales.grossCents}), 0)` })
    .from(sales)
    .where(and(eq(sales.status, "normal"), gte(sales.saleDate, start), lt(sales.saleDate, end)))
    .get();
  return row?.total ?? 0;
}

/**
 * Lança venda presencial (T036): faturamento + entrada no caixa, atomicamente.
 * - gross = valor recebido; mercado presencial não tem taxa → fee 0, net = gross.
 * - Custo congelado por item (D6) = custo estimado do produto → liquid = margem.
 * - cProd interno `P<id>` mantém o vínculo produto→item (catálogo continua ok).
 */
export function createPresentialSale(input: unknown, opts?: { db?: Db }): ServiceResult<{ saleId: number }> {
  const db = dbOf(opts);
  const parsed = presentialSaleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const { saleDate, receivedCents, items: lines } = parsed.data;

  const ids = [...new Set(lines.map((line) => line.productId))];
  const found = db.select().from(products).where(inArray(products.id, ids)).all();
  const byId = new Map(found.map((product) => [product.id, product]));

  const totals: Array<{
    product: (typeof found)[number];
    quantity: number;
    unitPriceCents: number;
    frozenCostCents: number;
  }> = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) return { ok: false, error: `produto ${line.productId} não encontrado` };
    if (!product.active) return { ok: false, error: `produto "${product.name}" está inativo` };
    totals.push({
      product,
      quantity: line.quantity,
      unitPriceCents: product.salePriceCents,
      frozenCostCents: product.estimatedCostCents,
    });
  }
  const totalCostCents = totals.reduce((sum, entry) => sum + entry.frozenCostCents * entry.quantity, 0);
  const liquidCents = marginOf(receivedCents, 0, totalCostCents);
  const cashDescription =
    totals.length === 1 ? `Venda presencial — ${totals[0].product.name}` : `Venda presencial (${totals.length} itens)`;

  try {
    const saleId = db.transaction((tx) => {
      const inserted = tx
        .insert(sales)
        .values({
          channel: "presencial",
          saleDate,
          status: "normal",
          grossCents: receivedCents,
          feeCents: 0,
          netCents: receivedCents,
          liquidCents,
          note: "venda presencial (sem NFe)",
        })
        .run();
      const id = Number(inserted.lastInsertRowid);

      tx.insert(saleItems)
        .values(
          totals.map((entry) => ({
            saleId: id,
            productId: entry.product.id,
            cProd: `P${entry.product.id}`,
            description: entry.product.name,
            quantity: entry.quantity,
            unitPriceCents: entry.unitPriceCents,
            frozenCostCents: entry.frozenCostCents,
          })),
        )
        .run();

      // T037: entrada de caixa vinculada à venda (ledger separado, D8)
      tx.insert(cashEntries)
        .values({
          date: saleDate,
          type: "entrada",
          category: "venda",
          amountCents: receivedCents,
          description: cashDescription,
          saleId: id,
          status: "normal",
          createdAt: now(),
        })
        .run();
      return id;
    });
    return { ok: true, value: { saleId } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
