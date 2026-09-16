import { listCashEntries } from "@/lib/cash/service";
import { type ProductRow, createProduct, createProductCode, listProducts } from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { cashEntries, sales } from "@/lib/db/schema";
import { createPresentialSale, listSales, reverseSale } from "@/lib/sales/service";
import { importNfeToDb } from "@/lib/xml/importer";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * FR-011 / T048 — Estorno de venda: status `refunded` + refundDate (NFe imutável,
 * D7: nunca exclusão). SAÍ de todo faturamento (mês/ano/dashboard) e, quando a
 * venda entrou no caixa (presencial), gera o reembolso de MESMO valor no caixa
 * (ledger separado, D8) na data do estorno. Importadas (sem caixa) só saem do
 * faturamento — nada de saída fantasma no caixa.
 */

function mkProduct(db: Db, name: string, price: number, cost: number): ProductRow {
  const result = createProduct({ name, categoryId: null, salePriceCents: price, estimatedCostCents: cost }, { db });
  if (!result.ok) throw new Error(result.error);
  const product = listProducts({ db }).find((row) => row.name === name);
  if (!product) throw new Error("produto não criado");
  return product;
}

function importNf(db: Db, invoiceNumber: string, cProd: string, grossCents: number) {
  return importNfeToDb(
    {
      invoiceNumber,
      serie: "1",
      issueDate: new Date("2026-08-10T00:00:00"),
      grossCents,
      items: [
        { nItem: 1, cProd, description: "Item", quantity: 1, unitPriceCents: grossCents, totalCents: grossCents },
      ],
      warnings: [],
    },
    "shopee",
    `nf-${invoiceNumber}.xml`,
    { db },
  );
}

describe("reverseSale — estorno de venda (FR-011/T048)", () => {
  it("venda importada estornada sai do faturamento sem criar saída fantasma no caixa", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = mkProduct(db, "Busto Eiffel", 10_000, 4_000);
      const code = createProductCode(product.id, { code: "X1", channel: "shopee" }, { db });
      expect(code.ok).toBe(true);

      const imported = importNf(db, "000400", "X1", 10_000);
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;
      expect(listCashEntries({ db })).toHaveLength(0); // marketplace NÃO entrou no caixa

      const result = reverseSale(imported.saleId, { refundDate: "2026-08-20" }, { db });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const row = db.select().from(sales).where(eq(sales.id, imported.saleId)).get();
      expect(row?.status).toBe("refunded");
      expect(row?.refundDate).toBeInstanceOf(Date);
      expect(row?.grossCents).toBe(10_000); // imutável: registro do fato
      expect(listCashEntries({ db })).toHaveLength(0); // sem reembolso automático

      const listed = listSales({ db }).find((item) => item.id === imported.saleId);
      expect(listed?.status).toBe("refunded");
    } finally {
      cleanup();
    }
  });

  it("presencial estornada sai do faturamento e reverte a entrada do caixa (reembolso)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const product = mkProduct(db, "Porta-chaves Dragão", 2_500, 500);
      const presential = createPresentialSale(
        { saleDate: "2026-08-15", receivedCents: 2_500, items: [{ productId: product.id, quantity: 1 }] },
        { db },
      );
      expect(presential.ok).toBe(true);
      if (!presential.ok) return;

      const before = listCashEntries({ db });
      expect(before).toHaveLength(1);
      expect(before[0]?.type).toBe("entrada");
      expect(before[0]?.amountCents).toBe(2_500);

      const result = reverseSale(presential.value.saleId, { refundDate: "2026-08-18" }, { db });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const refunds = listCashEntries({ db }).filter((entry) => entry.saleId === presential.value.saleId);
      expect(refunds).toHaveLength(2); // entrada original + reembolso
      const refund = refunds.find((entry) => entry.type === "saida");
      expect(refund?.amountCents).toBe(2_500);
      expect(refund?.description).toContain("Estorno");
      expect(refund?.date.toISOString().slice(0, 10)).toBe("2026-08-18"); // data do estorno

      // faturamento some (monthlyGross/dashboard já testados; aqui: listagem reflete)
      const listed = listSales({ db }).find((item) => item.id === presential.value.saleId);
      expect(listed?.status).toBe("refunded");
    } finally {
      cleanup();
    }
  });

  it("estorno duplicado é erro; venda inexistente é erro", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const imported = importNf(db, "000401", "SEMVINCULO", 5_000);
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;

      const first = reverseSale(imported.saleId, { refundDate: "2026-08-20" }, { db });
      expect(first.ok).toBe(true);
      expect(reverseSale(imported.saleId, { refundDate: "2026-08-21" }, { db }).ok).toBe(false);
      expect(reverseSale(999_999, { refundDate: "2026-08-21" }, { db }).ok).toBe(false);
    } finally {
      cleanup();
    }
  });
});
