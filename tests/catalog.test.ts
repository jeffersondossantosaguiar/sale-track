import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  renameCategory,
  setProductActive,
  updateProduct,
} from "@/lib/catalog/service";
import { categories, productCodes, products, saleItems, sales } from "@/lib/db/schema";
import { DEFAULT_CATEGORIES, categoryNameSchema, productInputSchema } from "@/lib/domain/catalog";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * T027 [US2] — CRUD de CATEGORIES e PRODUCTS (Server Actions + zod).
 * Money em centavos (constitution); categorias com contagem; exclusão bloqueada
 * quando em uso (integridade explícita — nunca apagar referências, D7).
 */
describe("catalog.domain", () => {
  it("define categorias padrão do seed", () => {
    expect(DEFAULT_CATEGORIES).toContain("Geral");
  });

  it("valida nome de categoria (trim, não-vazio, tamanho)", () => {
    expect(categoryNameSchema.safeParse("  Filamentos  ").success).toBe(true);
    expect(categoryNameSchema.safeParse("   ").success).toBe(false);
    expect(categoryNameSchema.safeParse("").success).toBe(false);
  });

  it("valida input de produto (centavos inteiros >= 0; nome obrigatório)", () => {
    const valid = { name: "Mini Pikachu", categoryId: 3, salePriceCents: 1500, estimatedCostCents: 120 };
    expect(productInputSchema.safeParse(valid).success).toBe(true);

    // coerce de string (FormData) funciona
    const asForm = { name: "Mini Pikachu", categoryId: "3", salePriceCents: "1500", estimatedCostCents: "0" };
    expect(productInputSchema.safeParse(asForm).success).toBe(true);

    expect(productInputSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, salePriceCents: -5 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, salePriceCents: 1500.5 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, categoryId: 0 }).success).toBe(false);
  });
});

describe("catalog.service", () => {
  it("cria, renomeia e lista categorias com contagem de produtos", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const created = createCategory({ name: "Filamentos" }, { db });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const catId = created.value.id;
      expect(listCategories({ db })).toHaveLength(1);
      expect(listCategories({ db })[0]).toMatchObject({ name: "Filamentos", productCount: 0 });

      const renamed = renameCategory(catId, "Filamento PLA", { db });
      expect(renamed.ok).toBe(true);
      expect(listCategories({ db })[0].name).toBe("Filamento PLA");

      const withProduct = createProduct(
        { name: "Refil PLA 1kg", categoryId: catId, salePriceCents: 2500, estimatedCostCents: 1800 },
        { db },
      );
      expect(withProduct.ok).toBe(true);
      expect(listCategories({ db })[0].productCount).toBe(1);
    } finally {
      cleanup();
    }
  });

  it("rejeita duplicar nome de categoria", () => {
    const { db, cleanup } = setupTestDb();
    try {
      createCategory({ name: "Filamentos" }, { db });
      const dup = createCategory({ name: "filamentos" }, { db });
      expect(dup.ok).toBe(false);
      if (dup.ok) return;
      expect(dup.error).toMatch(/já existe/i);
    } finally {
      cleanup();
    }
  });

  it("bloqueia exclusão de categoria em uso", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const created = createCategory({ name: "Filamentos" }, { db });
      if (!created.ok) return;
      createProduct(
        { name: "Refil PLA 1kg", categoryId: created.value.id, salePriceCents: 2500, estimatedCostCents: 1800 },
        { db },
      );
      const del = deleteCategory(created.value.id, { db });
      expect(del.ok).toBe(false);
      if (del.ok) return;
      expect(del.error).toMatch(/1 produto/i);
      expect(listCategories({ db })).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it("permite excluir categoria sem produtos", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const created = createCategory({ name: "Sem uso" }, { db });
      if (!created.ok) return;
      expect(deleteCategory(created.value.id, { db }).ok).toBe(true);
      expect(listCategories({ db })).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("cria produto, vincula categoria, atualiza e alterna active", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const cat = createCategory({ name: "Geral" }, { db });
      if (!cat.ok) return;

      const p = createProduct(
        { name: "Mini Pikachu", categoryId: cat.value.id, salePriceCents: 1990, estimatedCostCents: 500 },
        { db },
      );
      expect(p.ok).toBe(true);
      if (!p.ok) return;

      const rows = listProducts({ db });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: "Mini Pikachu",
        categoryName: "Geral",
        salePriceCents: 1990,
        estimatedCostCents: 500,
        active: true,
        codeCount: 0,
      });

      const updated = updateProduct(
        p.value.id,
        { name: "Mini Pikachu com Bolha", salePriceCents: 2200, estimatedCostCents: 600 },
        { db },
      );
      expect(updated.ok).toBe(true);
      expect(setProductActive(p.value.id, false, { db }).ok).toBe(true);
      const after = listProducts({ db })[0];
      expect(after).toMatchObject({ name: "Mini Pikachu com Bolha", salePriceCents: 2200, active: false });
    } finally {
      cleanup();
    }
  });

  it("rejeita produto sem categoria válida", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const res = createProduct(
        { name: "Fantasma", categoryId: 999, salePriceCents: 100, estimatedCostCents: 50 },
        { db },
      );
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toMatch(/categoria/i);
    } finally {
      cleanup();
    }
  });

  it("bloqueia exclusão de produto já vinculado a venda", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct(
        { name: "Mini Pikachu", categoryId: null, salePriceCents: 1990, estimatedCostCents: 500 },
        { db },
      );
      if (!p.ok) return;

      const saleId = db
        .insert(sales)
        .values({ channel: "shopee", saleDate: new Date("2026-09-01"), grossCents: 1990, netCents: 1990 })
        .run().lastInsertRowid;
      db.insert(saleItems)
        .values({
          saleId: Number(saleId),
          cProd: "A1",
          description: "Mini Pikachu",
          quantity: 1,
          unitPriceCents: 1990,
          productId: p.value.id,
        })
        .run();

      const del = deleteProduct(p.value.id, { db });
      expect(del.ok).toBe(false);
      if (del.ok) return;
      expect(del.error).toMatch(/venda/i);
      expect(listProducts({ db })).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it("permite excluir produto sem vínculo com venda (codes em cascata)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct(
        { name: "Rascunho", categoryId: null, salePriceCents: 100, estimatedCostCents: 0 },
        { db },
      );
      if (!p.ok) return;
      db.insert(productCodes).values({ productId: p.value.id, code: "ZZ9", channel: "shopee" }).run();
      expect(deleteProduct(p.value.id, { db }).ok).toBe(true);
      expect(listProducts({ db })).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("contagem de códigos aparece na listagem", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct(
        { name: "Anel Goomba", categoryId: null, salePriceCents: 900, estimatedCostCents: 300 },
        { db },
      );
      if (!p.ok) return;
      db.insert(productCodes).values({ productId: p.value.id, code: "S1", channel: "shopee" }).run();
      db.insert(productCodes).values({ productId: p.value.id, code: "T1", channel: "tiktok" }).run();
      expect(listProducts({ db })[0].codeCount).toBe(2);

      // relação categories – products – codes funcionam juntas na consulta
      const cat = createCategory({ name: "Personagens" }, { db });
      if (!cat.ok) return;
      updateProduct(p.value.id, { categoryId: cat.value.id }, { db });
      expect(listProducts({ db })[0]).toMatchObject({ categoryName: "Personagens", codeCount: 2 });
    } finally {
      cleanup();
    }
  });
});

// Import deliberado para manter o contrato de schema em teste (categories modelado).
void categories;
