"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import {
  type CategoryRow,
  type CostBreakdownRow,
  type MaterialRow,
  type PrinterRow,
  type ProductCodeRow,
  type ProductRow,
  type UnlinkedGroup,
  type VariantPriceRow,
  type VariantRow,
  applyCurrentCostToUncosted as applyCurrentCostService,
  createCategory as createCategoryService,
  createMaterial as createMaterialService,
  createPrinter as createPrinterService,
  createProductCode as createProductCodeService,
  createProduct as createProductService,
  createVariant as createVariantService,
  deleteCategory as deleteCategoryService,
  deleteMaterial as deleteMaterialService,
  deletePrinter as deletePrinterService,
  deleteProductCode as deleteProductCodeService,
  deleteProduct as deleteProductService,
  deleteVariant as deleteVariantService,
  getVariantCostBreakdown,
  linkUnlinkedToVariant as linkUnlinkedService,
  listCategories,
  listChannelFeeTiers,
  listMaterials,
  listPrinters,
  listProductCodes as listProductCodesService,
  listProducts,
  listUnlinkedGroups,
  listVariantPrices,
  listVariants,
  recalcAllCosts,
  renameCategory as renameCategoryService,
  repairTikTokLinks,
  saveChannelFeeTiers,
  setProductActive as setProductActiveService,
  setVariantActive as setVariantActiveService,
  updateMaterial as updateMaterialService,
  updatePrinter as updatePrinterService,
  updateProduct as updateProductService,
  updateVariant as updateVariantService,
  upsertVariantPrice,
} from "@/lib/catalog/service";
import { getDb } from "@/lib/db/client";
import { setNumberSetting } from "@/lib/db/settings";
import type { ProductCodeInput } from "@/lib/domain/catalog";
import { percentToBps } from "@/lib/domain/fees";
import { revalidatePath } from "next/cache";

/**
 * Server Actions do catálogo (produto → variante, material, preço por canal,
 * impressora) — validação zod no service, resultado tipado com as listas
 * atualizadas (fonte de verdade = servidor) + revalidação.
 */

/** "" e valores vazios do select significam "sem categoria" (null). */
function parseOptionalId(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  return value ? Number(value) : null;
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  return String(raw) === "true";
}

function productForm(formData: FormData) {
  const marginRaw = String(formData.get("marginBps") ?? "");
  return {
    name: String(formData.get("name") ?? ""),
    categoryId: parseOptionalId(formData.get("categoryId")),
    ...(marginRaw !== "" ? { marginBps: percentToBps(Number(marginRaw)) } : {}),
  };
}

function variantForm(formData: FormData) {
  return {
    sku: String(formData.get("sku") ?? ""),
    name: String(formData.get("name") ?? ""),
    printTimeMin: Number(formData.get("printTimeMin") ?? 0),
    manualTimeMin: Number(formData.get("manualTimeMin") ?? 0),
    filamentMaterialId: parseOptionalId(formData.get("filamentMaterialId")),
    filamentGrams: Number(formData.get("filamentGrams") ?? 0),
    packagingCents: Number(formData.get("packagingCents") ?? 0),
    accessoriesCents: Number(formData.get("accessoriesCents") ?? 0),
  };
}

/* ============================== Categories ============================== */

export async function createCategory(formData: FormData): Promise<ActionResult<{ categories: CategoryRow[] }>> {
  const db = getDb().db;
  const result = createCategoryService({ name: String(formData.get("name") ?? "") }, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ categories: listCategories({ db }) });
}

export async function renameCategory(formData: FormData): Promise<ActionResult<{ categories: CategoryRow[] }>> {
  const db = getDb().db;
  const result = renameCategoryService(Number(formData.get("id")), String(formData.get("name") ?? ""), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ categories: listCategories({ db }) });
}

export async function deleteCategory(formData: FormData): Promise<ActionResult<{ categories: CategoryRow[] }>> {
  const db = getDb().db;
  const result = deleteCategoryService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ categories: listCategories({ db }) });
}

/* ============================== Products ============================== */

export async function createProduct(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const result = createProductService(productForm(formData), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ products: listProducts({ db }) });
}

