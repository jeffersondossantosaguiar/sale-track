import { type Db, getDb } from "@/lib/db/client";
import { categories, productCodes, products, saleItems } from "@/lib/db/schema";
import {
  type ProductCodeInput,
  type ProductPatch,
  categoryNameSchema,
  normalizeCategoryName,
  productCodeChannelLabel,
  productCodeInputSchema,
  productInputSchema,
} from "@/lib/domain/catalog";
import { and, eq, sql } from "drizzle-orm";

/**
 * CRUD de CATEGORIES e PRODUCTS (T027) — lógica pura contra a `Db` injectável
 * (Server Actions chamam com o client default; testes usam memória).
 * Regras (constitution): dinheiro em centavos; nomes normalizados; exclusões
 * bloqueadas quando há referências (nunca apagar rastro) — D7.
 */

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CategoryRow = { id: number; name: string; productCount: number };

export type ProductRow = {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  salePriceCents: number;
  estimatedCostCents: number;
  active: boolean;
  codeCount: number;
};

const now = () => new Date();

function dbOf(opts?: { db?: Db }): Db {
  return opts?.db ?? getDb().db;
}

function zodMessage(issues: { message: string }[]): string {
  return issues.map((issue) => issue.message).join("; ");
}

/* ============================== Categories ============================== */

