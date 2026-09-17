import type { Channel } from "@/lib/xml/channel";

/**
 * Taxas padrão por canal (US5/T039–T040) — puras, sem I/O.
 * A % padrão de cada canal vive em `settings` (chave `channel_fee_bps_<canal>`)
 * e é aplicada na importação: a taxa da venda nasce = % do canal (editável
 * depois, T041). Sem configuração, a taxa nasce 0. Sobreteto: nada > 100% ou < 0.
 */

export const DEFAULT_CHANNEL_FEE_BPS = 0;
export const MAX_FEE_BPS = 10_000; // 100%

export function channelFeeSettingKey(channel: string): string {
  return `channel_fee_bps_${channel}`;
}

/** Chave da taxa FIXA (centavos) por canal (002/FR-013). */
export function channelFeeFixedSettingKey(channel: string): string {
  return `channel_fee_fixed_cents_${channel}`;
}

/** Normaliza o valor salvo em settings para bps seguros (0..10000). */
export function normalizeBps(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === "") return DEFAULT_CHANNEL_FEE_BPS;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_CHANNEL_FEE_BPS;
  return Math.min(Math.max(Math.round(value), 0), MAX_FEE_BPS);
}

/**
 * Percentual → basis points (004). O painel envia a taxa como percentual
 * (ex.: 20 = 20%); a settings grava bps (ex.: 2000). Normaliza e limita a 0..100%.
 */
export function percentToBps(percent: number): number {
  return normalizeBps(percent * 100);
}

export const FEE_CHANNELS: Channel[] = ["shopee", "tiktok", "presencial"];
