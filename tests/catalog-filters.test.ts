import { createProduct, createVariant, listCatalog, setProductActive, setVariantActive } from "@/lib/catalog/service";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

describe("catalog filters", () => {
  it("busca por produto, variante, SKU e atributos efetivos com status", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const pikachu = createProduct(
        { name: "Mini Pikachu", categoryId: null, theme: "Pokemon", primaryColor: "Amarelo" },
        { db },
      );
      const luffy = createProduct(
        { name: "Luffy Gear", categoryId: null, theme: "One Piece", primaryColor: "Vermelho" },
        { db },
      );
      expect(pikachu.ok && luffy.ok).toBe(true);
      if (!pikachu.ok || !luffy.ok) return;
      const shiny = createVariant(
        pikachu.value.id,
        {
          sku: "PK-SHINY",
          name: "Shiny",
          colorOverride: "Dourado",
          printTimeMin: 0,
          manualTimeMin: 0,
          filamentMaterialId: null,
          filamentGrams: 0,
          packagingCents: 0,
          accessoriesCents: 0,
        },
        { db },
      );
      expect(shiny.ok).toBe(true);
      expect(listCatalog({ q: "pk-shiny" }, { db })).toHaveLength(1);
      expect(listCatalog({ q: "dourado" }, { db })[0]?.name).toBe("Mini Pikachu");
      expect(listCatalog({ q: "one piece" }, { db })[0]?.name).toBe("Luffy Gear");
      expect(listCatalog({ theme: "Pokemon", color: "Dourado" }, { db })[0]?.variants.map((row) => row.sku)).toEqual([
        "PK-SHINY",
      ]);
      expect(listCatalog({ color: "Amarelo" }, { db })[0]?.variants.map((row) => row.name)).toEqual(["Mini Pikachu"]);
      expect(listCatalog({ color: "Azul" }, { db })).toHaveLength(0);
      if (shiny.ok) setVariantActive(shiny.value.id, false, { db });
      setProductActive(luffy.value.id, false, { db });
      expect(listCatalog({ status: "active" }, { db }).map((row) => row.name)).toEqual(["Mini Pikachu"]);
      expect(
        listCatalog({ status: "inactive" }, { db })
          .map((row) => row.name)
          .sort(),
      ).toEqual(["Luffy Gear", "Mini Pikachu"]);
      expect(listCatalog({ status: "all" }, { db })).toHaveLength(2);
    } finally {
      cleanup();
    }
  });
});
