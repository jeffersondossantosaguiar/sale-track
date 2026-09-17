"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { matchShopee, matchTiktok } from "@/lib/reports/match";
import { parseShopeeReport } from "@/lib/reports/shopee";
import { parseTiktokReport } from "@/lib/reports/tiktok";
import { listSales, setReceived } from "@/lib/sales/service";
import { revalidatePath } from "next/cache";

/**
 * Importação de relatório (005/US3) — cruza NFe ↔ relatório e preenche o recebido.
 * Shopee: match por ID do pedido (nome da NFe). TikTok: produto/SKU + data + qty +
 * valor coerente. Ambíguos/sem match vão para a conferência manual (não são auto-associados).
 */

export type ReportImportState = {
  channel: string;
  matched: number;
  unmatched: Array<{ orderId: string; reason: string }>;
};

export async function importReportAction(formData: FormData): Promise<ActionResult<ReportImportState>> {
  const db = getDb().db;
  const channel = String(formData.get("channel") ?? "");
  const file = formData.get("file");
  if (channel !== "shopee" && channel !== "tiktok") return actionError("canal inválido");
  if (!(file instanceof File) || file.size === 0) return actionError("envie um arquivo de relatório (.xlsx ou .csv)");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sales = listSales({ db }).map((sale) => ({
    id: sale.id,
    channel: sale.channel,
    xmlFilename: sale.xmlFilename,
    firstItem: sale.firstItem,
    saleDate: sale.saleDate,
    receivedCents: sale.receivedCents,
  }));

  try {
    if (channel === "shopee") {
      const orders = parseShopeeReport(file.name, bytes);
      const result = matchShopee(sales, orders);
      for (const m of result.matched) setReceived(m.saleId, m.receivedCents, { db });
      revalidatePath("/sales");
      revalidatePath("/");
      return actionData({
        channel,
        matched: result.matched.length,
        unmatched: result.unmatchedOrders,
      });
    }
    const orders = parseTiktokReport(file.name, bytes);
    const result = matchTiktok(sales, orders);
    for (const m of result.matched) setReceived(m.saleId, m.receivedCents, { db });
    revalidatePath("/sales");
    revalidatePath("/");
    return actionData({
      channel,
      matched: result.matched.length,
      unmatched: result.unmatchedOrders,
    });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : String(error));
  }
}