export async function updateProduct(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const patch: Record<string, unknown> = {};
  if (formData.has("name")) patch.name = String(formData.get("name"));
  if (formData.has("categoryId")) patch.categoryId = parseOptionalId(formData.get("categoryId"));
  if (formData.has("marginBps") && String(formData.get("marginBps")) !== "")
    patch.marginBps = percentToBps(Number(formData.get("marginBps")));
  const result = updateProductService(Number(formData.get("id")), patch, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ products: listProducts({ db }) });
}

export async function setProductActive(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const result = setProductActiveService(Number(formData.get("id")), parseBool(formData.get("active")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ products: listProducts({ db }) });
}

export async function deleteProduct(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const result = deleteProductService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ products: listProducts({ db }) });
}

/* ============================== Variants ============================== */

export async function getVariants(formData: FormData): Promise<ActionResult<{ variants: VariantRow[] }>> {
  const db = getDb().db;
  return actionData({ variants: listVariants(Number(formData.get("productId")), { db }) });
}

export async function createVariant(formData: FormData): Promise<ActionResult<{ variants: VariantRow[] }>> {
  const db = getDb().db;
  const productId = Number(formData.get("productId"));
  const result = createVariantService(productId, variantForm(formData), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ variants: listVariants(productId, { db }) });
}

export async function updateVariant(formData: FormData): Promise<ActionResult<{ variants: VariantRow[] }>> {
  const db = getDb().db;
  const id = Number(formData.get("id"));
  const productId = Number(formData.get("productId"));
  const patch: Record<string, unknown> = {};
  if (formData.has("sku")) patch.sku = String(formData.get("sku"));
  if (formData.has("name")) patch.name = String(formData.get("name"));
  if (formData.has("printTimeMin")) patch.printTimeMin = Number(formData.get("printTimeMin"));
  if (formData.has("manualTimeMin")) patch.manualTimeMin = Number(formData.get("manualTimeMin"));
  if (formData.has("filamentMaterialId"))
    patch.filamentMaterialId = parseOptionalId(formData.get("filamentMaterialId"));
  if (formData.has("filamentGrams")) patch.filamentGrams = Number(formData.get("filamentGrams"));
  if (formData.has("packagingCents")) patch.packagingCents = Number(formData.get("packagingCents"));
  if (formData.has("accessoriesCents")) patch.accessoriesCents = Number(formData.get("accessoriesCents"));
  const result = updateVariantService(id, patch, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ variants: listVariants(productId, { db }) });
}

export async function setVariantActive(formData: FormData): Promise<ActionResult<{ variants: VariantRow[] }>> {
  const db = getDb().db;
  const productId = Number(formData.get("productId"));
  const result = setVariantActiveService(Number(formData.get("id")), parseBool(formData.get("active")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ variants: listVariants(productId, { db }) });
}

export async function deleteVariant(formData: FormData): Promise<ActionResult<{ variants: VariantRow[] }>> {
  const db = getDb().db;
  const productId = Number(formData.get("productId"));
  const result = deleteVariantService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ variants: listVariants(productId, { db }) });
}

/* ============================== Materials ============================== */

export async function getMaterials(): Promise<ActionResult<{ materials: MaterialRow[] }>> {
  const db = getDb().db;
  return actionData({ materials: listMaterials({ db }) });
}

