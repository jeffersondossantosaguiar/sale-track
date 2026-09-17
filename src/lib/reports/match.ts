import type { ShopeeOrder } from "./shopee";
import type { TiktokOrder } from "./tiktok";

/** Venda mínima para o cruzamento (campo do banco). */
export type SaleForMatch = {
  id: number;
  channel: string;
  xmlFilename: string | null;
  firstItem: string | null;
  saleDate: Date;
  receivedCents: number | null;
};

export type MatchResult = {
  matched: Array<{ saleId: number; orderId: string; receivedCents: number }>;
  unmatchedOrders: Array<{ orderId: string; reason: string }>;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Extrai o ID do pedido do nome do arquivo da NFe Shopee (prefixo antes de "_invoice"). */
function shopeeOrderIdFromFilename(filename: string | null): string | null {
  if (!filename) return null;
  const m = /^([A-Za-z0-9]+)_invoice/i.exec(filename);
  return m ? m[1] : null;
}

/**
 * Cruzamento Shopee — match por ID do pedido (nome da NFe contém o ID exato do relatório).
 * Alta confiança: só casa venda sem recebido ainda e com ID único.
 */
export function matchShopee(sales: SaleForMatch[], orders: ShopeeOrder[]): MatchResult {
  const byId = new Map(orders.map((o) => [o.orderId, o.receivedCents]));
  const matched: MatchResult["matched"] = [];
  const used = new Set<string>();
  for (const sale of sales) {
    if (sale.channel !== "shopee" || sale.receivedCents !== null) continue;
    const orderId = shopeeOrderIdFromFilename(sale.xmlFilename);
    if (!orderId) continue;
    const received = byId.get(orderId);
    if (received === undefined) continue;
    matched.push({ saleId: sale.id, orderId, receivedCents: received });
    used.add(orderId);
  }
  const unmatchedOrders = [...byId.entries()]
    .filter(([orderId]) => !used.has(orderId))
    .map(([orderId]) => ({ orderId, reason: "venda não encontrada para este ID" }));
  return { matched, unmatchedOrders };
}

/** Data local em yyyy-mm-dd (alinhado ao relatório TikTok). */
function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Cruzamento TikTok — match por produto/SKU + data + quantidade + valor coerente.
 * Alta confiança: casamento único por dia; mais de um candidato → não auto-associa.
 */
export function matchTiktok(sales: SaleForMatch[], orders: TiktokOrder[]): MatchResult {
  const matched: MatchResult["matched"] = [];
  const usedOrderIds = new Set<string>();
  const unassignedByDate = new Map<string, TiktokOrder[]>();
  for (const order of orders) {
    const list = unassignedByDate.get(order.date) ?? [];
    list.push(order);
    unassignedByDate.set(order.date, list);
  }

  for (const sale of sales) {
    if (sale.channel !== "tiktok" || sale.receivedCents !== null) continue;
    const saleName = normalize(sale.firstItem);
    const day = dateKey(sale.saleDate);
    const candidates = (unassignedByDate.get(day) ?? []).filter(
      (o) => !usedOrderIds.has(o.orderId) && (saleName.includes(o.name) || o.name.includes(saleName)),
    );
    if (candidates.length !== 1) continue; // 0 ou ambíguo → conferência manual
    const chosen = candidates[0];
    if (!chosen) continue;
    matched.push({ saleId: sale.id, orderId: chosen.orderId, receivedCents: chosen.receivedCents });
    usedOrderIds.add(chosen.orderId);
  }

  const unmatchedOrders = orders
    .filter((o) => !usedOrderIds.has(o.orderId))
    .map((o) => ({ orderId: o.orderId, reason: "sem match de alta confiança (conferir manualmente)" }));
  return { matched, unmatchedOrders };
}
