import { type Db, getDb } from "@/lib/db/client";
import {
  categories,
  channelFeeTiers,
  materials,
  printers,
  productCodes,
  products,
  saleItems,
  sales,
  variantPrices,
  variants,
} from "@/lib/db/schema";
import {
  type MaterialInput,
  type PrinterInput,
  type ProductCodeInput,
  type ProductPatch,
  type VariantPatch,
  categoryNameSchema,
  materialInputSchema,
  normalizeCategoryName,
  normalizeName,
  printerInputSchema,
  productCodeChannelLabel,
  productCodeInputSchema,
  productInputSchema,
  variantInputSchema,
  variantPriceInputSchema,
} from "@/lib/domain/catalog";
import { computeVariantCost } from "@/lib/domain/cost";
import { parseFeeTiersText } from "@/lib/domain/fees";
import { type ChannelFeeTier, computeSuggestedPriceCentsByTiers } from "@/lib/domain/pricing";
import {
  type PrinterInput as PrinterDomainInput,
  globalEnergyPerHour,
  globalMachinePerHour,
} from "@/lib/domain/printer";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getNumberSetting } from "../db/settings";

/**
 * CRUD do catálogo (produto → variante, material, preço por canal, impressora)
 * — lógica contra a `Db` injectável (Server Actions usam default; testes usam
 * memória). Constitution: dinheiro em centavos; nomes normalizados; exclusões
 * bloqueadas quando há referências (nunca apagar rastro) — D7.
 */

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CategoryRow = { id: number; name: string; productCount: number };

export type ProductRow = {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  marginBps: number;
  active: boolean;
  variantCount: number;
  salesCount: number;
};

export type VariantRow = {
  id: number;
  productId: number;
  sku: string;
  name: string;
  printTimeMin: number;
  manualTimeMin: number;
  filamentMaterialId: number | null;
  materialName: string | null;
  materialPricePerKgCents: number | null;
  filamentGrams: number;
  packagingCents: number;
  accessoriesCents: number;
  costCents: number;
  active: boolean;
};

export type VariantPriceRow = {
  id: number;
  variantId: number;
  channel: string;
  suggestedPriceCents: number;
  practicedPriceCents: number;
};

