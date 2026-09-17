"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import {
  type ChannelSummaryRow,
  type SaleRow,
  byChannelSummary,
  listSales,
  reverseSale,
  setReceived,
  setSaleFee,
} from "@/lib/sales/service";
import { revalidatePath } from "next/cache";

/**
 * Server Actions de Vendas/Taxas (005) — apuração por RECEBIDO (fonte da verdade).
 * Servidor = fonte da verdade: retorna a lista de vendas e o resumo por canal.
 * O antigo "setChannelFeeFrom" (taxa % + fixa por canal) foi removido — a taxa agora
 * é derivada (produto − recebido) e a precificação usa a tabela de faixas.
 */

export type FeesState = {
  sales: SaleRow[];
  byChannel: ChannelSummaryRow[];
};

async function feesState(): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  return actionData({ sales: listSales({ db }), byChannel: byChannelSummary({ db }) });
}

/** Define o RECEBIDO de uma venda (005) — fonte da verdade do lucro. */
export async function setReceivedFrom(formData: FormData): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  const raw = String(formData.get("receivedCents") ?? "").trim();
  const receivedCents = raw === "" ? null : Number(raw);
  const result = setReceived(Number(formData.get("id")), receivedCents, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/sales");
  revalidatePath("/");
  return feesState();
}

/** Ajusta a taxa de uma venda (legado, T040). Mantido para compatibilidade; na apuração por recebido a taxa é derivada. */
export async function setSaleFeeFrom(formData: FormData): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  const result = setSaleFee(Number(formData.get("id")), Number(formData.get("bps")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/sales");
  return feesState();
}

/**
 * Estorna UMA venda (FR-011/T048): sai do faturamento e, se entrou no caixa,
 * reverte com reembolso na data informada. Retorna o mesmo estado das taxas.
 */
export async function reverseSaleFrom(formData: FormData): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  const result = reverseSale(
    Number(formData.get("id")),
    {
      refundDate: String(formData.get("date") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/sales");
  revalidatePath("/");
  return feesState();
}
