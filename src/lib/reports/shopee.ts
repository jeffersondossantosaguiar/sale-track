import { parseReportFile } from "./grid";

/** Pedido Shopee com o valor que caiu na conta (Renda do pedido). */
export type ShopeeOrder = {
  orderId: string;
  receivedCents: number;
};

function asCents(raw: string): number {
  const cleaned = raw.trim().replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const value = Math.round(Number(cleaned) * 100);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Parseia o relatório de saldo da Shopee ("my_balance_transaction_report...") para
 * os pedidos com recebido. Busca a linha de cabeçalho com "Tipo de transação" /
 * "ID do pedido" / "Valor" e extrai as transações "Renda do pedido".
 */
export function parseShopeeReport(filename: string, data: ArrayBuffer | Buffer | Uint8Array | string): ShopeeOrder[] {
  const grid = parseReportFile(filename, data);
  const headerIdx = grid.findIndex(
    (row) =>
      row.some((c) => c.includes("Tipo de transação")) &&
      row.some((c) => c.includes("ID do pedido")) &&
      row.some((c) => c.includes("Valor")),
  );
  if (headerIdx < 0) throw new Error("relatório Shopee: cabeçalho de transações não encontrado");
  const header = grid[headerIdx] ?? [];
  const colType = header.findIndex((c) => c.includes("Tipo de transação"));
  const colId = header.findIndex((c) => c.includes("ID do pedido"));
  const colValue = header.findIndex((c) => c.trim().toLowerCase() === "valor");
  if (colType < 0 || colId < 0 || colValue < 0) {
    throw new Error("relatório Shopee: colunas de transação não encontradas");
  }

  const orders: ShopeeOrder[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const type = (row[colType] ?? "").trim();
    if (!type.includes("Renda do pedido")) continue;
    const orderId = (row[colId] ?? "").trim();
    const receivedCents = asCents(row[colValue] ?? "");
    if (!orderId || receivedCents <= 0) continue;
    orders.push({ orderId, receivedCents });
  }
  return orders;
}
