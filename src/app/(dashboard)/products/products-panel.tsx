"use client";

import {
  addProductCode,
  createProduct,
  deleteProduct,
  removeProductCode,
  setProductActive,
  updateProduct,
  upsertVariantPriceAction,
} from "@/app/actions/catalog";
import type { CategoryRow, MaterialRow, ProductRow, VariantPriceRow, VariantRow } from "@/lib/catalog/service";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, useTransition } from "react";

/**
 * 002/US1–US3 — CRUD de produto → variante, com custo calculado, preços por
 * canal (Shopee/TikTok) e acessórios. Preços/margens em centavos/bps; inputs
 * em R$ na fronteira de display (constitution).
 */

type Editor = { mode: "create" } | { mode: "edit"; product: ProductRow } | null;
type VariantEditor = { variantId: number } | null;

type CostBreakdown = {
  filamentCents: number;
  energyMachineCents: number;
  laborCents: number;
  packagingCents: number;
  accessoriesCents: number;
  totalCents: number;
};

export default function ProductsPanel({
  initialProducts,
  categories,
  materials,
}: {
  initialProducts: ProductRow[];
  categories: CategoryRow[];
  materials: MaterialRow[];
}) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [editor, setEditor] = useState<Editor>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
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

  const visibleProducts = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => p.name.toLowerCase().includes(needle));
  }, [products, filter]);

  const openCreate = () => {
    setEditor({ mode: "create" });
    setName("");
    setCategoryId("");
  };

  const openEdit = (product: ProductRow) => {
    setEditor({ mode: "edit", product });
    setName(product.name);
    setCategoryId(product.categoryId ? String(product.categoryId) : "");
  };

  const closeEditor = () => {
    setEditor(null);
    setMessage(null);
  };

  const submitProduct = () => {
    if (!name.trim()) return;
    const form = new FormData();
    form.set("name", name);
    form.set("categoryId", categoryId);
    if (editor?.mode === "edit") form.set("id", String(editor.product.id));
    startTransition(async () =>
      applyProducts(await (editor?.mode === "edit" ? updateProduct(form) : createProduct(form))),
    );
    closeEditor();
  };

  const toggleActive = (product: ProductRow) => {
    const form = new FormData();
    form.set("id", String(product.id));
    form.set("active", String(!product.active));
    startTransition(async () => applyProducts(await setProductActive(form)));
  };

  const remove = (product: ProductRow) => {
    if (!window.confirm(`Remover o produto "${product.name}" (e suas variantes)?`)) return;
    const form = new FormData();
    form.set("id", String(product.id));
    startTransition(async () => applyProducts(await deleteProduct(form)));
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Produtos</h2>
        <span className="text-xs text-muted-foreground">
          {products.length} {products.length === 1 ? "produto" : "produtos"}
          <span className="mx-2 text-border">|</span>
          <button
            type="button"
            onClick={openCreate}
            disabled={pending || !!editor}
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            + Novo produto
          </button>
        </span>
      </div>

      {products.length > 0 && (
        <div className="border-b px-4 py-3">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={`Filtrar por nome (${products.length} produtos)`}
            className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      )}

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
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submitProduct}
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
        <div className="max-h-[40rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Variantes</th>
                <th className="px-4 py-2">Ativo</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleProducts.map((product) => (
                <>
                  <tr key={product.id} className={cn(!product.active && "opacity-60")}>
                    <td className="max-w-60 px-4 py-2">
                      <span className="line-clamp-2">{product.name}</span>
                    </td>
                    <td className="px-4 py-2 text-xs">{product.categoryName ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-xs">{product.variantCount}</td>
                    <td className="px-4 py-2 text-xs">{product.active ? "sim" : "não"}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setExpanded(expanded === product.id ? null : product.id)}
                          className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                        >
                          {expanded === product.id ? "Fechar" : "Variantes"}
                        </button>
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
                  {expanded === product.id && (
                    <tr key={`${product.id}-variants`}>
                      <td colSpan={5} className="bg-muted/20 px-4 py-3">
                        <VariantManager productId={product.id} materials={materials} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className="border-t px-4 py-2 text-xs text-red-600">{message}</p>}
    </section>
  );
}

function VariantManager({ productId, materials }: { productId: number; materials: MaterialRow[] }) {
  const [variants, setVariants] = useState<VariantRow[] | null>(null);
  const [open, setOpen] = useState<VariantEditor>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const form = new FormData();
    form.set("productId", String(productId));
    void import("@/app/actions/catalog")
      .then((m) => m.getVariants(form))
      .then((result) => {
        if (result.ok) setVariants(result.data.variants);
      });
  }, [productId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Variantes</span>
        <button
          type="button"
          disabled={pending || !!open}
          onClick={() => setOpen({ variantId: 0 })}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          + Variante
        </button>
      </div>

      {variants === null && <p className="text-xs text-muted-foreground">Carregando…</p>}

      {variants?.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma variante. Adicione a primeira.</p>
      )}

      <ul className="space-y-2">
        {variants?.map((variant) => (
          <li key={variant.id} className={cn("rounded-md border bg-background p-3", !variant.active && "opacity-60")}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium">{variant.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">SKU {variant.sku}</span>
                <span className="ml-2 text-xs text-muted-foreground">custo {formatBRL(variant.costCents)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending || !!open}
                  onClick={() => setOpen({ variantId: variant.id })}
                  className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending || !!open}
                  onClick={() => {
                    const f = new FormData();
                    f.set("productId", String(productId));
                    f.set("id", String(variant.id));
                    f.set("active", String(!variant.active));
                    startTransition(async () => {
                      const r = await import("@/app/actions/catalog").then((m) => m.setVariantActive(f));
                      if (r.ok) setVariants(r.data.variants);
                      else setMessage(r.error);
                    });
                  }}
                  className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                >
                  {variant.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  disabled={pending || !!open}
                  onClick={() => {
                    if (!window.confirm(`Remover a variante "${variant.name}"?`)) return;
                    const f = new FormData();
                    f.set("productId", String(productId));
                    f.set("id", String(variant.id));
                    startTransition(async () => {
                      const r = await import("@/app/actions/catalog").then((m) => m.deleteVariant(f));
                      if (r.ok) setVariants(r.data.variants);
                      else setMessage(r.error);
                    });
                  }}
                  className="rounded-md border px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              impressão {variant.printTimeMin}min · manual {variant.manualTimeMin}min · {variant.filamentGrams}g{" "}
              {variant.materialName ?? "sem material"} · embalagem {formatBRL(variant.packagingCents)}
            </div>
          </li>
        ))}
      </ul>

      {open && (
        <VariantEditorForm
          key={open.variantId}
          productId={productId}
          variantId={open.variantId}
          materials={materials}
          variants={variants ?? []}
          onDone={(next) => {
            setVariants(next);
            setOpen(null);
            setMessage(null);
          }}
          onError={(error) => setMessage(error)}
        />
      )}

      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}

