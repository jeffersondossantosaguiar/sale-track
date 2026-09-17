"use client";

import { importReportAction } from "@/app/actions/reports";
import { useState, useTransition } from "react";

/**
 * 005/US3 — importa o relatório exportado (Shopee: saldo; TikTok: income) para
 * preencher o recebido de cada venda. Ambíguos/sem match ficam na conferência manual.
 */
export default function ReportImportForm() {
  const [channel, setChannel] = useState<"shopee" | "tiktok">("shopee");
  const [result, setResult] = useState<
    | { ok: true; data: { channel: string; matched: number; unmatched: { orderId: string; reason: string }[] } }
    | { ok: false; error: string }
    | null
  >(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("channel", channel);
    startTransition(async () => {
      const r = await importReportAction(form);
      setResult(r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error });
    });
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">Importar relatório (recebido)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Suba o relatório exportado (Shopee: relatório de saldo; TikTok: income) para preencher o valor que caiu na
        conta. Matches ambíguos/sem confiança ficam para conferência manual.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value as "shopee" | "tiktok")}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok</option>
        </select>
        <input type="file" name="file" accept=".xlsx,.csv" required className="text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Importando…" : "Importar"}
        </button>
      </form>
      {result && (
        <div className="mt-3 text-xs">
          {result.ok ? (
            <div className="space-y-1">
              <p className="text-green-700">
                {result.data.matched} venda(s) com recebido preenchido ({result.data.channel}).
              </p>
              {result.data.unmatched.length > 0 && (
                <p className="text-muted-foreground">
                  {result.data.unmatched.length} item(ns) sem match de alta confiança — confira manualmente em Vendas:
                </p>
              )}
              {result.data.unmatched.slice(0, 20).map((u) => (
                <p key={u.orderId} className="text-muted-foreground">
                  · {u.orderId} — {u.reason}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </div>
      )}
    </section>
  );
}
