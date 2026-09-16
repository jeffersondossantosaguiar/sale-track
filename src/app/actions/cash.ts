"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { type CashEntryRow, createCashEntry, listCashEntries, reverseCashEntry } from "@/lib/cash/service";
import { getDb } from "@/lib/db/client";
import type { CashCategory, CashType } from "@/lib/domain/cash";
import { type CashSummary, summarize } from "@/lib/domain/cashier";
import { revalidatePath } from "next/cache";

/**
 * Server Actions do CAIXA (US3/T032) — mesma estratégia do catálogo: validação
 * zod no service, servidor é a fonte da verdade (retorna lista + resumo) e
 * revalidação de rota. Estorno (D7): cria reversão com data própria, nunca exclui.
 */

export type CashState = { entries: CashEntryRow[]; summary: CashSummary };

async function cashState(): Promise<ActionResult<CashState>> {
  const db = getDb().db;
  const entries = listCashEntries({ db });
  return actionData({ entries, summary: summarize(entries) });
}

export async function createCashEntryFrom(formData: FormData): Promise<ActionResult<CashState>> {
  const db = getDb().db;
  const saleIdRaw = String(formData.get("saleId") ?? "").trim();
  const result = createCashEntry(
    {
      date: String(formData.get("date") ?? ""),
      type: String(formData.get("type") ?? "") as CashType,
      category: String(formData.get("category") ?? "") as CashCategory,
      amountCents: Number(formData.get("amountCents") ?? 0),
      description: String(formData.get("description") ?? ""),
      saleId: saleIdRaw ? Number(saleIdRaw) : null,
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/cash");
  return cashState();
}

export async function reverseCashEntryFrom(formData: FormData): Promise<ActionResult<CashState>> {
  const db = getDb().db;
  const result = reverseCashEntry(Number(formData.get("id")), { date: String(formData.get("date") ?? "") }, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/cash");
  return cashState();
}
