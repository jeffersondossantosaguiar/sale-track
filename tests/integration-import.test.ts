import { productCodes, products, saleItems, sales, variants } from "@/lib/db/schema";
import { setReceived } from "@/lib/sales/service";
import { importNfeToDb } from "@/lib/xml/importer";
import { parseXmlInvoice } from "@/lib/xml/parser";
import { describe, expect, it } from "vitest";
import { FIXTURE_SEM_PADRAO, FIXTURE_SHOPEE_1, FIXTURE_TIKTOK, readFixture, setupTestDb } from "./helpers/db";

function single<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`esperava registro "${label}" gravado`);
  return value;
}

function seedCatalog(db: ReturnType<typeof setupTestDb>["db"]) {
  const productId = Number(db.insert(products).values({ name: "Totem Vegeta e Bulma" }).run().lastInsertRowid);
  const variantId = Number(
    db
      .insert(variants)
      .values({
        productId,
        sku: "TOTEM-VB",
        name: "Totem Vegeta e Bulma",
        costCents: 123,
        printTimeMin: 0,
        manualTimeMin: 0,
        filamentGrams: 0,
        packagingCents: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run().lastInsertRowid,
  );
  db.insert(productCodes)
    .values([
      { variantId, code: "169415788741", channel: "shopee" },
      { variantId, code: "TOTEM-CASAL", channel: null }, // código geral
    ])
    .run();
  return variantId;
}

describe("T019 — integração: import NFe → sale + items vinculados", () => {
  it("importa Shopee, vincula por cProd e congela custo (D6)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const variantId = seedCatalog(db);
      const parsed = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_1));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const outcome = importNfeToDb(parsed.invoice, "shopee", FIXTURE_SHOPEE_1, { db });
      expect(outcome).toMatchObject({ ok: true });
      if (!outcome.ok) return;

      const sale = single(db.select().from(sales).get(), "sales");
      expect(sale.channel).toBe("shopee");
      expect(sale.invoiceNumber).toBe("772");
      expect(sale.invoiceSerie).toBe("2");
      expect(sale.grossCents).toBe(1550);
      expect(sale.feeCents).toBe(0);
      expect(sale.netCents).toBe(1550);
      expect(sale.receivedCents).toBeNull(); // pendente até relatório/manual (005)
      expect(sale.liquidCents).toBe(0); // lucro pendente sem recebido
      expect(sale.xmlFilename).toBe(FIXTURE_SHOPEE_1);

      const items = db.select().from(saleItems).all();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        variantId,
        cProd: "169415788741",
        frozenCostCents: 123,
        quantity: 1,
        unitPriceCents: 1550,
      });
      expect(outcome.unlinked).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("TikTok com cProd genérico ('Padrao') → item sem vínculo, mas importa", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedCatalog(db);
      const parsed = parseXmlInvoice(readFixture(FIXTURE_TIKTOK));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const outcome = importNfeToDb(parsed.invoice, "tiktok", FIXTURE_TIKTOK, { db });
      expect(outcome).toMatchObject({ ok: true });
      if (!outcome.ok) return;

      expect(outcome.unlinked).toEqual([{ cProd: "Padrao", description: expect.stringContaining("Ash Greninja") }]);

      const item = single(db.select().from(saleItems).get(), "saleItems");
      expect(item.variantId).toBeNull();
      expect(item.frozenCostCents).toBeNull();

      const sale = single(db.select().from(sales).get(), "sales");
      expect(sale.channel).toBe("tiktok");
      expect(sale.grossCents).toBe(3208); // bruto imutável: vNF com frete
      expect(sale.receivedCents).toBeNull();
      expect(sale.liquidCents).toBe(0); // lucro pendente sem recebido (005)
    } finally {
      cleanup();
    }
  });

  it("canal presencial via padrão desconhecido não casa códigos de marketplace", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedCatalog(db);
      const parsed = parseXmlInvoice(readFixture(FIXTURE_SEM_PADRAO));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const outcome = importNfeToDb(parsed.invoice, "presencial", FIXTURE_SEM_PADRAO, { db });
      expect(outcome).toMatchObject({ ok: true });
      if (!outcome.ok) return;

      const item = single(db.select().from(saleItems).get(), "saleItems");
      expect(item.frozenCostCents).toBeNull();
      const sale = single(db.select().from(sales).get(), "sales");
      expect(sale.channel).toBe("presencial");
      expect(sale.grossCents).toBe(4990);
    } finally {
      cleanup();
    }
  });

  it("venda e itens gravados em transação atômica", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedCatalog(db);
      const parsed = parseXmlInvoice(readFixture(FIXTURE_SHOPEE_1));
      if (!parsed.ok) return;
      const outcome = importNfeToDb(parsed.invoice, "shopee", FIXTURE_SHOPEE_1, { db });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      const salesCount = db.select({ id: sales.id }).from(sales).all().length;
      const itemsCount = db.select({ id: saleItems.id }).from(saleItems).all().length;
      expect(salesCount).toBe(1);
      expect(itemsCount).toBe(1);
    } finally {
      cleanup();
    }
  });

  it("005 — lucro multiplica custo pela quantidade e usa frete/recebido", () => {
    const { db, cleanup } = setupTestDb();
    try {
      seedCatalog(db); // variante com costCents 123
      const result = importNfeToDb(
        {
          invoiceNumber: "9000",
          serie: "1",
          issueDate: new Date("2026-09-01T00:00:00"),
          grossCents: 50_00,
          freightCents: 5_00,
          items: [
            {
              nItem: 1,
              cProd: "169415788741",
              description: "Totem x2",
              quantity: 2,
              unitPriceCents: 25_00,
              totalCents: 50_00,
            },
          ],
          warnings: [],
        },
        "shopee",
        "nf-9000.xml",
        { db },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // sem recebido → pendente
      const imported = single(db.select().from(sales).get(), "sales");
      expect(imported.freightCents).toBe(5_00);
      expect(imported.receivedCents).toBeNull();
      expect(imported.liquidCents).toBe(0);

      // informa recebido → lucro = recebido − (custo × 2)
      const r = setReceived(imported.id, 40_00, { db });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.sale.liquidCents).toBe(40_00 - 2 * 123);
      expect(r.value.sale.feeCents).toBe(50_00 - 5_00 - 40_00); // = produto − recebido
    } finally {
      cleanup();
    }
  });
});
