import {
  listAllVariants,
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

export default function ProductsPage() {
  const categories = listCategories();
  const products = listProducts();
  const materials = listMaterials();
  const variants = listAllVariants();
  const unlinked = listUnlinkedGroups();
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
      <ProductsPanel initialProducts={products} categories={categories} materials={materials} />
      <UnlinkedPanel initialGroups={unlinked} variants={variants} />
    </div>
  );
}
