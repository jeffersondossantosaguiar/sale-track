import { type Db, getDb } from "@/lib/db/client";
import { cashEntries, saleItems, sales, variantPrices, variants } from "@/lib/db/schema";
import { getNumberSetting, getSetting } from "@/lib/db/settings";
import { feeFromBps, marginOf, netOf } from "@/lib/domain/cxmoney";
import { dateSchema } from "@/lib/domain/date";
import { MAX_FEE_BPS, channelFeeFixedSettingKey, channelFeeSettingKey, normalizeBps } from "@/lib/domain/fees";
import { presentialSaleInputSchema } from "@/lib/domain/presential";
import type { Channel } from "@/lib/xml/channel";
import { type SQL, and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

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

export type FiscalMonth = { year: number; month: number };

/** Limites local do mês (início inclusivo / fim exclusivo) — padrão do projeto (local midnight). */
export function monthRange(month: FiscalMonth): { start: Date; end: Date } {
  return { start: new Date(month.year, month.month - 1, 1), end: new Date(month.year, month.month, 1) };
}

/** Faturamento bruto do mês (year, month 1–12): vendas normais daquele mês. */
export function monthlyGross(month: FiscalMonth, opts?: { db?: Db }): number {
  const db = dbOf(opts);
  const { start, end } = monthRange(month);
  const row = db
    .select({ total: sql<number>`coalesce(sum(${sales.grossCents}), 0)` })
    .from(sales)
    .where(and(eq(sales.status, "normal"), gte(sales.saleDate, start), lt(sales.saleDate, end)))
    .get();
  return row?.total ?? 0;
}

/** Faturamento anual (year, ano-calendário): vendas normais de 1º jan a 31 dez (local). */
export function annualGross(year: number, opts?: { db?: Db }): number {
  const db = dbOf(opts);
  const row = db
    .select({ total: sql<number>`coalesce(sum(${sales.grossCents}), 0)` })
    .from(sales)
    .where(
      and(
        eq(sales.status, "normal"),
        gte(sales.saleDate, new Date(year, 0, 1)),
        lt(sales.saleDate, new Date(year + 1, 0, 1)),
      ),
    )
    .get();
  return row?.total ?? 0;
}

/**
 * Lança venda presencial (T036): faturamento + entrada no caixa, atomicamente.
 * - gross = valor recebido; mercado presencial não tem taxa → fee 0, net = gross.
 * - Custo congelado por item (D6) = custo da VARIANTE → liquid = margem.
 * - cProd interno `V<id>` mantém o vínculo variante→item (catálogo continua ok).
 * - Presencial está fora do escopo da precificação por canal (002): a unidade de
 *   preço é informativa (maior praticado do catálogo ou custo).
 */
export function createPresentialSale(input: unknown, opts?: { db?: Db }): ServiceResult<{ saleId: number }> {
  const db = dbOf(opts);
  const parsed = presentialSaleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const { saleDate, receivedCents, items: lines } = parsed.data;

  const ids = [...new Set(lines.map((line) => line.variantId))];
  const found = db.select().from(variants).where(inArray(variants.id, ids)).all();
  const byId = new Map(found.map((variant) => [variant.id, variant]));

  const practicedByVariant = new Map<number, number>();
  const prices = db.select().from(variantPrices).where(inArray(variantPrices.variantId, ids)).all();
  for (const price of prices) {
    practicedByVariant.set(
      price.variantId,
      Math.max(practicedByVariant.get(price.variantId) ?? 0, price.practicedPriceCents),
    );
  }

  const totals: Array<{
    variant: (typeof found)[number];
    quantity: number;
    unitPriceCents: number;
    frozenCostCents: number;
  }> = [];
  for (const line of lines) {
    const variant = byId.get(line.variantId);
    if (!variant) return { ok: false, error: `variante ${line.variantId} não encontrada` };
    if (!variant.active) return { ok: false, error: `variante "${variant.name}" está inativa` };
    totals.push({
      variant,
      quantity: line.quantity,
      unitPriceCents: practicedByVariant.get(variant.id) ?? variant.costCents,
      frozenCostCents: variant.costCents,
    });
  }
  const totalCostCents = totals.reduce((sum, entry) => sum + entry.frozenCostCents * entry.quantity, 0);
  const liquidCents = marginOf(receivedCents, 0, totalCostCents);
  const cashDescription =
    totals.length === 1 ? `Venda presencial — ${totals[0].variant.name}` : `Venda presencial (${totals.length} itens)`;

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
            variantId: entry.variant.id,
            cProd: `V${entry.variant.id}`,
            description: entry.variant.name,
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

/* ============================ Taxas (US5/T039–T040) ============================ */

/** % padrão configurada para um canal (0 quando ausente) — usada na importação. */
export function getChannelFeeBps(channel: Channel, opts?: { db?: Db }): number {
  return normalizeBps(getSetting(channelFeeSettingKey(channel), opts));
}

/** Taxa FIXA (centavos) padrão por canal (002/FR-013) — usada no preço sugerido. */
export function getChannelFeeFixedCents(channel: Channel, opts?: { db?: Db }): number {
  return getNumberSetting(channelFeeFixedSettingKey(channel), 0, opts);
}

export type ChannelSummaryRow = {
  channel: string;
  count: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
};

/** Resumo por canal do faturamento normal: bruto, total de taxas e líquido (US5.3). */
export function byChannelSummary(opts?: { db?: Db; month?: FiscalMonth }): ChannelSummaryRow[] {
  const db = dbOf(opts);
  const conditions: SQL[] = [eq(sales.status, "normal")];
  if (opts?.month) {
    const { start, end } = monthRange(opts.month);
    conditions.push(gte(sales.saleDate, start), lt(sales.saleDate, end));
  }
  return db
    .select({
      channel: sales.channel,
      count: sql<number>`count(*)`,
      grossCents: sql<number>`coalesce(sum(${sales.grossCents}), 0)`,
      feeCents: sql<number>`coalesce(sum(${sales.feeCents}), 0)`,
      netCents: sql<number>`coalesce(sum(${sales.netCents}), 0)`,
    })
    .from(sales)
    .where(and(...conditions))
    .groupBy(sales.channel)
    .orderBy(sql`${sales.channel}`)
    .all() as ChannelSummaryRow[];
}

/** Custo total congelado de uma venda (Σ frozenCost × qty). */
function totalCostCentsOf(db: Db, saleId: number): number {
  const row = db
    .select({ cost: sql<number>`coalesce(sum(${saleItems.frozenCostCents} * ${saleItems.quantity}), 0)` })
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId))
    .get();
  return row?.cost ?? 0;
}