export function listCategories(opts?: { db?: Db }): CategoryRow[] {
  const db = dbOf(opts);
  return db
    .select({
      id: categories.id,
      name: categories.name,
      productCount: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name)
    .all();
}

export function createCategory(
  input: { name: string },
  opts?: { db?: Db },
): ServiceResult<{ id: number; name: string }> {
  const db = dbOf(opts);
  const parsed = categoryNameSchema.safeParse(input.name);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const name = normalizeCategoryName(parsed.data);
  const existing = db.select({ id: categories.id }).from(categories).where(eq(categories.name, name)).get();
  if (existing) return { ok: false, error: `categoria "${name}" já existe` };
  try {
    const inserted = db.insert(categories).values({ name, createdAt: now(), updatedAt: now() }).run();
    return { ok: true, value: { id: Number(inserted.lastInsertRowid), name } };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return { ok: false, error: `categoria "${name}" já existe` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function renameCategory(id: number, rawName: string, opts?: { db?: Db }): ServiceResult<{ name: string }> {
  const db = dbOf(opts);
  const parsed = categoryNameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const name = normalizeCategoryName(parsed.data);
  if (!db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).get()) {
    return { ok: false, error: "categoria não encontrada" };
  }
  const clash = db.select({ id: categories.id }).from(categories).where(eq(categories.name, name)).all();
  if (clash.some((row) => row.id !== id)) return { ok: false, error: `categoria "${name}" já existe` };
  try {
    db.update(categories).set({ name, updatedAt: now() }).where(eq(categories.id, id)).run();
    return { ok: true, value: { name } };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return { ok: false, error: `categoria "${name}" já existe` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function deleteCategory(id: number, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const count = db.select({ n: sql<number>`count(*)` }).from(products).where(eq(products.categoryId, id)).get()?.n ?? 0;
  if (count > 0) return { ok: false, error: `categoria em uso por ${count} produto(s)` };
  db.delete(categories).where(eq(categories.id, id)).run();
  return { ok: true, value: { id } };
}

/* ============================== Products ============================== */

export function listProducts(opts?: { db?: Db }): ProductRow[] {
  const db = dbOf(opts);
  return db
    .select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      salePriceCents: products.salePriceCents,
      estimatedCostCents: products.estimatedCostCents,
      active: products.active,
      codeCount: sql<number>`count(${productCodes.id})`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productCodes, eq(productCodes.productId, products.id))
    .groupBy(products.id)
    .orderBy(products.name)
    .all();
}

function assertCategoryExists(db: Db, categoryId: number | null | undefined): string | null {
  if (categoryId == null) return null;
  if (!db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).get()) {
    return "categoria não encontrada";
  }
  return null;
}

export function createProduct(input: ProductPatch, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const data = parsed.data;
  const missing = assertCategoryExists(db, data.categoryId);
  if (missing) return { ok: false, error: missing };
  try {
    const inserted = db
      .insert(products)
      .values({
        name: data.name,
        categoryId: data.categoryId ?? null,
        salePriceCents: data.salePriceCents,
        estimatedCostCents: data.estimatedCostCents,
        active: true,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
    return { ok: true, value: { id: Number(inserted.lastInsertRowid) } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function updateProduct(id: number, patch: ProductPatch, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = productInputSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const data = parsed.data;
  if (!db.select({ id: products.id }).from(products).where(eq(products.id, id)).get()) {
    return { ok: false, error: "produto não encontrado" };
  }
  const missing = assertCategoryExists(db, data.categoryId);
  if (missing) return { ok: false, error: missing };
  db.update(products)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId ?? null } : {}),
      ...(data.salePriceCents !== undefined ? { salePriceCents: data.salePriceCents } : {}),
      ...(data.estimatedCostCents !== undefined ? { estimatedCostCents: data.estimatedCostCents } : {}),
      updatedAt: now(),
    })
    .where(eq(products.id, id))
    .run();
  return { ok: true, value: { id } };
}

export function setProductActive(id: number, active: boolean, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  if (!db.select({ id: products.id }).from(products).where(eq(products.id, id)).get()) {
    return { ok: false, error: "produto não encontrado" };
  }
  db.update(products).set({ active, updatedAt: now() }).where(eq(products.id, id)).run();
  return { ok: true, value: { id } };
}

export function deleteProduct(id: number, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const used = db.select({ n: sql<number>`count(*)` }).from(saleItems).where(eq(saleItems.productId, id)).get()?.n ?? 0;
  if (used > 0) return { ok: false, error: `produto vinculado a ${used} venda(s)` };
  db.delete(products).where(eq(products.id, id)).run();
  return { ok: true, value: { id } };
}

/* ============================ Product Codes ============================ */

export type ProductCodeRow = {
  id: number;
  productId: number;
  code: string;
  channel: string | null; // null = geral (vale para qualquer canal)
};

export function listProductCodes(productId: number, opts?: { db?: Db }): ProductCodeRow[] {
  const db = dbOf(opts);
  return db
    .select({
      id: productCodes.id,
      productId: productCodes.productId,
      code: productCodes.code,
      channel: productCodes.channel,
    })
    .from(productCodes)
    .where(eq(productCodes.productId, productId))
    .orderBy(productCodes.channel, productCodes.code)
    .all();
}

export function createProductCode(
  productId: number,
  input: { code: string; channel: ProductCodeInput["channel"] },
  opts?: { db?: Db },
): ServiceResult<{ code: ProductCodeRow }> {
  const db = dbOf(opts);
  if (!db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get()) {
    return { ok: false, error: "produto não encontrado" };
  }
  const parsed = productCodeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const { code, channel } = parsed.data;
  const channelValue = channel === "geral" ? null : channel;

  // unicidade por (code, channel): NULL não é deduplicado pelo índice UNIQUE,
  // então checamos explicitamente aqui (código geral vs canal específico).
  // Comparação case-insensitive para evitar variantes que nunca casariam no import.
  const needle = code.toLowerCase();
  const clash = db
    .select({ id: productCodes.id, code: productCodes.code, channel: productCodes.channel })
    .from(productCodes)
    .where(eq(sql`lower(${productCodes.code})`, needle))
    .all()
    .find(
      (row) =>
        row.code.toLowerCase() === needle &&
        (channelValue === null ? row.channel === null : row.channel === channelValue),
    );
  if (clash) {
    return { ok: false, error: `código "${code}" já cadastrado para canal ${productCodeChannelLabel(channel)}` };
  }

  try {
    const inserted = db.insert(productCodes).values({ productId, code, channel: channelValue, createdAt: now() }).run();
    return {
      ok: true,
      value: { code: { id: Number(inserted.lastInsertRowid), productId, code, channel: channelValue } },
    };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return { ok: false, error: `código "${code}" já cadastrado para canal ${productCodeChannelLabel(channel)}` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function deleteProductCode(id: number, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  if (!db.select({ id: productCodes.id }).from(productCodes).where(eq(productCodes.id, id)).get()) {
    return { ok: false, error: "código não encontrado" };
  }
  db.delete(productCodes).where(eq(productCodes.id, id)).run();
  return { ok: true, value: { id } };
}
