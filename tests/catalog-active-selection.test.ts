import {
  createProduct,
  listAllVariants,
  listCatalog,
  listVariants,
  setProductActive,
  setVariantActive,
} from "@/lib/catalog/service";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

describe("active eligibility", () => {
  it("mantém inativos consultáveis no catálogo mas fora de seletores de venda/vínculo", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const active = createProduct({ name: "Ativo", categoryId: null }, { db });
      const inactiveProduct = createProduct({ name: "Produto inativo", categoryId: null }, { db });
      const inactiveVariant = createProduct({ name: "Variante inativa", categoryId: null }, { db });
      expect(active.ok && inactiveProduct.ok && inactiveVariant.ok).toBe(true);
      if (!active.ok || !inactiveProduct.ok || !inactiveVariant.ok) return;
      setProductActive(inactiveProduct.value.id, false, { db });
      const variant = listVariants(inactiveVariant.value.id, { db })[0];
      setVariantActive(variant.id, false, { db });
      expect(listCatalog({ status: "all" }, { db })).toHaveLength(3);
      expect(listAllVariants({ db }).map((row) => row.productName)).toEqual(["Ativo"]);
    } finally {
      cleanup();
    }
  });
});