/**
 * Ajusta a taxa de UMA venda (T040/T041): taxa → líquido → margem, SEM nunca
 * tocar o bruto (faturamento da NFe é imutável). O caixa não muda (ledger D8).
 */
export function setSaleFee(saleId: number, feeBps: number, opts?: { db?: Db }): ServiceResult<{ sale: SaleRow }> {
  const db = dbOf(opts);
  if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > MAX_FEE_BPS) {
    return { ok: false, error: `taxa deve estar entre 0% e 100% (${feeBps})` };
  }
  const sale = db.select().from(sales).where(eq(sales.id, saleId)).get();
  if (!sale) return { ok: false, error: "venda não encontrada" };

  const feeCents = feeFromBps(sale.grossCents, Math.round(feeBps));
  const netCents = netOf(sale.grossCents, feeCents);
  const liquidCents = marginOf(sale.grossCents, feeCents, totalCostCentsOf(db, saleId));
  db.update(sales).set({ feeCents, netCents, liquidCents }).where(eq(sales.id, saleId)).run();

  const row = listSales({ db }).find((candidate) => candidate.id === saleId);
  if (!row) return { ok: false, error: "venda não encontrada após atualização" };
  return { ok: true, value: { sale: row } };
}

/**
 * Estorna UMA venda (FR-011/T048): status `refunded` + refundDate com data própria.
 * NFe imutável: o bruto e a taxa ficam gravados (registro do fato); a venda sai
 * de todo faturamento (todos os agregados filtram status normal). Ledger D8:
 * se a venda entrou no caixa (presencial), gera reembolso de MESMO valor (saída,
 * categoria venda) na data do estorno; importadas (sem caixa) não geram NADA —
 * nenhuma saída fantasma. Idempotência: estornar de novo é erro (D7).
 */
export function reverseSale(
  saleId: number,
  input: { refundDate: string | Date; description?: string },
  opts?: { db?: Db },
): ServiceResult<{ sale: SaleRow }> {
  const db = dbOf(opts);
  const sale = db.select().from(sales).where(eq(sales.id, saleId)).get();
  if (!sale) return { ok: false, error: "venda não encontrada" };
  if (sale.status === "refunded") return { ok: false, error: "venda já estornada" };

  const parsed = reverseSaleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const { refundDate, description } = parsed.data;

  db.update(sales).set({ status: "refunded", refundDate }).where(eq(sales.id, saleId)).run();

  const cashIn = db
    .select({ total: sql<number>`coalesce(sum(${cashEntries.amountCents}), 0)` })
    .from(cashEntries)
    .where(and(eq(cashEntries.saleId, saleId), eq(cashEntries.type, "entrada")))
    .get();
  if (cashIn?.total) {
    db.insert(cashEntries)
      .values({
        date: refundDate,
        type: "saida",
        category: "venda",
        amountCents: cashIn.total,
        description: description || `Estorno de venda ${sale.channel} (${saleDateLabel(sale.saleDate)})`,
        saleId,
        status: "normal",
        createdAt: now(),
      })
      .run();
  }

  const row = listSales({ db }).find((candidate) => candidate.id === saleId);
  if (!row) return { ok: false, error: "venda não encontrada após atualização" };
  return { ok: true, value: { sale: row } };
}

const reverseSaleInputSchema = z.object({
  refundDate: dateSchema,
  description: z.string().trim().max(140, "descrição muito longa (máx. 140)").optional().default(""),
});

function saleDateLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}
