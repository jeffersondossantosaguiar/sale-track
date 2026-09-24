import { createProduct, createVariant, listCatalog } from "@/lib/catalog/service";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

describe("catalog performance", () => {
  it("lista e filtra 1.000 produtos / 5.000 variantes em até 200 ms", () => {
    const { db, cleanup } = setupTestDb();
    try {
      for (let i = 0; i < 1000; i++) {
        const product = createProduct(
          { name: `Produto ${i}`, categoryId: null, theme: i % 2 === 0 ? "Pokemon" : "Anime" },
          { db },
        );
        if (!product.ok) throw new Error(product.error);
        for (let j = 1; j < 5; j++) {
          const variant = createVariant(
            product.value.id,
            {
              sku: `P${i}-V${j}`,
              name: `Variante ${j}`,
              colorOverride: j === 3 ? "Dourado" : "",
              printTimeMin: 0,
              manualTimeMin: 0,
              filamentMaterialId: null,
              filamentGrams: 0,
              packagingCents: 0,
              accessoriesCents: 0,
            },
            { db },
          );
          if (!variant.ok) throw new Error(variant.error);
        }
      }
      const started = performance.now();
      const rows = listCatalog({ q: "dourado", status: "active" }, { db });
      const elapsed = performance.now() - started;
      expect(rows.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThanOrEqual(200);
    } finally {
      cleanup();
    }
  }, 15_000);
});
