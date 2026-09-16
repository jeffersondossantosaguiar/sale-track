"use client";

import { type CashState, createCashEntryFrom, reverseCashEntryFrom } from "@/app/actions/cash";
import type { CashEntryRow } from "@/lib/cash/service";
import { CASH_CATEGORY_LABELS, type CashCategory } from "@/lib/domain/cash";
import { signedOf } from "@/lib/domain/cashier";
import { formatBRL, parseBrlToCents } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";

/**
 * T035 — Painel de caixa (US3): cards de resumo + lista de lançamentos com
 * estorno explícito. Entrada de valor em R$ (fronteira) → centavos (domínio).
 */

export default function CashPanel({
  initialEntries,
  initialSummary,
}: {
  initialEntries: CashEntryRow[];
  initialSummary: CashState["summary"];
}) {
  const [entries, setEntries] = useState<CashEntryRow[]>(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<"entrada" | "saida">("saida");
  const [category, setCategory] = useState<CashCategory>("outros");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saleId, setSaleId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (result: { ok: true; data: CashState } | { ok: false; error: string }) => {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setEntries(result.data.entries);
    setSummary(result.data.summary);
  };

  const submitCreate = () => {
    let amountCents: number;
    try {
      amountCents = parseBrlToCents(amount);
      if (amountCents <= 0) throw new Error();
    } catch {
      setMessage("Valor inválido (use R$ ou 12,50).");
      return;
    }
    const form = new FormData();
    form.set("date", date);
    form.set("type", type);
    form.set("category", category);
    form.set("amountCents", String(amountCents));
    form.set("description", description);
    form.set("saleId", saleId);
    startTransition(async () => apply(await createCashEntryFrom(form)));
    setAmount("");
    setDescription("");
    setSaleId("");
  };

  const reverse = (entry: CashEntryRow) => {
    const reversal = window.prompt(
      `Estornar o lançamento ${formatBRL(signedOf(entry.amountCents, entry.type))}?\nDigite a data do estorno (AAAA-MM-DD):`,
      todayIso(),
    );
    if (!reversal) return;
    const form = new FormData();
    form.set("id", String(entry.id));
    form.set("date", reversal);
    startTransition(async () => apply(await reverseCashEntryFrom(form)));
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="grid gap-px border-b bg-border sm:grid-cols-3">
        <div className="bg-card px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Saldo</p>
          <p className={cn("mt-1 text-lg font-semibold", summary.total < 0 && "text-red-600")}>
            {formatBRL(summary.total)}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Entradas</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">{formatBRL(summary.entrada)}</p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Saídas</p>
          <p className="mt-1 text-lg font-semibold text-red-600">{formatBRL(summary.saida)}</p>
        </div>
      </div>

      <div className="border-b px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Data</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Tipo</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as "entrada" | "saida")}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Categoria</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CashCategory)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {Object.entries(CASH_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Valor (R$)</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="12,50"
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted-foreground">Descrição</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={140}
              placeholder="Ex.: Filamento PLA 1kg, mensalidade Shopee…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Id da venda (opcional)</span>
            <input
              value={saleId}
              onChange={(event) => setSaleId(event.target.value)}
              inputMode="numeric"
              placeholder="vínculo nº da nota"
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={submitCreate}
            disabled={pending || !amount}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Lançar
          </button>
          {message && <p className="text-xs text-red-600">{message}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
        {Object.entries(CASH_CATEGORY_LABELS)
          .filter(([value]) => summary.byCategory[value as CashCategory] !== 0)
          .map(([value, label]) => (
            <span key={value}>
              {label}:{" "}
              <strong
                className={cn(summary.byCategory[value as CashCategory] < 0 ? "text-red-600" : "text-foreground")}
              >
                {formatBRL(summary.byCategory[value as CashCategory])}
              </strong>
            </span>
          ))}
        {entries.length === 0 && <span>Nenhum lançamento ainda.</span>}
      </div>

      {entries.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const value = signedOf(entry.amountCents, entry.type);
                const isReversal = entry.reversalOfId !== null;
                const isActive = entry.status === "normal" && !isReversal;
                return (
                  <tr key={entry.id} className={cn(!isActive && "opacity-50")}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {entry.date.toISOString().slice(0, 10)}
                      {isReversal && <span className="ml-1 text-xs">(reversão)</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {CASH_CATEGORY_LABELS[entry.category as CashCategory] ?? entry.category}
                      {entry.saleId !== null && (
                        <span className="ml-1 text-muted-foreground">· venda {entry.saleId}</span>
                      )}
                    </td>
                    <td className="max-w-56 px-4 py-2">
                      <span className="line-clamp-2">{entry.description || "—"}</span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right whitespace-nowrap",
                        value < 0 ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      {entry.status === "estornado" ? formatBRL(0) : formatBRL(value)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {entry.status === "estornado" ? (
                        <span>
                          estornado
                          {entry.reversedAt && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {entry.reversedAt.toISOString().slice(0, 10)}
                            </span>
                          )}
                        </span>
                      ) : isReversal ? (
                        <span className="text-muted-foreground">reversão</span>
                      ) : (
                        <span className="text-emerald-600">ativo</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isActive && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => reverse(entry)}
                          className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                        >
                          Estornar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function todayIso(): string {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
