"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { setNumberSetting } from "@/lib/db/settings";
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
