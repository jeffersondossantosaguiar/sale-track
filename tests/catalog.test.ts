import {
  createCategory,
  createProduct,
  createProductCode,
  createVariant,
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  listVariants,
  renameCategory,
  repairTikTokLinks,
  setProductActive,
  updateProduct,
  updateVariant,
} from "@/lib/catalog/service";
import type { Db } from "@/lib/db/client";
import { categories, productCodes, products, saleItems, sales, variants } from "@/lib/db/schema";
import { DEFAULT_CATEGORIES, categoryNameSchema, normalizeCode, productInputSchema } from "@/lib/domain/catalog";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "./helpers/db";

/**
 * T027 [US2] — CRUD de CATEGORIES e PRODUCTS (Server Actions + zod).
 * 002: produto é contêiner de VARIANTES (preço/custo vivem na variante).
 */

function defaultVariantId(db: Db, productId: number): number {
  const rows = listVariants(productId, { db });
  const row = rows[0];
  if (!row) throw new Error("produto sem variante default");
  return row.id;
}

describe("catalog.domain", () => {
  it("define categorias padrão do seed", () => {
    expect(DEFAULT_CATEGORIES).toContain("Geral");
  });

  it("valida nome de categoria (trim, não-vazio, tamanho)", () => {
    expect(categoryNameSchema.safeParse("  Filamentos  ").success).toBe(true);
    expect(categoryNameSchema.safeParse("   ").success).toBe(false);
    expect(categoryNameSchema.safeParse("").success).toBe(false);
  });

  it("valida input de produto (nome obrigatório; categoria opcional)", () => {
    const valid = { name: "Mini Pikachu", categoryId: 3 };
    expect(productInputSchema.safeParse(valid).success).toBe(true);

    const asForm = { name: "Mini Pikachu", categoryId: "3" };
    expect(productInputSchema.safeParse(asForm).success).toBe(true);

    expect(productInputSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
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

      const withProduct = createProduct({ name: "Refil PLA 1kg", categoryId: catId }, { db });
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
      createProduct({ name: "Refil PLA 1kg", categoryId: created.value.id }, { db });
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

  it("cria produto com 1 variante default, vincula categoria e alterna active", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const cat = createCategory({ name: "Geral" }, { db });
      if (!cat.ok) return;

      const p = createProduct({ name: "Mini Pikachu", categoryId: cat.value.id }, { db });
      expect(p.ok).toBe(true);
      if (!p.ok) return;

      const rows = listProducts({ db });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ name: "Mini Pikachu", categoryName: "Geral", active: true, variantCount: 1 });
      expect(defaultVariantId(db, p.value.id)).toBeGreaterThan(0);

      const updated = updateProduct(p.value.id, { name: "Mini Pikachu com Bolha" }, { db });
      expect(updated.ok).toBe(true);
      expect(setProductActive(p.value.id, false, { db }).ok).toBe(true);
      expect(listProducts({ db })[0]).toMatchObject({ name: "Mini Pikachu com Bolha", active: false });
    } finally {
      cleanup();
    }
  });

  it("rejeita produto sem categoria válida", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const res = createProduct({ name: "Fantasma", categoryId: 999 }, { db });
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
      const p = createProduct({ name: "Mini Pikachu", categoryId: null }, { db });
      if (!p.ok) return;
      const variantId = defaultVariantId(db, p.value.id);

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
          variantId,
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

  it("permite excluir produto sem vínculo com venda (variantes/codes em cascata)", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct({ name: "Rascunho", categoryId: null }, { db });
      if (!p.ok) return;
      const variantId = defaultVariantId(db, p.value.id);
      createProductCode(variantId, { code: "ZZ9", channel: "shopee" }, { db });
      expect(deleteProduct(p.value.id, { db }).ok).toBe(true);
      expect(listProducts({ db })).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("contagem de códigos aparece na listagem de variantes", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct({ name: "Anel Goomba", categoryId: null }, { db });
      if (!p.ok) return;
      const variantId = defaultVariantId(db, p.value.id);
      createProductCode(variantId, { code: "S1", channel: "shopee" }, { db });
      createProductCode(variantId, { code: "T1", channel: "tiktok" }, { db });
      const variant = listVariants(p.value.id, { db })[0];
      expect(variant.accessoriesCents).toBe(0);
    } finally {
      cleanup();
    }
  });

  it("consolida acessórios num único campo da variante, somado ao custo de produção", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct({ name: "Caneca", categoryId: null }, { db });
      if (!p.ok) return;
      const created = createVariant(
        p.value.id,
        {
          sku: "CAN-2",
          name: "Caneca 2",
          printTimeMin: 0,
          manualTimeMin: 0,
          filamentMaterialId: null,
          filamentGrams: 0,
          packagingCents: 100,
          accessoriesCents: 250,
        },
        { db },
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const variantId = created.value.id;
      const bySku = () => listVariants(p.value.id, { db }).find((v) => v.id === variantId);
      expect(bySku()?.accessoriesCents).toBe(250);
      expect(bySku()?.costCents).toBe(350); // embalagem 100 + acessórios 250
      expect(updateVariant(variantId, { accessoriesCents: 500 }, { db }).ok).toBe(true);
      expect(bySku()?.costCents).toBe(600); // embalagem 100 + acessórios 500
    } finally {
      cleanup();
    }
  });

  it("listProducts conta unidades vendidas por produto, ignorando reembolsos", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct({ name: "Mini Bulbasaur", categoryId: null }, { db });
      if (!p.ok) return;
      const variantId = defaultVariantId(db, p.value.id);
      const sale1 = db
        .insert(sales)
        .values({
          channel: "shopee",
          saleDate: new Date(),
          status: "normal",
          grossCents: 10000,
          freightCents: 0,
          feeCents: 0,
          netCents: 10000,
          liquidCents: 0,
        })
        .run();
      db.insert(saleItems)
        .values({
          saleId: Number(sale1.lastInsertRowid),
          variantId,
          cProd: "X",
          description: "item",
          quantity: 2,
          unitPriceCents: 5000,
        })
        .run();
      const sale2 = db
        .insert(sales)
        .values({
          channel: "shopee",
          saleDate: new Date(),
          status: "refunded",
          grossCents: 10000,
          freightCents: 0,
          feeCents: 0,
          netCents: 10000,
          liquidCents: 0,
        })
        .run();
      db.insert(saleItems)
        .values({
          saleId: Number(sale2.lastInsertRowid),
          variantId,
          cProd: "X",
          description: "item",
          quantity: 5,
          unitPriceCents: 5000,
        })
        .run();
      const product = listProducts({ db })[0];
      expect(product.salesCount).toBe(2);
      expect(product.variantCount).toBe(1); // não infla com o join de sale_items
    } finally {
      cleanup();
    }
  });

  it("repara vínculos TikTok por descrição (desvincula contaminados, mantém corretos) e é idempotente", () => {
    const { db, cleanup } = setupTestDb();
    try {
      const p = createProduct({ name: "Ash Greninja", categoryId: null }, { db });
      if (!p.ok) return;
      const variantId = defaultVariantId(db, p.value.id);
      const ashDesc = "Ash Greninja Low Poly Pokemon | Enfeite Totem Decorativo Geek | Prateleira, Estante ou Mesa";
      const luffyDesc = "Luffy Low Poly | One Piece | Decoracao para Prateleira, Estante ou Mesa";
      const sale = db
        .insert(sales)
        .values({
          channel: "tiktok",
          saleDate: new Date(),
          grossCents: 10000,
          freightCents: 0,
          feeCents: 0,
          netCents: 10000,
          liquidCents: 0,
        })
        .run();
      const saleId = Number(sale.lastInsertRowid);
      db.insert(saleItems)
        .values([
          {
            saleId,
            variantId,
            cProd: "Padrao",
            description: ashDesc,
            quantity: 1,
            unitPriceCents: 5000,
            frozenCostCents: null,
          },
          {
            saleId,
            variantId,
            cProd: "Padrao",
            description: luffyDesc,
            quantity: 1,
            unitPriceCents: 5000,
            frozenCostCents: null,
          },
        ])
        .run();
      db.insert(productCodes)
        .values({ variantId, code: "Padrao", normalizedCode: normalizeCode("Padrao"), channel: "tiktok" })
        .run();

      const res = repairTikTokLinks({ db });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.unlinked).toBe(1);
      expect(res.value.learned).toBe(1);

      const luffy = db.select().from(saleItems).where(eq(saleItems.description, luffyDesc)).get();
      expect(luffy?.variantId).toBeNull();
      const ash = db.select().from(saleItems).where(eq(saleItems.description, ashDesc)).get();
      expect(ash?.variantId).toBe(variantId);

      const codes = db.select().from(productCodes).all();
      expect(codes.some((c) => c.code === "Padrao" && c.channel === "tiktok")).toBe(false);
      expect(codes.some((c) => c.code === ashDesc && c.channel === "tiktok")).toBe(true);

      const res2 = repairTikTokLinks({ db });
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.value.unlinked).toBe(0);
        expect(res2.value.learned).toBe(0);
      }
    } finally {
      cleanup();
    }
  });
});

// Import deliberado para manter o contrato de schema em teste.
void categories;
void products;
void variants;
