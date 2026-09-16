"use server";

import { type ActionResult, actionData, actionError } from "@/lib/actions";
import {
  type CategoryRow,
  type ProductCodeRow,
  type ProductRow,
  createCategory as createCategoryService,
  createProductCode as createProductCodeService,
  createProduct as createProductService,
  deleteCategory as deleteCategoryService,
  deleteProductCode as deleteProductCodeService,
  deleteProduct as deleteProductService,
  listCategories,
  listProductCodes as listProductCodesService,
  listProducts,
  renameCategory as renameCategoryService,
  setProductActive as setProductActiveService,
  updateProduct as updateProductService,
} from "@/lib/catalog/service";
import { getDb } from "@/lib/db/client";
import type { ProductCodeInput } from "@/lib/domain/catalog";
import { revalidatePath } from "next/cache";

/**
 * Server Actions do catálogo (T027/US2) — validação zod no service, resultado
 * tipado com as listas atualizadas (fonte de verdade = servidor) + revalidação.
 */

/** "" e valores vazios do select significam "sem categoria" (null). */
function parseCategoryId(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  return value ? Number(value) : null;
}

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

export async function createProduct(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const result = createProductService(
    {
      name: String(formData.get("name") ?? ""),
      categoryId: parseCategoryId(formData.get("categoryId")),
      salePriceCents: Number(formData.get("salePriceCents") ?? 0),
      estimatedCostCents: Number(formData.get("estimatedCostCents") ?? 0),
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ products: listProducts({ db }) });
}

export async function updateProduct(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const patch = {
    ...(formData.has("name") ? { name: String(formData.get("name")) } : {}),
    ...(formData.has("categoryId") ? { categoryId: parseCategoryId(formData.get("categoryId")) } : {}),
    ...(formData.has("salePriceCents") ? { salePriceCents: Number(formData.get("salePriceCents")) } : {}),
    ...(formData.has("estimatedCostCents") ? { estimatedCostCents: Number(formData.get("estimatedCostCents")) } : {}),
  };
  const result = updateProductService(Number(formData.get("id")), patch, { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ products: listProducts({ db }) });
}

export async function setProductActive(formData: FormData): Promise<ActionResult<{ products: ProductRow[] }>> {
  const db = getDb().db;
  const result = setProductActiveService(Number(formData.get("id")), String(formData.get("active")) === "true", {
    db,
  });
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

/* ============================ Product Codes (T029) ============================ */

export async function getProductCodes(formData: FormData): Promise<ActionResult<{ codes: ProductCodeRow[] }>> {
  const db = getDb().db;
  return actionData({ codes: listProductCodesService(Number(formData.get("productId")), { db }) });
}

export async function addProductCode(
  formData: FormData,
): Promise<ActionResult<{ codes: ProductCodeRow[]; products: ProductRow[] }>> {
  const db = getDb().db;
  const productId = Number(formData.get("productId"));
  const result = createProductCodeService(
    productId,
    {
      code: String(formData.get("code") ?? ""),
      channel: String(formData.get("channel") ?? "geral") as ProductCodeInput["channel"],
    },
    { db },
  );
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ codes: listProductCodesService(productId, { db }), products: listProducts({ db }) });
}

export async function removeProductCode(
  formData: FormData,
): Promise<ActionResult<{ codes: ProductCodeRow[]; products: ProductRow[] }>> {
  const db = getDb().db;
  const productId = Number(formData.get("productId"));
  const result = deleteProductCodeService(Number(formData.get("id")), { db });
  if (!result.ok) return actionError(result.error);
  revalidatePath("/products");
  return actionData({ codes: listProductCodesService(productId, { db }), products: listProducts({ db }) });
}
