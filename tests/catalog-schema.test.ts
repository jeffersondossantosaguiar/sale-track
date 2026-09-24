import { createProduct, createProductCode, createVariant, listProductCodes, listVariants } from "@/lib/catalog/service";
import { productCodes, products, variants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

describe("master catalog schema", () => {
  it("persiste campos nullable de produto, variante e mídia sem blob", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct(
        {
          name: "Mini Mew",
          categoryId: null,
          productType: "Totem",
          theme: "Pokemon",
          primaryColor: "Rosa",
          sizeLabel: "10cm",
          finish: "Fosco",
          internalNotes: "Sem suporte",
        },
        { db },
      );
      expect(p.ok).toBe(true);
      if (!p.ok) return;
      db.update(products)
        .set({ imageKey: "abc.jpg", imageMime: "image/jpeg", imageOriginalName: "abc.jpg", imageBytes: 22 })
        .where(eq(products.id, p.value.id))
        .run();
      const v = createVariant(
        p.value.id,
        {
          sku: "mew rosa",
          name: "Rosa",
          colorOverride: "Rosa claro",
          sizeOverride: null,
          finishOverride: "",
          notesOverride: "Olho pintado",
          printTimeMin: 0,
          manualTimeMin: 0,
          filamentMaterialId: null,
          filamentGrams: 0,
          packagingCents: 0,
          accessoriesCents: 0,
        },
        { db },
      );
      expect(v.ok).toBe(true);
      if (!v.ok) return;
      db.update(variants)
        .set({ imageKey: "def.png", imageMime: "image/png", imageOriginalName: "def.png", imageBytes: 10 })
        .where(eq(variants.id, v.value.id))
        .run();
      expect(listVariants(p.value.id, { db }).find((row) => row.id === v.value.id)).toMatchObject({
        sku: "MEW ROSA",
        effectiveColor: "Rosa claro",
        effectiveSize: "10cm",
        effectiveFinish: "Fosco",
      });
    } finally {
      cleanup();
    }
  });

  it("aplica SKU normalizado único e código normalizado único por canal", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct({ name: "Mini Eevee", categoryId: null }, { db });
      expect(p.ok).toBe(true);
      if (!p.ok) return;
      expect(createVariant(p.value.id, baseVariant("abc 01"), { db }).ok).toBe(true);
      const duplicateSku = createVariant(p.value.id, baseVariant(" ABC   01 "), { db });
      expect(duplicateSku.ok).toBe(false);
      const variantId = listVariants(p.value.id, { db })[0].id;
      expect(createProductCode(variantId, { code: " ext 01 ", channel: "geral" }, { db }).ok).toBe(true);
      expect(createProductCode(variantId, { code: "EXT 01", channel: "geral" }, { db }).ok).toBe(false);
      expect(createProductCode(variantId, { code: "EXT 01", channel: "shopee" }, { db }).ok).toBe(true);
      const codes = listProductCodes(variantId, { db });
      expect(codes.map((code) => code.channel).sort()).toEqual(["geral", "shopee"]);
      expect(db.select().from(productCodes).where(eq(productCodes.normalizedCode, "EXT 01")).all()).toHaveLength(2);
    } finally {
      cleanup();
    }
  });
});

function baseVariant(sku: string) {
  return {
    sku,
    name: sku,
    printTimeMin: 0,
    manualTimeMin: 0,
    filamentMaterialId: null,
    filamentGrams: 0,
    packagingCents: 0,
    accessoriesCents: 0,
  };
}
