import {
  type CatalogFilters,
  listAllVariants,
  listCatalog,
  listCategories,
  listMaterials,
  listProducts,
  listUnlinkedGroups,
} from "@/lib/catalog/service";
import type { Metadata } from "next";
import CategoriesPanel from "./categories-panel";
import ProductsPanel from "./products-panel";
import UnlinkedPanel from "./unlinked-panel";

export const metadata: Metadata = {
  title: "Produtos · sale-track",
};

type ProductsSearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<ProductsSearchParams> }) {
  const params = (await searchParams) ?? {};
  const categories = listCategories();
  const filters = catalogFiltersFromParams(params);
  const products = listCatalog(filters);
  const allProducts = listProducts();
  const materials = listMaterials();
  const variants = listAllVariants();
  const unlinked = listUnlinkedGroups();
  const filterOptions = {
    productTypes: distinct(allProducts.map((product) => product.productType)),
    themes: distinct(allProducts.map((product) => product.theme)),
    colors: distinct(allProducts.map((product) => product.primaryColor)),
    sizes: distinct(allProducts.map((product) => product.sizeLabel)),
    finishes: distinct(allProducts.map((product) => product.finish)),
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Catálogo de produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "produto" : "produtos"} · {categories.length}{" "}
          {categories.length === 1 ? "categoria" : "categorias"} — cada produto tem uma ou mais variantes (SKU único),
          com custo calculado e preço sugerido/praticado por canal (Shopee/TikTok).
        </p>
      </div>

      <CategoriesPanel initialCategories={categories} />
      <ProductsPanel
        initialProducts={products}
        categories={categories}
        materials={materials}
        initialFilters={filters}
        filterOptions={filterOptions}
      />
      <UnlinkedPanel initialGroups={unlinked} variants={variants} />
    </div>
  );
}

function catalogFiltersFromParams(params: ProductsSearchParams): CatalogFilters {
  return {
    q: scalar(params.q),
    categoryId: optionalNumber(params.categoryId),
    status: statusFilter(scalar(params.status)),
    productType: scalar(params.productType),
    theme: scalar(params.theme),
    color: scalar(params.color),
    size: scalar(params.size),
    finish: scalar(params.finish),
  };
}

function scalar(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = String(raw ?? "").trim();
  return trimmed || undefined;
}

function optionalNumber(value: string | string[] | undefined): number | null | undefined {
  const raw = scalar(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function statusFilter(value: string | undefined): CatalogFilters["status"] {
  if (value === "inactive" || value === "all") return value;
  return "active";
}

function distinct(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b));
}