export async function createMaterial(formData: FormData): Promise<ActionResult<{ materials: MaterialRow[] }>> {
  const db = getDb().db;
  const result = createMaterialService(
    {
      name: String(formData.get("name") ?? ""),
      pricePerKgCents: Number(formData.get("pricePerKgCents") ?? 0),
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/pricing");
  revalidatePath("/products");
  return actionData({ materials: listMaterials({ db }) });
}

export async function updateMaterial(formData: FormData): Promise<ActionResult<{ materials: MaterialRow[] }>> {
  const db = getDb().db;
  const patch: Record<string, unknown> = {};
  if (formData.has("name")) patch.name = String(formData.get("name"));
  if (formData.has("pricePerKgCents")) patch.pricePerKgCents = Number(formData.get("pricePerKgCents"));
  const result = updateMaterialService(Number(formData.get("id")), patch, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/pricing");
  revalidatePath("/products");
  return actionData({ materials: listMaterials({ db }) });
}

export async function deleteMaterial(formData: FormData): Promise<ActionResult<{ materials: MaterialRow[] }>> {
  const db = getDb().db;
  const result = deleteMaterialService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/pricing");
  revalidatePath("/products");
  return actionData({ materials: listMaterials({ db }) });
}

/* ============================== Variant Prices ============================== */

export async function getVariantPrices(formData: FormData): Promise<ActionResult<{ prices: VariantPriceRow[] }>> {
  const db = getDb().db;
  return actionData({ prices: listVariantPrices(Number(formData.get("variantId")), { db }) });
}

export async function getVariantCostDetail(formData: FormData): Promise<ActionResult<{ breakdown: CostBreakdownRow }>> {
  const db = getDb().db;
  return actionData({ breakdown: getVariantCostBreakdown(db, Number(formData.get("variantId"))) });
}

export async function upsertVariantPriceAction(
  formData: FormData,
): Promise<ActionResult<{ prices: VariantPriceRow[] }>> {
  const db = getDb().db;
  const variantId = Number(formData.get("variantId"));
  const result = upsertVariantPrice(
    variantId,
    {
      channel: String(formData.get("channel")) as "shopee" | "tiktok",
      ...(formData.has("practicedPriceCents")
        ? { practicedPriceCents: Number(formData.get("practicedPriceCents")) }
        : {}),
      ...(formData.has("setPracticedToSuggested") && String(formData.get("setPracticedToSuggested")) === "true"
        ? { setPracticedToSuggested: true }
        : {}),
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ prices: listVariantPrices(variantId, { db }) });
}

/** Salva as faixas de taxa de um canal (005) a partir do texto do editor. */
export async function saveChannelFeeTiersAction(
  formData: FormData,
): Promise<ActionResult<{ channel: string; text: string }>> {
  const db = getDb().db;
  const channel = String(formData.get("channel")) as "shopee" | "tiktok";
  const text = String(formData.get("text") ?? "");
  const result = saveChannelFeeTiers(channel, text, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ channel, text });
}

/** Faixas de taxa por canal (005) — para o lucro estimado do editor de preço. */
export async function getFeeTiers(): Promise<
  ActionResult<{
    tiers: Record<
      "shopee" | "tiktok",
      Array<{ minCents: number; maxCents: number | null; commissionBps: number; fixedCents: number }>
    >;
  }>
> {
  const db = getDb().db;
  return actionData({
    tiers: { shopee: listChannelFeeTiers("shopee", { db }), tiktok: listChannelFeeTiers("tiktok", { db }) },
  });
}

/* ============================== Printers ============================== */

export async function getPrinters(): Promise<ActionResult<{ printers: PrinterRow[] }>> {
  const db = getDb().db;
  return actionData({ printers: listPrinters({ db }) });
}

export async function createPrinter(formData: FormData): Promise<ActionResult<{ printers: PrinterRow[] }>> {
  const db = getDb().db;
  const result = createPrinterService(
    {
      name: String(formData.get("name") ?? ""),
      acquisitionCents: Number(formData.get("acquisitionCents") ?? 0),
      usefulLifeYears: Number(formData.get("usefulLifeYears") ?? 3),
      powerWatts: Number(formData.get("powerWatts") ?? 0),
      maintenanceCentsPerHour: Number(formData.get("maintenanceCentsPerHour") ?? 0),
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/printers");
  revalidatePath("/products");
  return actionData({ printers: listPrinters({ db }) });
}

export async function updatePrinter(formData: FormData): Promise<ActionResult<{ printers: PrinterRow[] }>> {
  const db = getDb().db;
  const patch: Record<string, unknown> = {};
  if (formData.has("name")) patch.name = String(formData.get("name"));
  if (formData.has("acquisitionCents")) patch.acquisitionCents = Number(formData.get("acquisitionCents"));
  if (formData.has("usefulLifeYears")) patch.usefulLifeYears = Number(formData.get("usefulLifeYears"));
  if (formData.has("powerWatts")) patch.powerWatts = Number(formData.get("powerWatts"));
  if (formData.has("maintenanceCentsPerHour"))
    patch.maintenanceCentsPerHour = Number(formData.get("maintenanceCentsPerHour"));
  const result = updatePrinterService(Number(formData.get("id")), patch, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/printers");
  revalidatePath("/products");
  return actionData({ printers: listPrinters({ db }) });
}

export async function deletePrinter(formData: FormData): Promise<ActionResult<{ printers: PrinterRow[] }>> {
  const db = getDb().db;
  const result = deletePrinterService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/printers");
  revalidatePath("/products");
  return actionData({ printers: listPrinters({ db }) });
}

/* ============================== Global params ============================== */

export async function setGlobalParams(formData: FormData): Promise<ActionResult<{ saved: boolean }>> {
  const db = getDb().db;
  if (formData.has("kwhRateCents")) setNumberSetting("kwh_rate_cents", Number(formData.get("kwhRateCents")), { db });
  if (formData.has("hoursPerWeek")) setNumberSetting("hours_per_week", Number(formData.get("hoursPerWeek")), { db });
  if (formData.has("laborCostPerHourCents"))
    setNumberSetting("labor_cost_per_hour_cents", Number(formData.get("laborCostPerHourCents")), { db });
  // Parâmetros globais alimentam energia/máquina/mão de obra: recalc tudo (004/US2).
  recalcAllCosts(db);
  revalidatePath("/settings/pricing");
  revalidatePath("/products");
  return actionData({ saved: true });
}

/* ============================ Product Codes (variante) ============================ */

export async function getProductCodes(formData: FormData): Promise<ActionResult<{ codes: ProductCodeRow[] }>> {
  const db = getDb().db;
  return actionData({ codes: listProductCodesService(Number(formData.get("variantId")), { db }) });
}

export async function addProductCode(
  formData: FormData,
): Promise<ActionResult<{ codes: ProductCodeRow[]; products: ProductRow[] }>> {
  const db = getDb().db;
  const variantId = Number(formData.get("variantId"));
  const result = createProductCodeService(
    variantId,
    {
      code: String(formData.get("code") ?? ""),
      channel: String(formData.get("channel") ?? "geral") as ProductCodeInput["channel"],
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ codes: listProductCodesService(variantId, { db }), products: listProducts({ db }) });
}

export async function removeProductCode(
  formData: FormData,
): Promise<ActionResult<{ codes: ProductCodeRow[]; products: ProductRow[] }>> {
  const db = getDb().db;
  const variantId = Number(formData.get("variantId"));
  const result = deleteProductCodeService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ codes: listProductCodesService(variantId, { db }), products: listProducts({ db }) });
}

/* ============================ Unlinked queue (variante) ============================ */

export async function listUnlinked(): Promise<ActionResult<{ groups: UnlinkedGroup[] }>> {
  return actionData({ groups: listUnlinkedGroups() });
}

export async function linkUnlinked(
  formData: FormData,
): Promise<ActionResult<{ groups: UnlinkedGroup[]; products: ProductRow[] }>> {
  const db = getDb().db;
  const result = linkUnlinkedService(
    {
      variantId: Number(formData.get("variantId")),
      cProd: String(formData.get("cProd") ?? ""),
      channel: String(formData.get("channel") ?? ""),
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ groups: listUnlinkedGroups({ db }), products: listProducts({ db }) });
}

export async function applyCurrentCost(): Promise<
  ActionResult<{ groups: UnlinkedGroup[]; products: ProductRow[]; updated: number }>
> {
  const db = getDb().db;
  const result = applyCurrentCostService({ db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({
    groups: listUnlinkedGroups({ db }),
    products: listProducts({ db }),
    updated: result.value.updated,
  });
}

/** Reparo de vínculos TikTok por descrição (006/US2) — ação explícita e idempotente. */
export async function repairTikTokLinksAction(): Promise<
  ActionResult<{ groups: UnlinkedGroup[]; products: ProductRow[]; unlinked: number; learned: number }>
> {
  const db = getDb().db;
  const result = repairTikTokLinks({ db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({
    groups: listUnlinkedGroups({ db }),
    products: listProducts({ db }),
    unlinked: result.value.unlinked,
    learned: result.value.learned,
  });
}
