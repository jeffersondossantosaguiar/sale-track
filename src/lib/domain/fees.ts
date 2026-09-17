import type { Channel } from "@/lib/xml/channel";
import { reaisToCents } from "./money";

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

/** Canais com tabela de faixas de taxa para precificação (005). */
export const FEE_TIERS_CHANNELS: Channel[] = ["shopee", "tiktok"];

/** Faixas de taxa por canal (005). maxCents null = aberto acima. Sem subsídio (decisão do dono). */
export const DEFAULT_FEE_TIERS: Record<
  string,
  Array<{ minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number }>
> = {
  shopee: [
    { minCents: 0, maxCents: 7_999, commissionBps: 2000, fixedCents: 4_00 }, // ≤ R$79,99 → 20% + R$4
    { minCents: 8_000, maxCents: 9_999, commissionBps: 1400, fixedCents: 4_00 }, // 80–99,99 → 14% + R$4
    { minCents: 10_000, maxCents: 19_999, commissionBps: 1400, fixedCents: 20_00 }, // 100–199,99 → 14% + R$20
    { minCents: 20_000, maxCents: 49_999, commissionBps: 1400, fixedCents: 26_00 }, // 200–499,99 → 14% + R$26
    { minCents: 50_000, maxCents: null, commissionBps: 1400, fixedCents: 26_00 }, // ≥500 → 14% + R$26
  ],
  tiktok: [
    { minCents: 0, maxCents: 4_999, commissionBps: 1000, fixedCents: 4_00 }, // < R$50 → 10% + R$4
    { minCents: 5_000, maxCents: null, commissionBps: 600, fixedCents: 6_00 }, // ≥ R$50 → 6% + R$6
  ],
};

/** Faixa serializada p/ o editor de texto (ex.: "<= 79,99 = 20% + 4"). */
export function formatTierForText(tier: {
  minCents: number;
  maxCents: number | null;
  commissionBps: number;
  fixedCents: number;
}): string {
  const range =
    tier.maxCents === null
      ? `>= ${(tier.minCents / 100).toFixed(2).replace(".", ",")}`
      : tier.minCents === 0
        ? `<= ${(tier.maxCents / 100).toFixed(2).replace(".", ",")}`
        : `${(tier.minCents / 100).toFixed(2).replace(".", ",")} - ${(tier.maxCents / 100).toFixed(2).replace(".", ",")}`;
  const commission = `${(tier.commissionBps / 100).toFixed(0).replace(".", ",")}%`;
  const fixed = (tier.fixedCents / 100).toFixed(2).replace(".", ",");
  return `${range} = ${commission} + ${fixed}`;
}

type ParsedTier = { minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number };

const REAIS = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;
const NUM = /^\d+(?:,\d+)?$/;

function parseReaisToCents(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, "");
  if (!NUM.test(cleaned)) throw new Error(`valor inválido: "${raw}"`);
  return reaisToCents(Number(cleaned.replace(",", ".")));
}

/**
 * Parseia o texto do editor de faixas (005) — uma regra por linha, ex.:
 *   "<= 79,99 = 20% + 4"
 *   "80,00 - 99,99 = 14% + 4"
 *   ">= 500,00 = 14% + 26"
 * Retorna faixas ordenadas por min; lança RangeError com mensagem clara em caso de
 * formato inválido, faixa invertida ou sobreposição.
 */
export function parseFeeTiersText(text: string): ParsedTier[] {
  const tiers: ParsedTier[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new RangeError("informe ao menos uma faixa");
  for (const line of lines) {
    const eqIdx = line.lastIndexOf("=");
    if (eqIdx <= 0) throw new RangeError(`formato inválido (use "<= 79,99 = 20% + 4"): ${line}`);
    const range = line.slice(0, eqIdx).trim();
    const fee = line.slice(eqIdx + 1).trim();
    const feeMatch = /^(\d+(?:,\d+)?)%\s*\+\s*([\d.,]+)$/.exec(fee);
    if (!feeMatch) throw new RangeError(`taxa inválida (use "20% + 4"): ${fee}`);
    const commissionBps = percentToBps(Number((feeMatch[1] ?? "").replace(",", ".")));
    const fixedCents = parseReaisToCents(feeMatch[2] ?? "");

    let minCents: number;
    let maxCents: number | null;
    const le = /^<=\s*([\d.,]+)$/.exec(range);
    const ge = /^>=\s*([\d.,]+)$/.exec(range);
    const between = /^([\d.,]+)\s*-\s*([\d.,]+)$/.exec(range);
    if (le) {
      minCents = 0;
      maxCents = parseReaisToCents(le[1] ?? "");
    } else if (ge) {
      minCents = parseReaisToCents(ge[1] ?? "");
      maxCents = null;
    } else if (between) {
      minCents = parseReaisToCents(between[1] ?? "");
      maxCents = parseReaisToCents(between[2] ?? "");
    } else {
      throw new RangeError(`faixa inválida (use "<= X", ">= X" ou "A - B"): ${range}`);
    }
    if (maxCents !== null && minCents > maxCents) {
      throw new RangeError(`faixa invertida (mín > máx): ${line}`);
    }
    tiers.push({ minCents, maxCents, commissionBps, fixedCents });
  }

  tiers.sort((a, b) => a.minCents - b.minCents);
  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1];
    const curr = tiers[i];
    if (!prev || !curr) continue;
    if (prev.maxCents !== null && prev.maxCents >= curr.minCents) {
      throw new RangeError("faixas se sobrepõem (verifique limites)");
    }
    if (prev.maxCents === null) throw new RangeError("faixa superior não pode ter faixa após ela");
  }
  return tiers;
}