function VariantEditorForm({
  productId,
  variantId,
  materials,
  variants,
  onDone,
  onError,
}: {
  productId: number;
  variantId: number;
  materials: MaterialRow[];
  variants: VariantRow[];
  onDone: (next: VariantRow[]) => void;
  onError: (error: string) => void;
}) {
  const editing = variants.find((v) => v.id === variantId);
  const [sku, setSku] = useState(editing?.sku ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [printTimeMin, setPrintTimeMin] = useState(String(editing?.printTimeMin ?? "0"));
  const [manualTimeMin, setManualTimeMin] = useState(String(editing?.manualTimeMin ?? "0"));
  const [materialId, setMaterialId] = useState(String(editing?.filamentMaterialId ?? ""));
  const [grams, setGrams] = useState(String(editing?.filamentGrams ?? "0"));
  const [packaging, setPackaging] = useState(toBRLInput(editing?.packagingCents ?? 0));
  const [prices, setPrices] = useState<VariantPriceRow[]>([]);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (variantId === 0) return;
    let active = true;
    const f = new FormData();
    f.set("variantId", String(variantId));
    Promise.all([
      import("@/app/actions/catalog").then((m) => m.getVariantPrices(f)),
      import("@/app/actions/catalog").then((m) => m.getVariantCostDetail(f)),
    ]).then(([pr, br]) => {
      if (!active) return;
      if (pr.ok) setPrices(pr.data.prices);
      if (br.ok) setBreakdown(br.data.breakdown);
    });
    return () => {
      active = false;
    };
  }, [variantId]);

  const submit = () => {
    const form = new FormData();
    form.set("productId", String(productId));
    if (editing) form.set("id", String(editing.id));
    form.set("sku", sku);
    form.set("name", name);
    form.set("printTimeMin", printTimeMin);
    form.set("manualTimeMin", manualTimeMin);
    form.set("filamentMaterialId", materialId);
    form.set("filamentGrams", grams);
    form.set("packagingCents", String(centsOf(packaging)));
    startTransition(async () => {
      const r = await import("@/app/actions/catalog").then((m) =>
        editing ? m.updateVariant(form) : m.createVariant(form),
      );
      if (r.ok) onDone(r.data.variants);
      else onError(r.error);
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-background p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs text-muted-foreground">SKU (único)</span>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-muted-foreground">Nome da variante</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Tempo de impressão (min)</span>
          <input
            value={printTimeMin}
            onChange={(e) => setPrintTimeMin(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Tempo manual (min)</span>
          <input
            value={manualTimeMin}
            onChange={(e) => setManualTimeMin(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Material (filamento)</span>
          <select
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">— sem material —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {formatBRL(m.pricePerKgCents)}/kg
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Peso / filamento (g)</span>
          <input
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Embalagem (R$)</span>
          <input
            value={packaging}
            onChange={(e) => setPackaging(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>

      {variantId !== 0 && <CostBreakdownBox breakdown={breakdown} />}
      {variantId !== 0 && <PriceEditor variantId={variantId} initial={prices} costCents={editing?.costCents ?? 0} />}
      {variantId !== 0 && <AccessoriesEditor variantId={variantId} />}
      {variantId !== 0 && <CodesEditor variantId={variantId} />}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !sku.trim() || !name.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {editing ? "Salvar variante" : "Criar variante"}
        </button>
        <button
          type="button"
          onClick={() => onDone(variants)}
          className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function CostBreakdownBox({ breakdown }: { breakdown: CostBreakdown | null }) {
  if (!breakdown) return null;
  const rows: Array<{ label: string; cents: number; highlight?: boolean }> = [
    { label: "Filamento", cents: breakdown.filamentCents },
    { label: "Energia + máquina", cents: breakdown.energyMachineCents },
    { label: "Mão de obra", cents: breakdown.laborCents, highlight: true },
    { label: "Embalagem", cents: breakdown.packagingCents },
    { label: "Acessórios", cents: breakdown.accessoriesCents },
  ];
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <span className="text-xs font-semibold text-muted-foreground">Custo por linha</span>
      <ul className="mt-1 space-y-0.5 text-xs">
        {rows.map((row) => (
          <li key={row.label} className={cn("flex items-center justify-between", row.highlight && "font-semibold")}>
            <span className={row.highlight ? "text-foreground" : "text-muted-foreground"}>{row.label}</span>
            <span>{formatBRL(row.cents)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t pt-1 font-medium">
          <span>Custo total</span>
          <span>{formatBRL(breakdown.totalCents)}</span>
        </li>
      </ul>
    </div>
  );
}

function PriceEditor({
  variantId,
  initial,
  costCents,
}: {
  variantId: number;
  initial: VariantPriceRow[];
  costCents: number;
}) {
  const [prices, setPrices] = useState<VariantPriceRow[]>(initial);
  const [pending, startTransition] = useTransition();
  const channels = ["shopee", "tiktok"] as const;

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <span className="text-xs font-semibold text-muted-foreground">Preço por canal</span>
      <div className="mt-2 space-y-2">
        {channels.map((channel) => {
          const price = prices.find((p) => p.channel === channel);
          const [margin, setMargin] = useState(String(price?.marginBps ?? "0"));
          const [practiced, setPracticed] = useState(toBRLInput(price?.practicedPriceCents ?? 0));
          const profit = (price?.practicedPriceCents ?? 0) - costCents;
          const profitBps =
            (price?.practicedPriceCents ?? 0) > 0 ? (profit / (price?.practicedPriceCents ?? 1)) * 100 : 0;
          return (
            <div key={channel} className="flex flex-wrap items-end gap-2">
              <span className="w-16 text-xs capitalize text-muted-foreground">{channel}</span>
              <label className="block">
                <span className="text-xs text-muted-foreground">Margem %</span>
                <input
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  inputMode="decimal"
                  className="mt-0.5 w-20 rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Preço praticado (R$)</span>
                <input
                  value={practiced}
                  onChange={(e) => setPracticed(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="mt-0.5 w-28 rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <span className="text-xs text-muted-foreground">
                sugerido {price ? formatBRL(price.suggestedPriceCents) : "—"}
              </span>
              <span className="text-xs">
                lucro {formatBRL(profit)}{" "}
                <span className="text-muted-foreground">({profitBps.toFixed(1).replace(".", ",")}%)</span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const f = new FormData();
                  f.set("variantId", String(variantId));
                  f.set("channel", channel);
                  f.set("marginBps", String(Number(margin) * 100));
                  f.set("practicedPriceCents", String(centsOf(practiced)));
                  startTransition(async () => {
                    const r = await upsertVariantPriceAction(f);
                    if (r.ok) setPrices(r.data.prices);
                  });
                }}
                className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccessoriesEditor({ variantId }: { variantId: number }) {
  const [accessories, setAccessories] = useState<Array<{ id: number; name: string; costCents: number }>>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const f = new FormData();
    f.set("variantId", String(variantId));
    void import("@/app/actions/catalog")
      .then((m) => m.getAccessories(f))
      .then((r) => {
        if (active && r.ok) setAccessories(r.data.accessories);
      });
    return () => {
      active = false;
    };
  }, [variantId]);

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <span className="text-xs font-semibold text-muted-foreground">Acessórios (custo somado)</span>
      {accessories.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Nenhum acessório.</p>}
      <ul className="mt-1 space-y-1">
        {accessories.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-xs">
            <span>
              {a.name} · {formatBRL(a.costCents)}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const f = new FormData();
                f.set("variantId", String(variantId));
                f.set("id", String(a.id));
                startTransition(async () => {
                  const r = await import("@/app/actions/catalog").then((m) => m.removeAccessoryAction(f));
                  if (r.ok) setAccessories(r.data.accessories);
                  else setMessage(r.error);
                });
              }}
              className="text-red-600"
            >
              remover
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("variantId", String(variantId));
          startTransition(async () => {
            const r = await import("@/app/actions/catalog").then((m) => m.addAccessoryAction(fd));
            if (r.ok) setAccessories(r.data.accessories);
            else setMessage(r.error);
          });
          (e.currentTarget.elements.namedItem("accName") as HTMLInputElement).value = "";
          (e.currentTarget.elements.namedItem("accCost") as HTMLInputElement).value = "";
        }}
      >
        <input
          name="accName"
          placeholder="ex.: argola"
          required
          maxLength={80}
          className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
        />
        <input
          name="accCost"
          placeholder="R$"
          inputMode="decimal"
          required
          className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
        >
          + acessório
        </button>
      </form>
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </div>
  );
}

function CodesEditor({ variantId }: { variantId: number }) {
  const [codes, setCodes] = useState<Array<{ id: number; code: string; channel: string | null }>>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const f = new FormData();
    f.set("variantId", String(variantId));
    void import("@/app/actions/catalog")
      .then((m) => m.getProductCodes(f))
      .then((r) => {
        if (active && r.ok) setCodes(r.data.codes);
      });
    return () => {
      active = false;
    };
  }, [variantId]);

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <span className="text-xs font-semibold text-muted-foreground">Códigos por canal (cProd)</span>
      {codes.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Nenhum código.</p>}
      <ul className="mt-1 space-y-1">
        {codes.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-xs">
            <span>
              {c.code} · {c.channel ?? "geral"}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const f = new FormData();
                f.set("variantId", String(variantId));
                f.set("id", String(c.id));
                startTransition(async () => {
                  const r = await removeProductCode(f);
                  if (r.ok) setCodes(await getCodes(variantId));
                  else setMessage(r.error);
                });
              }}
              className="text-red-600"
            >
              remover
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("variantId", String(variantId));
          startTransition(async () => {
            const r = await addProductCode(fd);
            if (r.ok) setCodes(await getCodes(variantId));
            else setMessage(r.error);
          });
          (e.currentTarget.elements.namedItem("code") as HTMLInputElement).value = "";
        }}
      >
        <input
          name="code"
          placeholder="código"
          required
          maxLength={60}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        />
        <select name="channel" className="rounded-md border bg-background px-2 py-1 text-sm">
          <option value="geral">geral</option>
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
        >
          adicionar
        </button>
      </form>
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </div>
  );
}

async function getCodes(variantId: number) {
  const f = new FormData();
  f.set("variantId", String(variantId));
  const r = await import("@/app/actions/catalog").then((m) => m.getProductCodes(f));
  return r.ok ? r.data.codes : [];
}

function toBRLInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function centsOf(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(".", "")
    .replace(",", ".");
  const value = Math.round(Number(cleaned) * 100);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