export type MaterialRow = { id: number; name: string; pricePerKgCents: number; active: boolean };
export type PrinterRow = {
  id: number;
  name: string;
  acquisitionCents: number;
  usefulLifeYears: number;
  powerWatts: number;
  maintenanceCentsPerHour: number;
  active: boolean;
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
      marginBps: products.marginBps,
      active: products.active,
      variantCount: sql<number>`count(distinct ${variants.id})`,
      salesCount: sql<number>`coalesce(sum(case when ${sales.status} != 'refunded' then ${saleItems.quantity} else 0 end), 0)`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(variants, eq(variants.productId, products.id))
    .leftJoin(saleItems, eq(saleItems.variantId, variants.id))
    .leftJoin(sales, eq(sales.id, saleItems.saleId))
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

/** Cria o produto + 1 variante default (produto simples = 1 variante — FR-002). */
export function createProduct(input: ProductPatch, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const data = parsed.data;
  const missing = assertCategoryExists(db, data.categoryId);
  if (missing) return { ok: false, error: missing };
  try {
    const productId = db.transaction((tx) => {
      const inserted = tx
        .insert(products)
        .values({
          name: data.name,
          categoryId: data.categoryId ?? null,
          marginBps: data.marginBps ?? 3500,
          active: true,
          createdAt: now(),
          updatedAt: now(),
        })
        .run();
      const pid = Number(inserted.lastInsertRowid);
      const sku = suggestSku(data.name);
      const variantInserted = tx
        .insert(variants)
        .values({
          productId: pid,
          sku,
          name: data.name,
          printTimeMin: 0,
          manualTimeMin: 0,
          filamentMaterialId: null,
          filamentGrams: 0,
          packagingCents: 0,
          accessoriesCents: 0,
          costCents: 0,
          active: true,
          createdAt: now(),
          updatedAt: now(),
        })
        .run();
      const variantId = Number(variantInserted.lastInsertRowid);
      recomputeVariantCost(tx, variantId);
      ensureVariantPrices(tx, variantId);
      return pid;
    });
    return { ok: true, value: { id: productId } };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return { ok: false, error: "SKU gerado já existe — renomeie o produto" };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Garante as linhas de preço (Shopee/TikTok) de uma variante, criando-as se ausentes. */
function ensureVariantPrices(db: Db, variantId: number): void {
  for (const channel of ["shopee", "tiktok"] as const) {
    const existing = db
      .select({ id: variantPrices.id })
      .from(variantPrices)
      .where(and(eq(variantPrices.variantId, variantId), eq(variantPrices.channel, channel)))
      .get();
    if (existing) continue;
    const cost =
      db.select({ cost: variants.costCents }).from(variants).where(eq(variants.id, variantId)).get()?.cost ?? 0;
    const tiers = channelFeeTiersOf(db, channel);
    const marginBps = variantMarginBps(db, variantId);
    let suggested = cost;
    try {
      suggested = computeSuggestedPriceCentsByTiers(cost, marginBps, tiers);
    } catch {
      suggested = cost;
    }
    db.insert(variantPrices)
      .values({
        variantId,
        channel,
        suggestedPriceCents: suggested,
        practicedPriceCents: suggested,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  }
}

/** SKU default derivado do nome (maiúsculas, sem espaços/acentos), único o bastante. */
function suggestSku(name: string): string {
  const base = normalizeName(name)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toUpperCase()
    .replace(/^-+|-+$/g, "");
  return `${base || "PRODUTO"}-${Date.now().toString(36).toUpperCase()}`;
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
      ...(data.marginBps !== undefined ? { marginBps: data.marginBps } : {}),
      updatedAt: now(),
    })
    .where(eq(products.id, id))
    .run();
  if (data.marginBps !== undefined) {
    const variantIds = db.select({ id: variants.id }).from(variants).where(eq(variants.productId, id)).all();
    for (const v of variantIds) recomputeSuggested(db, v.id);
  }
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
  const used =
    db
      .select({ n: sql<number>`count(*)` })
      .from(saleItems)
      .where(eq(saleItems.variantId, variants.id))
      .innerJoin(variants, eq(variants.productId, id))
      .get()?.n ?? 0;
  if (used > 0) return { ok: false, error: `produto vinculado a ${used} venda(s)` };
  db.delete(products).where(eq(products.id, id)).run();
  return { ok: true, value: { id } };
}

/* ============================== Variants ============================== */

export function listVariants(productId: number, opts?: { db?: Db }): VariantRow[] {
  const db = dbOf(opts);
  return db
    .select({
      id: variants.id,
      productId: variants.productId,
      sku: variants.sku,
      name: variants.name,
      printTimeMin: variants.printTimeMin,
      manualTimeMin: variants.manualTimeMin,
      filamentMaterialId: variants.filamentMaterialId,
      materialName: materials.name,
      materialPricePerKgCents: materials.pricePerKgCents,
      filamentGrams: variants.filamentGrams,
      packagingCents: variants.packagingCents,
      accessoriesCents: variants.accessoriesCents,
      costCents: variants.costCents,
      active: variants.active,
    })
    .from(variants)
    .leftJoin(materials, eq(materials.id, variants.filamentMaterialId))
    .where(eq(variants.productId, productId))
    .groupBy(variants.id)
    .orderBy(variants.name)
    .all();
}

function variantExists(db: Db, id: number): boolean {
  return !!db.select({ id: variants.id }).from(variants).where(eq(variants.id, id)).get();
}

export type FlatVariantRow = {
  id: number;
  sku: string;
  name: string;
  productName: string;
  priceCents: number;
  active: boolean;
};

/** Lista plana de variantes (p/ seleção em painéis de vínculo/presencial). */
export function listAllVariants(opts?: { db?: Db }): FlatVariantRow[] {
  const db = dbOf(opts);
  const rows = db
    .select({
      id: variants.id,
      sku: variants.sku,
      name: variants.name,
      productName: products.name,
      costCents: variants.costCents,
      active: variants.active,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .orderBy(products.name, variants.name)
    .all();
  const prices = db
    .select({ variantId: variantPrices.variantId, practicedPriceCents: variantPrices.practicedPriceCents })
    .from(variantPrices)
    .all();
  const maxByVariant = new Map<number, number>();
  for (const price of prices) {
    maxByVariant.set(price.variantId, Math.max(maxByVariant.get(price.variantId) ?? 0, price.practicedPriceCents));
  }
  return rows.map((row) => ({ ...row, priceCents: maxByVariant.get(row.id) ?? row.costCents }));
}

export function createVariant(
  productId: number,
  input: VariantPatch,
  opts?: { db?: Db },
): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  if (!db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get()) {
    return { ok: false, error: "produto não encontrado" };
  }
  const parsed = variantInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const data = parsed.data;
  try {
    const inserted = db
      .insert(variants)
      .values({
        productId,
        sku: data.sku,
        name: data.name,
        printTimeMin: data.printTimeMin,
        manualTimeMin: data.manualTimeMin,
        filamentMaterialId: data.filamentMaterialId,
        filamentGrams: data.filamentGrams,
        packagingCents: data.packagingCents,
        accessoriesCents: data.accessoriesCents,
        costCents: 0,
        active: true,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
    const variantId = Number(inserted.lastInsertRowid);
    recomputeVariantCost(db, variantId);
    ensureVariantPrices(db, variantId);
    return { ok: true, value: { id: variantId } };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return { ok: false, error: `SKU "${data.sku}" já existe` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function updateVariant(id: number, patch: VariantPatch, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = variantInputSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const data = parsed.data;
  if (!variantExists(db, id)) return { ok: false, error: "variante não encontrada" };
  try {
    db.update(variants)
      .set({
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.printTimeMin !== undefined ? { printTimeMin: data.printTimeMin } : {}),
        ...(data.manualTimeMin !== undefined ? { manualTimeMin: data.manualTimeMin } : {}),
        ...(data.filamentMaterialId !== undefined ? { filamentMaterialId: data.filamentMaterialId } : {}),
        ...(data.filamentGrams !== undefined ? { filamentGrams: data.filamentGrams } : {}),
        ...(data.packagingCents !== undefined ? { packagingCents: data.packagingCents } : {}),
        ...(data.accessoriesCents !== undefined ? { accessoriesCents: data.accessoriesCents } : {}),
        updatedAt: now(),
      })
      .where(eq(variants.id, id))
      .run();
    recomputeVariantCost(db, id);
    return { ok: true, value: { id } };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return { ok: false, error: `SKU "${data.sku}" já existe` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function setVariantActive(id: number, active: boolean, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  if (!variantExists(db, id)) return { ok: false, error: "variante não encontrada" };
  db.update(variants).set({ active, updatedAt: now() }).where(eq(variants.id, id)).run();
  return { ok: true, value: { id } };
}

export function deleteVariant(id: number, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  if (!variantExists(db, id)) return { ok: false, error: "variante não encontrada" };
  const productId = db
    .select({ productId: variants.productId })
    .from(variants)
    .where(eq(variants.id, id))
    .get()?.productId;
  if (productId == null) return { ok: false, error: "variante não encontrada" };
  const count =
    db.select({ n: sql<number>`count(*)` }).from(variants).where(eq(variants.productId, productId)).get()?.n ?? 0;
  const used = db.select({ n: sql<number>`count(*)` }).from(saleItems).where(eq(saleItems.variantId, id)).get()?.n ?? 0;
  if (used > 0) return { ok: false, error: `variante vinculada a ${used} venda(s)` };
  if (count <= 1) return { ok: false, error: "produto precisa de ao menos 1 variante" };
  db.delete(variants).where(eq(variants.id, id)).run();
  return { ok: true, value: { id } };
}

/* ============================== Materials ============================== */

export function listMaterials(opts?: { db?: Db }): MaterialRow[] {
  const db = dbOf(opts);
  return db.select().from(materials).orderBy(materials.name).all();
}

export function createMaterial(input: MaterialInput, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = materialInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  try {
    const inserted = db
      .insert(materials)
      .values({ ...parsed.data, active: true, createdAt: now() })
      .run();
    return { ok: true, value: { id: Number(inserted.lastInsertRowid) } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function updateMaterial(
  id: number,
  patch: Partial<MaterialInput>,
  opts?: { db?: Db },
): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = materialInputSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  if (!db.select({ id: materials.id }).from(materials).where(eq(materials.id, id)).get()) {
    return { ok: false, error: "material não encontrado" };
  }
  db.update(materials).set(parsed.data).where(eq(materials.id, id)).run();
  // Mudança de preço do material recalcula o custo das variantes que o usam (FR-006).
  const affected = db.select({ id: variants.id }).from(variants).where(eq(variants.filamentMaterialId, id)).all();
  for (const v of affected) recomputeVariantCost(db, v.id);
  return { ok: true, value: { id } };
}

export function deleteMaterial(id: number, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const used =
    db.select({ n: sql<number>`count(*)` }).from(variants).where(eq(variants.filamentMaterialId, id)).get()?.n ?? 0;
  if (used > 0) return { ok: false, error: `material em uso por ${used} variante(s)` };
  db.delete(materials).where(eq(materials.id, id)).run();
  return { ok: true, value: { id } };
}

/* ============================== Variant Prices ============================== */

export function listVariantPrices(variantId: number, opts?: { db?: Db }): VariantPriceRow[] {
  const db = dbOf(opts);
  return db
    .select()
    .from(variantPrices)
    .where(eq(variantPrices.variantId, variantId))
    .orderBy(variantPrices.channel)
    .all();
}

/**
 * Define o preço praticado de uma variante × canal. Recalcula o preço sugerido
 * usando a margem do PRODUTO + faixas de taxa do canal, mas NUNCA sobrescreve o
 * praticado (FR-011) — a menos que seja criação (default = sugerido).
 */
export function upsertVariantPrice(
  variantId: number,
  input: {
    channel: "shopee" | "tiktok";
    practicedPriceCents?: number;
    setPracticedToSuggested?: boolean;
  },
  opts?: { db?: Db },
): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  if (!variantExists(db, variantId)) return { ok: false, error: "variante não encontrada" };
  const existing = db
    .select({
      id: variantPrices.id,
      suggestedPriceCents: variantPrices.suggestedPriceCents,
      practicedPriceCents: variantPrices.practicedPriceCents,
    })
    .from(variantPrices)
    .where(and(eq(variantPrices.variantId, variantId), eq(variantPrices.channel, input.channel)))
    .get();

  const costCents =
    db.select({ cost: variants.costCents }).from(variants).where(eq(variants.id, variantId)).get()?.cost ?? 0;
  const tiers = channelFeeTiersOf(db, input.channel);
  const marginBps = variantMarginBps(db, variantId);
  let suggested: number;
  try {
    suggested = computeSuggestedPriceCentsByTiers(costCents, marginBps, tiers);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  let practiced = existing?.practicedPriceCents ?? 0;
  if (input.practicedPriceCents !== undefined) practiced = input.practicedPriceCents;
  else if (input.setPracticedToSuggested || !existing) practiced = suggested;

  try {
    if (existing) {
      db.update(variantPrices)
        .set({ suggestedPriceCents: suggested, practicedPriceCents: practiced, updatedAt: now() })
        .where(eq(variantPrices.id, existing.id))
        .run();
      return { ok: true, value: { id: existing.id } };
    }
    const inserted = db
      .insert(variantPrices)
      .values({
        variantId,
        channel: input.channel,
        suggestedPriceCents: suggested,
        practicedPriceCents: practiced,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
    return { ok: true, value: { id: Number(inserted.lastInsertRowid) } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Faixas de taxa de um canal (channel_fee_tiers), ordenadas por min. */
function channelFeeTiersOf(db: Db, channel: string): ChannelFeeTier[] {
  return db
    .select({
      minCents: channelFeeTiers.minCents,
      maxCents: channelFeeTiers.maxCents,
      commissionBps: channelFeeTiers.commissionBps,
      fixedCents: channelFeeTiers.fixedCents,
    })
    .from(channelFeeTiers)
    .where(eq(channelFeeTiers.channel, channel))
    .orderBy(channelFeeTiers.minCents)
    .all();
}

/** Margem unificada do PRODUTO dono da variante (005). */
function variantMarginBps(db: Db, variantId: number): number {
  const row = db
    .select({ marginBps: products.marginBps })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.id, variantId))
    .get();
  return row?.marginBps ?? 3500;
}

/* ============================== Channel Fee Tiers ============================== */

/** Faixas de taxa de um canal (para o editor). */
export function listChannelFeeTiers(channel: string, opts?: { db?: Db }): ChannelFeeTier[] {
  return channelFeeTiersOf(dbOf(opts), channel);
}

/** Salva as faixas de um canal (substitui o conjunto) e recalcula os sugeridos. */
export function saveChannelFeeTiers(
  channel: "shopee" | "tiktok",
  text: string,
  opts?: { db?: Db },
): ServiceResult<{ tiers: ChannelFeeTier[] }> {
  const db = dbOf(opts);
  let tiers: ChannelFeeTier[];
  try {
    tiers = parseFeeTiersText(text);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const nowDate = now();
  db.delete(channelFeeTiers).where(eq(channelFeeTiers.channel, channel)).run();
  for (const tier of tiers) {
    db.insert(channelFeeTiers)
      .values({ channel, ...tier, createdAt: nowDate, updatedAt: nowDate })
      .run();
  }
  // Recalcula o preço sugerido de toda variante com preço nesse canal.
  const variantsWithPrice = db
    .select({ id: variantPrices.variantId })
    .from(variantPrices)
    .where(eq(variantPrices.channel, channel))
    .all();
  for (const v of variantsWithPrice) recomputeSuggested(db, v.id);
  return { ok: true, value: { tiers } };
}

/* ============================== Printers ============================== */

export function listPrinters(opts?: { db?: Db }): PrinterRow[] {
  const db = dbOf(opts);
  return db.select().from(printers).orderBy(printers.name).all();
}

export function createPrinter(input: PrinterInput, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = printerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  try {
    const inserted = db
      .insert(printers)
      .values({ ...parsed.data, active: true, createdAt: now() })
      .run();
    const id = Number(inserted.lastInsertRowid);
    recalcAllCosts(db);
    return { ok: true, value: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function updatePrinter(
  id: number,
  patch: Partial<PrinterInput>,
  opts?: { db?: Db },
): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  const parsed = printerInputSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  if (!db.select({ id: printers.id }).from(printers).where(eq(printers.id, id)).get()) {
    return { ok: false, error: "impressora não encontrada" };
  }
  db.update(printers).set(parsed.data).where(eq(printers.id, id)).run();
  recalcAllCosts(db);
  return { ok: true, value: { id } };
}

export function deletePrinter(id: number, opts?: { db?: Db }): ServiceResult<{ id: number }> {
  const db = dbOf(opts);
  db.delete(printers).where(eq(printers.id, id)).run();
  recalcAllCosts(db);
  return { ok: true, value: { id } };
}

/* ============================== Cost engine ============================== */

/** Recalcula e persiste `variants.costCents` de uma variante (cache do motor). */
export function recomputeVariantCost(db: Db, variantId: number): number {
  const v = db
    .select({
      printTimeMin: variants.printTimeMin,
      manualTimeMin: variants.manualTimeMin,
      filamentGrams: variants.filamentGrams,
      packagingCents: variants.packagingCents,
      accessoriesCents: variants.accessoriesCents,
      materialPricePerKgCents: materials.pricePerKgCents,
    })
    .from(variants)
    .leftJoin(materials, eq(materials.id, variants.filamentMaterialId))
    .where(eq(variants.id, variantId))
    .get();
  if (!v) return 0;
  const globalEnergy = globalEnergyPerHour(activePrinters(db), {
    kwhRateCents: getNumberSetting("kwh_rate_cents", 0, { db }),
    hoursPerWeek: getNumberSetting("hours_per_week", 0, { db }),
  });
  const globalMachine = globalMachinePerHour(activePrinters(db), {
    kwhRateCents: getNumberSetting("kwh_rate_cents", 0, { db }),
    hoursPerWeek: getNumberSetting("hours_per_week", 0, { db }),
  });
  const laborPerHour = getNumberSetting("labor_cost_per_hour_cents", 0, { db });
  const breakdown = computeVariantCost(
    {
      printTimeMin: v.printTimeMin,
      manualTimeMin: v.manualTimeMin,
      filamentMaterialPricePerKgCents: v.materialPricePerKgCents,
      filamentGrams: v.filamentGrams,
      packagingCents: v.packagingCents,
      accessoriesCents: v.accessoriesCents,
    },
    globalEnergy,
    globalMachine,
    { laborCostPerHourCents: laborPerHour },
  );
  db.update(variants)
    .set({ costCents: breakdown.totalCents, updatedAt: now() })
    .where(eq(variants.id, variantId))
    .run();
  recomputeSuggested(db, variantId);
  return breakdown.totalCents;
}

export type CostBreakdownRow = {
  filamentCents: number;
  energyCents: number;
  machineCents: number;
  laborCents: number;
  packagingCents: number;
  accessoriesCents: number;
  totalCents: number;
};

/** Detalhamento de custo por linha (FR-005) — mesmo cálculo, sem persistir. */
export function getVariantCostBreakdown(db: Db, variantId: number): CostBreakdownRow {
  const v = db
    .select({
      printTimeMin: variants.printTimeMin,
      manualTimeMin: variants.manualTimeMin,
      filamentGrams: variants.filamentGrams,
      packagingCents: variants.packagingCents,
      accessoriesCents: variants.accessoriesCents,
      materialPricePerKgCents: materials.pricePerKgCents,
    })
    .from(variants)
    .leftJoin(materials, eq(materials.id, variants.filamentMaterialId))
    .where(eq(variants.id, variantId))
    .get();
  const empty: CostBreakdownRow = {
    filamentCents: 0,
    energyCents: 0,
    machineCents: 0,
    laborCents: 0,
    packagingCents: 0,
    accessoriesCents: 0,
    totalCents: 0,
  };
  if (!v) return empty;
  const globalEnergy = globalEnergyPerHour(activePrinters(db), {
    kwhRateCents: getNumberSetting("kwh_rate_cents", 0, { db }),
    hoursPerWeek: getNumberSetting("hours_per_week", 0, { db }),
  });
  const globalMachine = globalMachinePerHour(activePrinters(db), {
    kwhRateCents: getNumberSetting("kwh_rate_cents", 0, { db }),
    hoursPerWeek: getNumberSetting("hours_per_week", 0, { db }),
  });
  const laborPerHour = getNumberSetting("labor_cost_per_hour_cents", 0, { db });
  const breakdown = computeVariantCost(
    {
      printTimeMin: v.printTimeMin,
      manualTimeMin: v.manualTimeMin,
      filamentMaterialPricePerKgCents: v.materialPricePerKgCents,
      filamentGrams: v.filamentGrams,
      packagingCents: v.packagingCents,
      accessoriesCents: v.accessoriesCents,
    },
    globalEnergy,
    globalMachine,
    { laborCostPerHourCents: laborPerHour },
  );
  return breakdown;
}

/** Recalcula o preço sugerido das linhas de preço de uma variante (nunca o praticado). */
function recomputeSuggested(db: Db, variantId: number): void {
  const cost =
    db.select({ cost: variants.costCents }).from(variants).where(eq(variants.id, variantId)).get()?.cost ?? 0;
  const marginBps = variantMarginBps(db, variantId);
  const rows = db.select().from(variantPrices).where(eq(variantPrices.variantId, variantId)).all();
  for (const row of rows) {
    const tiers = channelFeeTiersOf(db, row.channel);
    let suggested: number;
    try {
      suggested = computeSuggestedPriceCentsByTiers(cost, marginBps, tiers);
    } catch {
      suggested = row.suggestedPriceCents;
    }
    db.update(variantPrices)
      .set({ suggestedPriceCents: suggested, updatedAt: now() })
      .where(eq(variantPrices.id, row.id))
      .run();
  }
}

function activePrinters(db: Db): PrinterDomainInput[] {
  return db.select().from(printers).all();
}

/** Recalcula o custo de TODAS as variantes (após mudar impressora/parâmetro global). */
export function recalcAllCosts(db: Db): void {
  const ids = db.select({ id: variants.id }).from(variants).all();
  for (const v of ids) recomputeVariantCost(db, v.id);
}

/* ============================ Product Codes ============================ */

export type ProductCodeRow = {
  id: number;
  variantId: number;
  code: string;
  channel: string | null; // null = geral (vale para qualquer canal)
};

export function listProductCodes(variantId: number, opts?: { db?: Db }): ProductCodeRow[] {
  const db = dbOf(opts);
  return db
    .select({
      id: productCodes.id,
      variantId: productCodes.variantId,
      code: productCodes.code,
      channel: productCodes.channel,
    })
    .from(productCodes)
    .where(eq(productCodes.variantId, variantId))
    .orderBy(productCodes.channel, productCodes.code)
    .all();
}

export function createProductCode(
  variantId: number,
  input: { code: string; channel: ProductCodeInput["channel"] },
  opts?: { db?: Db },
): ServiceResult<{ code: ProductCodeRow }> {
  const db = dbOf(opts);
  if (!variantExists(db, variantId)) return { ok: false, error: "variante não encontrada" };
  const parsed = productCodeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error.issues) };
  const { code, channel } = parsed.data;
  const channelValue = channel === "geral" ? null : channel;
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
    const inserted = db.insert(productCodes).values({ variantId, code, channel: channelValue, createdAt: now() }).run();
    return {
      ok: true,
      value: { code: { id: Number(inserted.lastInsertRowid), variantId, code, channel: channelValue } },
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

/* ===================== Unlinked queue (granularidade de variante) ===================== */

export type UnlinkedGroup = {
  cProd: string;
  channel: string;
  description: string;
  count: number;
  totalCents: number;
  firstSaleDate: Date;
};

/** Fila "códigos sem vínculo": itens sem variante, agrupados pela chave de vínculo
 *  (cProd para Shopee/presencial; DESCRIÇÃO para TikTok — 006). */
export function listUnlinkedGroups(opts?: { db?: Db }): UnlinkedGroup[] {
  const db = dbOf(opts);
  const key = sql<string>`case when ${sales.channel} = 'tiktok' then ${saleItems.description} else ${saleItems.cProd} end`;
  return db
    .select({
      cProd: key,
      channel: sales.channel,
      description: sql<string>`max(${saleItems.description})`,
      count: sql<number>`count(*)`,
      totalCents: sql<number>`sum(${saleItems.quantity} * ${saleItems.unitPriceCents})`,
      firstSaleDate: sql<Date>`min(${sales.saleDate})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(isNull(saleItems.variantId))
    .groupBy(key, sales.channel)
    .orderBy(sql`min(${sales.saleDate}) desc`)
    .all();
}

/**
 * Vínculo manual da fila: aprende a CHAVE (cProd para Shopee/presencial;
 * DESCRIÇÃO para TikTok — 006) → variante para os próximos imports e faz
 * backfill de `variant_id` nos itens pendentes do mesmo canal e chave. NUNCA
 * mexe em `frozenCostCents` (D6) — custo segue congelado como foi gravado.
 */
export function linkUnlinkedToVariant(
  input: { variantId: number; cProd: string; channel: string },
  opts?: { db?: Db },
): ServiceResult<{ linked: number; learned: boolean }> {
  const db = dbOf(opts);
  if (!variantExists(db, input.variantId)) return { ok: false, error: "variante não encontrada" };
  const isTiktok = input.channel === "tiktok";
  const key = normalizeName(input.cProd);
  const channelForCode = input.channel === "shopee" || input.channel === "tiktok" ? input.channel : "geral";
  const channelValue = channelForCode === "geral" ? null : channelForCode;

  const existing = db
    .select({
      id: productCodes.id,
      variantId: productCodes.variantId,
      code: productCodes.code,
      channel: productCodes.channel,
    })
    .from(productCodes)
    .where(eq(sql`lower(${productCodes.code})`, key.toLowerCase()))
    .all()
    .find((row) => (channelValue === null ? row.channel === null : row.channel === channelValue));

  let learned = false;
  if (existing) {
    if (existing.variantId !== input.variantId) {
      return { ok: false, error: `código "${key}" já pertence a outra variante — confira a fila antes de vincular` };
    }
  } else {
    const created = createProductCode(input.variantId, { code: key, channel: channelForCode }, { db });
    if (!created.ok) return created;
    learned = true;
  }

  const saleIds = db.select({ id: sales.id }).from(sales).where(eq(sales.channel, input.channel));
  // Backfill casa a MESMA chave por canal: descrição (TikTok) ou cProd (demais).
  const matchCol = isTiktok ? sql`lower(${saleItems.description})` : sql`lower(${saleItems.cProd})`;
  const updated = db
    .update(saleItems)
    .set({ variantId: input.variantId })
    .where(and(isNull(saleItems.variantId), eq(matchCol, key.toLowerCase()), inArray(saleItems.saleId, saleIds)))
    .run();

  return { ok: true, value: { linked: Number(updated.changes), learned } };
}

/**
 * Aplica o custo ATUAL da variante aos itens vinculados sem custo congelado:
 * só `frozenCostCents IS NULL` muda; venda que já tem custo NUNCA é alterada.
 */
export function applyCurrentCostToUncosted(opts?: { db?: Db }): ServiceResult<{ updated: number }> {
  const db = dbOf(opts);
  const rows = db
    .select({ id: saleItems.id, saleId: saleItems.saleId, cost: variants.costCents })
    .from(saleItems)
    .innerJoin(variants, eq(saleItems.variantId, variants.id))
    .where(isNull(saleItems.frozenCostCents))
    .all();

  const affectedSales = new Set<number>();
  for (const row of rows) {
    db.update(saleItems).set({ frozenCostCents: row.cost }).where(eq(saleItems.id, row.id)).run();
    affectedSales.add(row.saleId);
  }

  for (const saleId of affectedSales) {
    const totalCost =
      db
        .select({ sum: sql<number>`coalesce(sum(${saleItems.frozenCostCents}), 0)` })
        .from(saleItems)
        .where(eq(saleItems.saleId, saleId))
        .get()?.sum ?? 0;
    const net = db.select({ net: sales.netCents }).from(sales).where(eq(sales.id, saleId)).get()?.net ?? 0;
    db.update(sales)
      .set({ liquidCents: net - totalCost })
      .where(eq(sales.id, saleId))
      .run();
  }

  return { ok: true, value: { updated: rows.length } };
}

/**
 * Reparo de vínculos TikTok (006): como o `cProd` do TikTok é o genérico
 * 'Padrao', um vínculo aprendido puxou itens de OUTROS produtos. Esta ação
 * explícita (US2):
 *  1. Remove códigos aprendidos genéricos ('Padrao', 'tiktok').
 *  2. Desvincula itens TikTok cujo produto vinculado NÃO está contido na
 *     descrição — apenas os sem custo congelado (D6: nunca altera custo aplicado).
 *  3. Aprende um código por DESCRIÇÃO para os itens mantidos (auto-vínculo futuro).
 * Idempotente: na 2ª execução não há itens pendentes nem código 'Padrao'.
 */
export function repairTikTokLinks(opts?: { db?: Db }): ServiceResult<{ unlinked: number; learned: number }> {
  const db = dbOf(opts);

  db.delete(productCodes)
    .where(and(eq(productCodes.code, "Padrao"), eq(productCodes.channel, "tiktok")))
    .run();

  const toUnlink = db
    .select({ id: saleItems.id })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .leftJoin(variants, eq(saleItems.variantId, variants.id))
    .leftJoin(products, eq(products.id, variants.productId))
    .where(
      and(
        eq(sales.channel, "tiktok"),
        isNotNull(saleItems.variantId),
        isNull(saleItems.frozenCostCents),
        or(isNull(products.name), sql`instr(lower(${saleItems.description}), lower(${products.name})) = 0`),
      ),
    )
    .all();
  const unlinked = toUnlink.length;
  for (const row of toUnlink) {
    db.update(saleItems).set({ variantId: null, frozenCostCents: null }).where(eq(saleItems.id, row.id)).run();
  }

  const kept = db
    .select({ variantId: saleItems.variantId, description: saleItems.description })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(sales.channel, "tiktok"), isNotNull(saleItems.variantId)))
    .all();
  let learned = 0;
  const seen = new Set<string>();
  for (const item of kept) {
    const desc = item.description?.trim();
    if (!desc || seen.has(desc) || item.variantId == null) continue;
    seen.add(desc);
    const created = createProductCode(item.variantId, { code: desc, channel: "tiktok" }, { db });
    if (created.ok) learned++;
  }

  return { ok: true, value: { unlinked, learned } };
}
