"use client";

import { applyCurrentCost, linkUnlinked } from "@/app/actions/catalog";
import type { FlatVariantRow, UnlinkedGroup } from "@/lib/catalog/service";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { CHANNEL_LABELS, type Channel } from "@/lib/xml/channel";
import { useState, useTransition } from "react";

/**
 * T031 — fila de "códigos sem vínculo": itens importados sem variante.
 * Vincular manualmente APRENDE o código (próximas importações casam sozinhas) e
 * faz backfill de variant_id; custo congelado só entra com ação explícita.
 */

export default function UnlinkedPanel({
  initialGroups,
  variants,
}: {
  initialGroups: UnlinkedGroup[];
  variants: FlatVariantRow[];
}) {
  const [groups, setGroups] = useState<UnlinkedGroup[]>(initialGroups);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (
    result: { ok: true; data: { groups: UnlinkedGroup[]; updated?: number } } | { ok: false; error: string },
    successText?: (updated: number) => string,
  ) => {
    if (!result.ok) {
      setMessage(result.error);
      setInfo(null);
      return;
    }
    setMessage(null);
    setGroups(result.data.groups);
    if (successText && result.data.updated !== undefined) setInfo(successText(result.data.updated));
  };

  const key = (group: UnlinkedGroup) => `${group.cProd}::${group.channel}`;

  const submitLink = (group: UnlinkedGroup) => {
    const variantId = picks[key(group)];
    if (!variantId) {
      setMessage("Escolha uma variante para vincular.");
      return;
    }
    const form = new FormData();
    form.set("variantId", variantId);
    form.set("cProd", group.cProd);
    form.set("channel", group.channel);
    startTransition(async () => {
      const result = await linkUnlinked(form);
      if (result.ok) {
        setInfo(`Vínculo aprendido — ${result.data.groups.length} grupo(s) pendentes.`);
      } else {
        apply(result);
      }
    });
  };

  const submitApplyCost = () => {
    startTransition(async () => {
      const result = await applyCurrentCost();
      apply(result, (updated) =>
        updated === 0
          ? "Nenhum item sem custo pendente."
          : `${updated} ${updated === 1 ? "item" : "itens"} receberam o custo atual (margens recalculadas).`,
      );
    });
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Fila de códigos sem vínculo</h2>
          <p className="text-xs text-muted-foreground">
            Itens importados ainda sem produto. Ao vincular, o código é aprendido e as próximas importações casam
            automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={submitApplyCost}
          disabled={pending}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
        >
          Aplicar custo atual aos itens sem custo
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Fila vazia — todos os itens importados já têm vínculo de produto.
        </p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {groups.map((group) => (
            <li key={key(group)} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <div className="min-w-36">
                <span className="font-mono text-xs">{group.cProd}</span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {CHANNEL_LABELS[group.channel as Channel] ?? group.channel}
                </span>
              </div>
              <p className="line-clamp-1 flex-1 text-muted-foreground">
                {group.description} · {group.count} {group.count === 1 ? "item" : "itens"} ·{" "}
                {formatBRL(group.totalCents)}
              </p>
              <select
                value={picks[key(group)] ?? ""}
                onChange={(event) => setPicks((prev) => ({ ...prev, [key(group)]: event.target.value }))}
                disabled={pending}
                className="w-72 rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">— vincular a variante —</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.productName} / {variant.name} ({variant.sku})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => submitLink(group)}
                disabled={pending || !picks[key(group)]}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Vincular
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="border-t px-4 py-2 text-xs text-red-600">{message}</p>}
      {info && !message && <p className={cn("border-t px-4 py-2 text-xs")}>{info}</p>}
    </section>
  );
}
