import { netOfReceived } from "@/lib/domain/cxmoney";
import { type SQL, and, eq } from "drizzle-orm";
import { type Db, getDb } from "../db/client";
import { productCodes, saleItems, sales, variants } from "../db/schema";
import type { Channel } from "./channel";
import { linkItems } from "./link";
import type { ParsedInvoice } from "./parser";

/**
 * Importação de uma NFe parseada para o banco (T015/T019).
 * - Dedup (D4): mesma (nNF, serie, dhEmi) nunca importa 2x (unique index também).
 * - Itens vinculados por cProd → product_codes; custo congelado (D6).
 * - Venda e itens numa única transação (all-or-nothing).
 */

export type ImportOutcome =
  | {
      ok: true;
      saleId: number;
      unlinked: Array<{ cProd: string; description: string }>;
      duplicatedByIndex?: false;
    }
  | { ok: false; reason: "duplicate"; invoiceNumber: string; serie: string }
  | { ok: false; reason: "error"; error: string };

/** Constrói o predicado de dedup da nota (mesma chave do unique index). */
function dedupWhere(invoice: ParsedInvoice): SQL {
  return (and(
    eq(sales.invoiceNumber, invoice.invoiceNumber),
    eq(sales.invoiceSerie, invoice.serie),
    eq(sales.issueDate, invoice.issueDate),
  ) ?? undefined) as SQL;
}

export function importNfeToDb(
  invoice: ParsedInvoice,
  channel: Channel,
  filename: string,
  options: { db?: Db } = {},
): ImportOutcome {
  const db = options.db ?? getDb().db;

  const existing = db.select({ id: sales.id }).from(sales).where(dedupWhere(invoice)).get();
  if (existing) {
    return {
      ok: false,
      reason: "duplicate",
      invoiceNumber: invoice.invoiceNumber,
      serie: invoice.serie,
    };
  }

  const codes = db
    .select({
      code: productCodes.code,
      channel: productCodes.channel,
      variant: {
        id: variants.id,
        costCents: variants.costCents,
      },
    })
    .from(productCodes)
    .innerJoin(variants, eq(variants.id, productCodes.variantId))
    .all();

  const linked = linkItems(invoice.items, channel, codes);
  const unlinked = invoice.items
    .map((item, index) => ({ item, linked: linked[index] }))
    .filter(({ linked }) => linked.variantId === null)
    .map(({ item }) => ({ cProd: item.cProd, description: item.description }));

  // 005 — recebido ausente na importação (relatório/manual depois); lucro fica pendente (0).
  const netCents = netOfReceived(null, invoice.grossCents);
  const liquidCents = 0; // pendente — recebido ainda não informado

  try {
    const saleId = db.transaction((tx) => {
      const inserted = tx
        .insert(sales)
        .values({
          channel,
          saleDate: invoice.issueDate,
          grossCents: invoice.grossCents,
          freightCents: invoice.freightCents ?? 0,
          receivedCents: null,
          feeCents: 0, // derivado após recebido informado
          netCents,
          liquidCents,
          invoiceNumber: invoice.invoiceNumber,
          invoiceSerie: invoice.serie,
          issueDate: invoice.issueDate,
          xmlFilename: filename,
        })
        .run();
      const saleId = Number(inserted.lastInsertRowid);

      tx.insert(saleItems)
        .values(
          invoice.items.map((item, index) => ({
            saleId,
            variantId: linked[index].variantId,
            cProd: item.cProd,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            frozenCostCents: linked[index].frozenCostCents,
          })),
        )
        .run();
      return saleId;
    });
    return { ok: true, saleId, unlinked };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return {
        ok: false,
        reason: "duplicate",
        invoiceNumber: invoice.invoiceNumber,
        serie: invoice.serie,
      };
    }
    return { ok: false, reason: "error", error: error instanceof Error ? error.message : String(error) };
  }
}
