"use client";

import { type PresentialState, createPresentialSaleFrom } from "@/app/actions/sales-presential";
import type { ProductRow } from "@/lib/catalog/service";
import { formatBRL, parseBrlToCents } from "@/lib/domain/money";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

/**
 * T038 — Venda presencial (US4): lança venda à mão (catálogo rápido + busca),
 * valor recebido pré-sugerido pela soma dos itens e sempre editável. A taxa
 * padrão do canal NASCE na venda importada; presencial não tem taxa (T040).
 * A lista de vendas e as taxas vivem no TaxesPanel (T041).
 */

type Line = { id: number; productId: string; quantity: string };

let lineSeq = 0;
const blankLine = (): Line => ({ id: ++lineSeq, productId: "", quantity: "1" });

export default function PresentialPanel({
  initialMonthTotal,
  initialMonth,
  products,
}: {
  initialMonthTotal: number;
  initialMonth: { year: number; month: number };
  products: ProductRow[];
}) {
  const router = useRouter();
  const [monthTotal, setMonthTotal] = useState(initialMonthTotal);
  const [month] = useState(initialMonth);
  const [date, setDate] = useState(todayIso());
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [manualAmount, setManualAmount] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeProducts = useMemo(() => products.filter((product) => product.active), [products]);

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return activeProducts;
    return activeProducts.filter((product) => product.name.toLowerCase().includes(needle));
  }, [activeProducts, search]);

  const lineProducts = lines.map((line) => activeProducts.find((product) => product.id === Number(line.productId)));

  const computedCents = lines.reduce((sum, line, index) => {
    const product = lineProducts[index];
    if (!product) return sum;
    return sum + product.salePriceCents * (Number(line.quantity) || 0);
  }, 0);

  const amountCents = useMemo(() => {
    try {
      return manualAmount && amount ? parseBrlToCents(amount) : computedCents;
    } catch {
      return computedCents;
    }
  }, [manualAmount, amount, computedCents]);

  const setLine = (index: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    setMessage(null);
  };

  const addLine = () => {
    setLines((prev) => [...prev, blankLine()]);
    setManualAmount(false);
  };

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length === 1 ? [blankLine()] : prev.filter((_, i) => i !== index)));
    setManualAmount(false);
  };

  const apply = (result: { ok: true; data: PresentialState } | { ok: false; error: string }) => {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setMonthTotal(result.data.monthTotal);
    setLines([blankLine()]);
    setAmount("");
    setManualAmount(false);
    setSearch("");
    // re-render dos painéis irmãos (taxas/lista) com os dados recém-criados
    router.refresh();
  };

  const submit = () => {
    if (amountCents <= 0) {
      setMessage("Selecione produtos e informe um valor.");
      return;
    }
    if (lines.some((line) => line.productId === "")) {
      setMessage("Todas as linhas precisam de um produto.");
      return;
    }
    const form = new FormData();
    form.set("date", date);
    form.set("receivedCents", String(amountCents));
    for (const line of lines) form.append("productId", line.productId);
    for (const line of lines) form.append("quantity", line.quantity);
    startTransition(async () => apply(await createPresentialSaleFrom(form)));
  };

  const monthLabel = `${String(month.month).padStart(2, "0")}/${month.year}`;

  return (
    <section className="space-y-2">
      <div className="rounded-lg border bg-card px-4 py-3">
        <p className="text-xs uppercase text-muted-foreground">Faturamento {monthLabel}</p>
        <p className="mt-1 text-lg font-semibold">{formatBRL(monthTotal)}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Data da venda</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block min-w-48 flex-1">
            <span className="text-xs text-muted-foreground">Buscar produto (catálogo rápido)</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ex.: Eiffel, chaveiro…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <div className="flex-1 rounded-md border bg-background p-px">
            {lines.map((line, index) => {
              const product = lineProducts[index];
              return (
                <div key={line.id} className="flex items-stretch gap-1 p-1">
                  <select
                    value={line.productId}
                    onChange={(event) => setLine(index, { productId: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="">— escolher produto —</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {formatBRL(product.salePriceCents)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => setLine(index, { quantity: event.target.value })}
                    className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={pending}
                    className="rounded-md border px-2 text-xs text-muted-foreground disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">Valor recebido (R$)</span>
            <input
              value={manualAmount ? amount : toBRLInput(computedCents)}
              onChange={(event) => {
                setManualAmount(true);
                setAmount(event.target.value);
              }}
              onFocus={() => {
                if (!manualAmount) {
                  setManualAmount(true);
                  setAmount(toBRLInput(computedCents));
                }
              }}
              inputMode="decimal"
              placeholder="0,00"
              className="mt-1 w-40 rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <span className="pb-1 text-xs text-muted-foreground">
            {manualAmount ? "valor informado" : "soma dos itens (edite para desconto)"}
          </span>
          <button
            type="button"
            onClick={addLine}
            disabled={pending}
            className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground disabled:opacity-50"
          >
            + Item
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !lineProducts.some(Boolean)}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Registrar venda
          </button>
          {message && <p className="text-xs text-red-600">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function toBRLInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function todayIso(): string {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
