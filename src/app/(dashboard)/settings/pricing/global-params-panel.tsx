"use client";

import { setGlobalParams } from "@/app/actions/catalog";
import { useState, useTransition } from "react";

/**
 * FR-007 — Parâmetros globais do motor de custo (energia, horas/semana, mão de
 * obra). Extraído do antigo pricing-settings-panel em Produtos.
 */

export default function GlobalParamsPanel() {
  const [kwh, setKwh] = useState("");
  const [hours, setHours] = useState("");
  const [labor, setLabor] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitParams = () => {
    const form = new FormData();
    if (kwh !== "") form.set("kwhRateCents", String(centsOf(kwh)));
    if (hours !== "") form.set("hoursPerWeek", String(Number(hours)));
    if (labor !== "") form.set("laborCostPerHourCents", String(centsOf(labor)));
    startTransition(async () => {
      const r = await setGlobalParams(form);
      if (r.ok) setMessage("Parâmetros globais salvos.");
      else setMessage(r.error);
    });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">Parâmetros globais</h3>
      <label className="block">
        <span className="text-xs text-muted-foreground">Tarifa de energia (R$/kWh)</span>
        <input
          value={kwh}
          onChange={(e) => setKwh(e.target.value)}
          inputMode="decimal"
          placeholder="0,90"
          className="mt-0.5 w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs text-muted-foreground">Horas de uso por semana</span>
        <input
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          inputMode="numeric"
          placeholder="72"
          className="mt-0.5 w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs text-muted-foreground">Mão de obra (R$/hora)</span>
        <input
          value={labor}
          onChange={(e) => setLabor(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          className="mt-0.5 w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={submitParams}
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Salvar
      </button>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
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
