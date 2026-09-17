import {
  applyCurrentCostToUncosted,
  createProduct,
  linkUnlinkedToVariant,
  listProductCodes,
  listUnlinkedGroups,
  listVariants,
} from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { saleItems, sales } from "@/lib/db/schema";
import { linkCProd } from "@/lib/xml/link";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * T031 — fila de "códigos sem vínculo" na granularidade de VARIANTE: vínculo
 * manual Aprende o código (product_codes) e atualiza novas importações; backfill
 * NUNCA altera custo congelado (D6); "aplicar custo atual" só toca itens sem custo.
 */

function insertSale(db: Db, channel: string, items: Array<{ cProd: string; desc: string; price: number }>): void {
  const gross = items.reduce((sum, item) => sum + item.price, 0);
  const inserted = db
    .insert(sales)
    .values({
      channel,
      saleDate: new Date("2026-08-01"),
      grossCents: gross,
      feeCents: 0,
      netCents: gross,
      liquidCents: gross,
    })
    .run();
  const saleId = Number(inserted.lastInsertRowid);
  for (const item of items) {
    db.insert(saleItems)
      .values({
        saleId,
        cProd: item.cProd,
        description: item.desc,
        quantity: 1,
        unitPriceCents: item.price,
        variantId: null,
        frozenCostCents: null,
      })
      .run();
  }
}

function rowsOf(db: Db, cProd: string): Array<{ variantId: number | null; frozenCostCents: number | null }> {
  return db
    .select({ variantId: saleItems.variantId, frozenCostCents: saleItems.frozenCostCents })
    .from(saleItems)
    .where(eq(saleItems.cProd, cProd))
    .all();
}

function makeVariant(db: Db, name = "Chaveiro"): number {
  const product = createProduct({ name, categoryId: null }, { db });
  if (!product.ok) throw new Error(product.error);
  const variants = listVariants(product.value.id, { db });
  const variant = variants[0];
  if (!variant) throw new Error("sem variante default");
  return variant.id;
}

describe("unlinked queue (T031)", () => {
  it("lista grupos de itens sem vínculo por (cProd, canal); ignora vinculados", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = makeVariant(db);
      insertSale(db, "shopee", [
        { cProd: "A1", desc: "Chaveiro A", price: 990 },
        { cProd: "A1", desc: "Chaveiro A", price: 990 },
      ]);
      insertSale(db, "tiktok", [{ cProd: "B2", desc: "Caneca B", price: 1200 }]);
      insertSale(db, "shopee", [{ cProd: "LIG", desc: "Já vinculado", price: 500 }]);
      const linked = linkUnlinkedToVariant({ variantId, cProd: "LIG", channel: "shopee" }, { db });
      expect(linked.ok).toBe(true);

      const groups = listUnlinkedGroups({ db });
      const a1 = groups.find((g) => g.cProd === "A1");
      expect(a1?.channel).toBe("shopee");
      expect(a1?.count).toBe(2);
      expect(a1?.totalCents).toBe(1_980);
      expect(groups.find((g) => g.cProd === "B2")?.channel).toBe("tiktok");
      expect(groups.some((g) => g.cProd === "LIG")).toBe(false);
      expect(groups).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  it("vínculo manual aprende o código e faz backfill só do canal", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = makeVariant(db, "Chaveiro");
      insertSale(db, "shopee", [
        { cProd: "P001", desc: "Chaveiro", price: 990 },
        { cProd: "P001", desc: "Chaveiro", price: 990 },
      ]);
      insertSale(db, "tiktok", [{ cProd: "P001", desc: "Chaveiro", price: 990 }]);

      const res = linkUnlinkedToVariant({ variantId, cProd: "P001", channel: "shopee" }, { db });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.linked).toBe(2);
      expect(res.value.learned).toBe(true);

      const codes = listProductCodes(variantId, { db });
      expect(codes).toHaveLength(1);
      expect(codes[0]?.code).toBe("P001");
      expect(codes[0]?.channel).toBe("shopee");

      const shopeeRows = rowsOf(db, "P001");
      expect(shopeeRows).toHaveLength(3);
      expect(shopeeRows.filter((r) => r.variantId === variantId)).toHaveLength(2);
      expect(shopeeRows.every((r) => r.frozenCostCents === null)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("presencial aprende como código geral (canal null) e vincula por canal presencial", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = makeVariant(db, "No balcão");
      insertSale(db, "presencial", [{ cProd: "BALCAO", desc: "Balcão", price: 1000 }]);

      const res = linkUnlinkedToVariant({ variantId, cProd: "BALCAO", channel: "presencial" }, { db });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.learned).toBe(true);

      const codes = listProductCodes(variantId, { db });
      expect(codes[0]?.channel).toBeNull();
      expect(rowsOf(db, "BALCAO")[0]?.variantId).toBe(variantId);
    } finally {
      cleanup();
    }
  });

  it("vínculo manual é idempotente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = makeVariant(db, "Caneca");
      insertSale(db, "shopee", [{ cProd: "MUG", desc: "Caneca", price: 1200 }]);

      const first = linkUnlinkedToVariant({ variantId, cProd: "MUG", channel: "shopee" }, { db });
      expect(first.ok).toBe(true);
      const second = linkUnlinkedToVariant({ variantId, cProd: "MUG", channel: "shopee" }, { db });
      expect(second.ok).toBe(true);
      if (second.ok) {
        expect(second.value.learned).toBe(false);
        expect(second.value.linked).toBe(0);
      }
      expect(listProductCodes(variantId, { db })).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it("'aplicar custo atual' preenche SO os itens sem custo e é idempotente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = makeVariant(db, "Chaveiro");
      insertSale(db, "shopee", [{ cProd: "P001", desc: "sem custo", price: 1500 }]);
      const link = linkUnlinkedToVariant({ variantId, cProd: "P001", channel: "shopee" }, { db });
      expect(link.ok).toBe(true);

      const apply = applyCurrentCostToUncosted({ db });
      expect(apply.ok).toBe(true);
      if (!apply.ok) return;
      expect(apply.value.updated).toBe(1);
      expect(rowsOf(db, "P001")[0]?.frozenCostCents).toBe(0); // variante default tem custo 0

      const apply2 = applyCurrentCostToUncosted({ db });
      expect(apply2.ok).toBe(true);
      if (apply2.ok) expect(apply2.value.updated).toBe(0);
    } finally {
      cleanup();
    }
  });

  it("custo aprendido passa a casar automaticamente em novas importações (linkCProd)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = makeVariant(db, "Alface");
      insertSale(db, "shopee", [{ cProd: "LFA", desc: "Alface", price: 890 }]);
      const res = linkUnlinkedToVariant({ variantId, cProd: "LFA", channel: "shopee" }, { db });
      expect(res.ok).toBe(true);

      const codes = listProductCodes(variantId, { db });
      const lookup = codes.map((c) => ({ code: c.code, channel: c.channel, variant: { id: variantId, costCents: 0 } }));
      const linked = linkCProd("LFA", "shopee", lookup);
      expect(linked.variantId).toBe(variantId);
      expect(linked.frozenCostCents).toBe(0);
    } finally {
      cleanup();
    }
  });
});
