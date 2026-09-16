import { listCategories, listProducts } from "@/lib/catalog/service";
import type { Metadata } from "next";
import CategoriesPanel from "./categories-panel";
import ProductsPanel from "./products-panel";

export const metadata: Metadata = {
  title: "Produtos · sale-track",
};

export default function ProductsPage() {
  const categories = listCategories();
  const products = listProducts();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Catálogo de produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "produto" : "produtos"} · {categories.length}{" "}
          {categories.length === 1 ? "categoria" : "categorias"} — preço/custo em centavos, margem com taxa do canal
          (cxmoney). Os códigos dos marketplaces (Shopee/TikTok) são vinculados aos produtos para que cada importação de
          XML já traga o custo congelado na venda.
        </p>
      </div>

      <CategoriesPanel initialCategories={categories} />
      <ProductsPanel initialProducts={products} categories={categories} />
    </div>
  );
}
