"use client";

import { createProduct, deleteProduct, setProductActive, updateProduct } from "@/app/actions/catalog";
import type { CategoryRow, ProductRow } from "@/lib/catalog/service";
import { formatBRL, parseBrlToCents } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";

/**
 * T027 — CRUD de produtos (US2). Preço/custo em centavos; inputs em R$
 * (fronteira de display), convertidos via parseBrlToCents (constitution).
 */

type Editor = { mode: "create" } | { mode: "edit"; product: ProductRow } | null;

export default function ProductsPanel({
  initialProducts,
  categories,
}: {
  initialProducts: ProductRow[];
  categories: CategoryRow[];
}) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [editor, setEditor] = useState<Editor>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyProducts = (result: { ok: true; data: { products: ProductRow[] } } | { ok: false; error: string }) => {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setProducts(result.data.products);
  };

  const openCreate = () => {
    setEditor({ mode: "create" });
    setName("");
    setCategoryId("");
    setPrice("");
    setCost("");
  };

  const openEdit = (product: ProductRow) => {
    setEditor({ mode: "edit", product });
    setName(product.name);
    setCategoryId(product.categoryId ? String(product.categoryId) : "");
    setPrice(toBRLInput(product.salePriceCents));
    setCost(toBRLInput(product.estimatedCostCents));
  };

  const centsOf = (field: string, raw: string): number | null => {
    try {
      const value = parseBrlToCents(raw);
      if (value < 0) throw new Error();
      return value;
    } catch {
      setMessage(`Valor inválido em "${field}" (use R$ ou 12,50).`);
      return null;
    }
  };

  const closeEditor = () => {
    setEditor(null);
    setMessage(null);
  };

  const submitCreate = () => {
    const salePriceCents = centsOf("preço", price);
    const estimatedCostCents = centsOf("custo", cost);
    if (salePriceCents === null || estimatedCostCents === null || !name.trim()) return;
    const form = new FormData();
    form.set("name", name);
    form.set("categoryId", categoryId);
    form.set("salePriceCents", String(salePriceCents));
    form.set("estimatedCostCents", String(estimatedCostCents));
    startTransition(async () => applyProducts(await createProduct(form)));
    closeEditor();
  };

  const submitEdit = () => {
    if (!editor || editor.mode !== "edit") return;
    const salePriceCents = centsOf("preço", price);
    const estimatedCostCents = centsOf("custo", cost);
    if (salePriceCents === null || estimatedCostCents === null || !name.trim()) return;
    const form = new FormData();
    form.set("id", String(editor.product.id));
    form.set("name", name);
    form.set("categoryId", categoryId);
    form.set("salePriceCents", String(salePriceCents));
    form.set("estimatedCostCents", String(estimatedCostCents));
    startTransition(async () => applyProducts(await updateProduct(form)));
    closeEditor();
  };

  const toggleActive = (product: ProductRow) => {
    const form = new FormData();
    form.set("id", String(product.id));
    form.set("active", String(!product.active));
    startTransition(async () => applyProducts(await setProductActive(form)));
  };

  const remove = (product: ProductRow) => {
    if (!window.confirm(`Remover o produto "${product.name}"?`)) return;
    const form = new FormData();
    form.set("id", String(product.id));
    startTransition(async () => applyProducts(await deleteProduct(form)));
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Produtos</h2>
        <button
          type="button"
          onClick={openCreate}
          disabled={pending || !!editor}
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          + Novo produto
        </button>
      </div>

      {editor && (
        <div className="space-y-3 border-b px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Categoria</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">— sem categoria —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Preço de venda (R$)</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder="12,50"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Custo estimado (R$)</span>
              <input
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                inputMode="decimal"
                placeholder="8,00"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={editor.mode === "create" ? submitCreate : submitEdit}
              disabled={pending || !name.trim()}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {editor.mode === "create" ? "Cadastrar" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md border px-4 py-1.5 text-sm text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Nenhum produto ainda — cadastre seu primeiro produto para começar a vincular os itens dos XMLs.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Preço</th>
                <th className="px-4 py-2 text-right">Custo</th>
                <th className="px-4 py-2 text-right">Margem</th>
                <th className="px-4 py-2 text-right">Códigos</th>
                <th className="px-4 py-2">Ativo</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id} className={cn(!product.active && "opacity-60")}>
                  <td className="max-w-60 px-4 py-2">
                    <span className="line-clamp-2">{product.name}</span>
                  </td>
                  <td className="px-4 py-2 text-xs">{product.categoryName ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{formatBRL(product.salePriceCents)}</td>
                  <td className="px-4 py-2 text-right">{formatBRL(product.estimatedCostCents)}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    {formatBRL(product.salePriceCents - product.estimatedCostCents)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">{product.codeCount}</td>
                  <td className="px-4 py-2 text-xs">{product.active ? "sim" : "não"}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={pending || !!editor}
                        onClick={() => openEdit(product)}
                        className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleActive(product)}
                        className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                      >
                        {product.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(product)}
                        className="rounded-md border px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className="border-t px-4 py-2 text-xs text-red-600">{message}</p>}
    </section>
  );
}

function toBRLInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
