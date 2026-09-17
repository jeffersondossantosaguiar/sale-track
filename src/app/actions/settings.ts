"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { getSerieChannelMap, setNumberSetting, setSerieChannelMap } from "@/lib/db/settings";
import { getMeiLimitCents } from "@/lib/domain/meieto";
import { parseBrlToCents } from "@/lib/domain/money";
import { revalidatePath } from "next/cache";

/**
 * Configurações (FR-013): teto anual MEI configurável, default R$ 81.000,00.
 * Valor recebido como moeda brasileira ("81000,00"); guardamos centavos inteiros.
 */

export async function setMeiLimitFrom(formData: FormData): Promise<ActionResult<{ meiLimitCents: number }>> {
  const db = getDb().db;
  const input = String(formData.get("value") ?? "");
  let cents: number;
  try {
    cents = parseBrlToCents(input);
  } catch {
    return actionError("Valor do teto inválido — use moeda brasileira (ex.: 81.000,00).");
  }
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return actionError("O teto precisa ser um valor maior que zero.");
  }
  setNumberSetting("mei_limit_cents", cents, { db });
  revalidatePath("/");
  return actionData({ meiLimitCents: getMeiLimitCents({ db }) });
}

/**
 * Salva as séries de emissão de UM canal (detecção na importação NFe). Recebe
 * `channel` (shopee|tiktok) e `series` (JSON array de strings numéricas). Mescla
 * com o mapa atual: as séries deste canal são substituídas pelas enviadas; as dos
 * demais canais permanecem. Revalida /sales (a prévia do import usa o mapa como prop).
 */
export async function saveSerieChannelMapAction(formData: FormData): Promise<ActionResult<{ saved: boolean }>> {
  const db = getDb().db;
  const channel = String(formData.get("channel") ?? "");
  if (channel !== "shopee" && channel !== "tiktok") return actionError("Canal inválido.");
  const raw = String(formData.get("series") ?? "");
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return actionError("Lista de séries inválida.");
  }
  if (!Array.isArray(list)) return actionError("Lista de séries inválida.");
  const series = new Set<string>();
  for (const item of list) {
    if (typeof item !== "string" || !/^\d+$/.test(item)) return actionError(`Série inválida: "${String(item)}".`);
    series.add(item);
  }
  const map = getSerieChannelMap({ db });
  for (const serie of Object.keys(map)) {
    if (map[serie] === channel) delete map[serie];
  }
  for (const serie of series) map[serie] = channel;
  setSerieChannelMap(map, { db });
  revalidatePath("/sales");
  revalidatePath("/settings/channels");
  return actionData({ saved: true });
}
