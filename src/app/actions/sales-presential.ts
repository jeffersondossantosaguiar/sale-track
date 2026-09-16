"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { type SaleRow, createPresentialSale, listSales, monthlyGross } from "@/lib/sales/service";
import { revalidatePath } from "next/cache";

/**
 * Server Action da venda PRESENCIAL (US4/T036) — validação zod no service
 * (fonte de verdade = servidor); retorna a lista de vendas + faturamento do mês.
 * T037: a entrada no caixa é criada dentro da mesma transação da venda.
 */

export type PresentialState = {
  sales: SaleRow[];
  monthTotal: number;
  month: { year: number; month: number };
};

function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function presentialState(): Promise<ActionResult<PresentialState>> {
  const db = getDb().db;
  const month = currentMonth();
  return actionData({ sales: listSales({ db }), monthTotal: monthlyGross(month, { db }), month });
}

export async function createPresentialSaleFrom(formData: FormData): Promise<ActionResult<PresentialState>> {
  const db = getDb().db;
  const productIds = formData.getAll("productId").map(Number);
  const quantities = formData.getAll("quantity").map((value) => Number(value));

  const result = createPresentialSale(
    {
      saleDate: String(formData.get("date") ?? ""),
      receivedCents: Number(formData.get("receivedCents") ?? 0),
      items: productIds.map((productId, index) => ({
        productId,
        quantity: Number.isFinite(quantities[index]) ? quantities[index] : 1,
      })),
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/sales");
  revalidatePath("/cash");
  return presentialState();
}
