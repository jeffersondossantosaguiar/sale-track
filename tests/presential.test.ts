import { listCashEntries } from "@/lib/cash/service";
import { createProduct, listVariants } from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { variants } from "@/lib/db/schema";
import { createPresentialSale, listSales, monthlyGross } from "@/lib/sales/service";
import { importNfeToDb } from "@/lib/xml/importer";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * US4 (T036–T037): venda presencial lançada à mão — SEM nota fiscal (D3/D7):
 * conta no faturamento (gross) e entra no CAIXA como entrada "venda" (T037),
 * tudo numa transação. Estorno dessa entrada = o estorno do caixa (voltado).
 */

function mkVariant(db: Db, name: string, cost: number): number {
  const result = createProduct({ name, categoryId: null }, { db });
  if (!result.ok) throw new Error(result.error);
  const rows = listVariants(result.value.id, { db });
  const variant = rows[0];
  if (!variant) throw new Error("produto sem variante default");
  db.update(variants).set({ costCents: cost }).where(eq(variants.id, variant.id)).run();
  return variant.id;
}

describe("service sales — venda presencial (T036/T037)", () => {
  it("cria venda presencial + itens com custo congelado + entrada no caixa (faturamento e caixa juntos)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const a = mkVariant(db, "Busto Eiffel", 400);
      const b = mkVariant(db, "Chaveiro Planalto", 900);

      const result = createPresentialSale(
        {
          saleDate: "2026-08-15",
          receivedCents: 3_000,
          items: [
            { variantId: a, quantity: 1 },
            { variantId: b, quantity: 1 },
          ],
        },
        { db },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const sales = listSales({ db });
      expect(sales).toHaveLength(1);
      const sale = sales[0];
      expect(sale.channel).toBe("presencial");
      expect(sale.grossCents).toBe(3_000);
      expect(sale.feeCents).toBe(0);
      expect(sale.netCents).toBe(3_000);
      expect(sale.liquidCents).toBe(3_000 - 400 - 900);
      expect(sale.itemCount).toBe(2);

      // T037: entrada no caixa vinculada à venda
      const entries = listCashEntries({ db });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.type).toBe("entrada");
      expect(entries[0]?.category).toBe("venda");
      expect(entries[0]?.amountCents).toBe(3_000);
      expect(entries[0]?.saleId).toBe(sale.id);
      expect(entries[0]?.date.getDate()).toBe(15);
    } finally {
      cleanup();
    }
  });

  it("rejeita valor <= 0, vazio de itens, produto inexistente e data inválida", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const a = mkVariant(db, "Busto Eiffel", 400);
      const base = { saleDate: "2026-08-15" };

      expect(
        createPresentialSale({ ...base, receivedCents: 0, items: [{ variantId: a, quantity: 1 }] }, { db }).ok,
      ).toBe(false);
      expect(createPresentialSale({ ...base, receivedCents: 100, items: [] }, { db }).ok).toBe(false);
      expect(
        createPresentialSale({ ...base, receivedCents: 100, items: [{ variantId: 999, quantity: 1 }] }, { db }).ok,
      ).toBe(false);
      expect(
        createPresentialSale(
          { saleDate: "não-data", receivedCents: 100, items: [{ variantId: a, quantity: 1 }] },
          { db },
        ).ok,
      ).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("some ao faturamento do mês (NF + presencial) e não soma de outros meses (cenário US4.2)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const a = mkVariant(db, "Busto Eiffel", 400);

      const julho = createPresentialSale(
        { saleDate: "2026-07-20", receivedCents: 500, items: [{ variantId: a, quantity: 1 }] },
        { db },
      );
      const agostoA = createPresentialSale(
        { saleDate: "2026-08-05", receivedCents: 300, items: [{ variantId: a, quantity: 1 }] },
        { db },
      );
      const agostoB = createPresentialSale(
        { saleDate: "2026-08-28", receivedCents: 100, items: [{ variantId: a, quantity: 1 }] },
        { db },
      );
      const outro = createPresentialSale(
        { saleDate: "2026-09-01", receivedCents: 999, items: [{ variantId: a, quantity: 1 }] },
        { db },
      );
      expect(agostoA.ok).toBe(true);
      expect(agostoB.ok).toBe(true);
      expect(julho.ok).toBe(true);
      expect(outro.ok).toBe(true);

      // NF importada do mês (US4.2): R$ 1.000 + presencial R$ 400 → R$ 1.400.
      // O lançamento de caixa "venda" NÃO entra no faturamento (ledgers separados).
      const imported = importNfeToDb(
        {
          invoiceNumber: "000123",
          serie: "1",
          issueDate: new Date("2026-08-10T00:00:00"),
          grossCents: 1_000,
          items: [
            {
              nItem: 1,
              cProd: "X1",
              description: "Busto Eiffel",
              quantity: 1,
              unitPriceCents: 1_000,
              totalCents: 1_000,
            },
          ],
          warnings: [],
        },
        "shopee",
        "nf-000123.xml",
        { db },
      );
      expect(imported.ok).toBe(true);

      const agosto = monthlyGross({ year: 2026, month: 8 }, { db });
      expect(agosto).toBe(1_000 + 300 + 100);

      expect(monthlyGross({ year: 2026, month: 7 }, { db })).toBe(500);
      expect(monthlyGross({ year: 2026, month: 9 }, { db })).toBe(999);
    } finally {
      cleanup();
    }
  });

  it("listSales mostra a venda presencial na lista, ordenada por data desc e com itemCount", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const a = mkVariant(db, "Busto Eiffel", 400);
      const d1 = createPresentialSale(
        { saleDate: "2026-08-01", receivedCents: 100, items: [{ variantId: a, quantity: 1 }] },
        { db },
      );
      const d2 = createPresentialSale(
        { saleDate: "2026-08-02", receivedCents: 200, items: [{ variantId: a, quantity: 2 }] },
        { db },
      );
      expect(d1.ok && d2.ok).toBe(true);

      const sales = listSales({ db });
      expect(sales.map((s) => s.grossCents)).toEqual([200, 100]);
      expect(sales[0]?.itemCount).toBe(2);
      expect(sales.every((s) => s.channel === "presencial")).toBe(true);
    } finally {
      cleanup();
    }
  });
});
