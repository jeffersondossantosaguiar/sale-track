"use client";

import { addProductCode, getProductCodes, removeProductCode } from "@/app/actions/catalog";
import type { ProductCodeRow, ProductRow } from "@/lib/catalog/service";
import { CHANNEL_LABELS, type Channel } from "@/lib/xml/channel";
import { useEffect, useState, useTransition } from "react";

/**
 * T029 — gestão de códigos (product_codes) por produto: multi-código por canal.
 * Canal "geral" (null) vale para qualquer canal; específico casa só aquele canal.
 * Toda mutação devolve as listas atualizadas (servidor = fonte de verdade).
 */

const CHANNEL_OPTIONS = [
  { value: "geral", label: "Geral (todos)" },
  { value: "shopee", label: "Shopee" },
  { value: "tiktok", label: "TikTok" },
] as const;

function channelLabel(channel: string | null): string {
  if (channel === null) return "Geral";
  return CHANNEL_LABELS[channel as Channel] ?? channel;
}

export default function CodesPanel({
  product,
  onClose,
  onProducts,
}: {
  product: ProductRow;
  onClose: () => void;
  onProducts: (products: ProductRow[]) => void;
}) {
  const [codes, setCodes] = useState<ProductCodeRow[] | null>(null);
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<string>("geral");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const form = new FormData();
    form.set("productId", String(product.id));
    startTransition(async () => {
      const result = await getProductCodes(form);
      if (!result.ok) {
        setMessage(result.error);
        setCodes([]);
        return;
      }
      setCodes(result.data.codes);
    });
  }, [product.id]);

  const apply = (
    result: { ok: true; data: { codes: ProductCodeRow[]; products: ProductRow[] } } | { ok: false; error: string },
  ) => {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setCodes(result.data.codes);
    onProducts(result.data.products);
  };

  const add = () => {
    if (!code.trim()) return;
    const form = new FormData();
    form.set("productId", String(product.id));
    form.set("code", code);
    form.set("channel", channel);
    startTransition(async () => {
      apply(await addProductCode(form));
      setCode("");
    });
  };

  const remove = (row: ProductCodeRow) => {
    if (!window.confirm(`Remover o código "${row.code}"?`)) return;
    const form = new FormData();
    form.set("id", String(row.id));
    form.set("productId", String(product.id));
    startTransition(async () => apply(await removeProductCode(form)));
  };

  return (
    <div className="space-y-3 border-b bg-muted/30 px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Códigos de “{product.name}”</h3>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground underline">
          fechar
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs text-muted-foreground">Código (cProd)</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={60}
            placeholder="ex.: P001 ou 1783889877430"
            className="mt-1 w-64 rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Canal</span>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="mt-1 w-40 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={pending || !code.trim()}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>

      {codes === null ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : codes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum código — adicione o código que aparece no XML deste produto.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border bg-background text-sm">
          {codes.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-3 py-1.5">
              <span className="font-mono text-xs">{row.code}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{channelLabel(row.channel)}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(row)}
                  className="text-xs text-red-600 disabled:opacity-50"
                >
                  remover
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
