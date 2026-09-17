"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { getNumberSetting, setNumberSetting } from "@/lib/db/settings";
import { FEE_CHANNELS, channelFeeFixedSettingKey, channelFeeSettingKey, normalizeBps } from "@/lib/domain/fees";
import {
  type ChannelSummaryRow,
  type SaleRow,
  byChannelSummary,
  getChannelFeeBps,
  listSales,
  reverseSale,
  setSaleFee,
} from "@/lib/sales/service";
import type { Channel } from "@/lib/xml/channel";
import { revalidatePath } from "next/cache";

/**
 * Server Actions de TAXAS (US5/T039) — default do canal (settings, % configurável)
 * e taxa por venda (editável). Servidor = fonte da verdade: retorna a lista de
 * vendas, o resumo por canal e os percentuais configurados.
 */

export type FeesState = {
  sales: SaleRow[];
  byChannel: ChannelSummaryRow[];
  channelFees: Record<Channel, number>;
  channelFixedFees: Record<Channel, number>;
};

async function feesState(): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  const channelFees = Object.fromEntries(
    FEE_CHANNELS.map((channel) => [channel, getChannelFeeBps(channel, { db })]),
  ) as Record<Channel, number>;
  const channelFixedFees = Object.fromEntries(
    FEE_CHANNELS.map((channel) => [channel, getNumberSetting(channelFeeFixedSettingKey(channel), 0, { db })]),
  ) as Record<Channel, number>;
  return actionData({ sales: listSales({ db }), byChannel: byChannelSummary({ db }), channelFees, channelFixedFees });
}

/** Edita a taxa de uma venda específica (cenário US5.2). */
export async function setSaleFeeFrom(formData: FormData): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  const result = setSaleFee(Number(formData.get("id")), Number(formData.get("bps")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/sales");
  return feesState();
}

/** Configura a % padrão e a taxa fixa de um canal (002/FR-013). */
export async function setChannelFeeFrom(formData: FormData): Promise<ActionResult<FeesState>> {
  const db = getDb().db;
  const channel = String(formData.get("channel")) as Channel;
  const bps = normalizeBps(Number(formData.get("bps")));
  setNumberSetting(channelFeeSettingKey(channel), bps, { db });
  const fixed = Number(formData.get("fixedCents")) || 0;
  setNumberSetting(channelFeeFixedSettingKey(channel), Math.max(0, Math.round(fixed)), { db });
  revalidatePath("/sales");
  revalidatePath("/products");
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
