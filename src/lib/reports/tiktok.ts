import { parseReportFile } from "./grid";

/** Pedido TikTok com dados para cruzamento e o valor a liquidar (recebido). */
export type TiktokOrder = {
  orderId: string;
  sku: string;
  name: string;
  date: string; // yyyy-mm-dd (Data de criação do pedido)
  qty: number;
  receivedCents: number;
};

function asCents(raw: string): number {
  const cleaned = raw.trim().replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const value = Math.round(Number(cleaned) * 100);
  return Number.isFinite(value) ? value : 0;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Parseia o relatório de renda do TikTok ("income...") — aba "Detalhes do pedido".
 * Extrai por pedido: ID, SKU, nome, data de criação, quantidade e "Valor total a ser
 * liquidado" (o recebido). Linhas de reembolso (valor 0 ou sem data) são ignoradas.
 */
export function parseTiktokReport(filename: string, data: ArrayBuffer | Buffer | Uint8Array | string): TiktokOrder[] {
  const grid = parseReportFile(filename, data);
  const headerIdx = grid.findIndex(
    (row) =>
      row.some((c) => c.includes("ID do pedido/ajuste")) && row.some((c) => c.includes("Valor total a ser liquidado")),
  );
  if (headerIdx < 0) throw new Error("relatório TikTok: aba 'Detalhes do pedido' não encontrada");
  const header = grid[headerIdx] ?? [];
  const col = (needle: string) => header.findIndex((c) => c.includes(needle));
  const colOrderId = col("ID do pedido/ajuste");
  const colSku = col("ID do SKU");
  const colName = col("Nome do produto");
  const colDate = col("Data de criação do pedido");
  const colQty = col("Quantidade");
  const colValue = col("Valor total a ser liquidado");
  if ([colOrderId, colSku, colName, colDate, colQty, colValue].some((c) => c < 0)) {
    throw new Error("relatório TikTok: colunas de pedido não encontradas");
  }

  const orders: TiktokOrder[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const orderId = (row[colOrderId] ?? "").trim();
    const receivedCents = asCents(row[colValue] ?? "");
    if (!orderId || receivedCents <= 0) continue; // ignora reembolsos/ajustes (005)
    const dateRaw = (row[colDate] ?? "").trim();
    const date = (dateRaw.match(/\d{4}[/-]\d{2}[/-]\d{2}/)?.[0] ?? "").replace(/\//g, "-");
    if (!date) continue;
    orders.push({
      orderId,
      sku: normalizeName(row[colSku] ?? ""),
      name: normalizeName(row[colName] ?? ""),
      date,
      qty: Math.max(1, Math.round(Number(row[colQty] ?? "1") || 1)),
      receivedCents,
    });
  }
  return orders;
}
