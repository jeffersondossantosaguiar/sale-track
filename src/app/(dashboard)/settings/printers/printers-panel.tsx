"use client";

import { createPrinter, deletePrinter, updatePrinter } from "@/app/actions/catalog";
import type { PrinterRow } from "@/lib/catalog/service";
import { formatBRL } from "@/lib/domain/money";
import { useState, useTransition } from "react";

/**
 * FR-008 — Impressoras de referência (aquisição, vida útil, consumo, manutenção).
 * O custo/hora global é derivado da impressora mais cara. Extraído do antigo
 * pricing-settings-panel em Produtos.
 */

export default function PrintersPanel({ initialPrinters }: { initialPrinters: PrinterRow[] }) {
  const [printers, setPrinters] = useState<PrinterRow[]>(initialPrinters);
  const [prName, setPrName] = useState("");
  const [prAcq, setPrAcq] = useState("");
  const [prLife, setPrLife] = useState("");
  const [prWatts, setPrWatts] = useState("");
  const [prMaint, setPrMaint] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editPrinter, setEditPrinter] = useState<PrinterRow | null>(null);

  const addPrinter = () => {
    const form = new FormData();
    form.set("name", prName);
    form.set("acquisitionCents", String(centsOf(prAcq)));
    form.set("usefulLifeYears", prLife);
    form.set("powerWatts", prWatts);
    form.set("maintenanceCentsPerHour", String(centsOf(prMaint)));
    startTransition(async () => {
      const r = await createPrinter(form);
      if (r.ok) setPrinters(r.data.printers);
      else setMessage(r.error);
      setPrName("");
      setPrAcq("");
      setPrLife("");
      setPrWatts("");
      setPrMaint("");
    });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">Impressoras</h3>
      <ul className="space-y-1">
        {printers.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
            {editPrinter?.id === p.id ? (
              <form
                className="flex flex-1 flex-col gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.set("id", String(p.id));
                  fd.set("name", editPrinter.name);
                  fd.set("acquisitionCents", String(editPrinter.acquisitionCents));
                  fd.set("usefulLifeYears", String(editPrinter.usefulLifeYears));
                  fd.set("powerWatts", String(editPrinter.powerWatts));
                  fd.set("maintenanceCentsPerHour", String(editPrinter.maintenanceCentsPerHour));
                  startTransition(async () => {
                    const r = await updatePrinter(fd);
                    if (r.ok) {
                      setPrinters(r.data.printers);
                      setEditPrinter(null);
                    } else {
                      setMessage(r.error);
                    }
                  });
                }}
              >
                <div className="flex items-center gap-1">
                  <input
                    value={editPrinter.name}
                    onChange={(e) => setEditPrinter({ ...editPrinter, name: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                  />
                  <button type="submit" className="rounded-md border px-2 py-1 text-xs">
                    salvar
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <input
                    value={toBRL(editPrinter.acquisitionCents)}
                    onChange={(e) => setEditPrinter({ ...editPrinter, acquisitionCents: centsOf(e.target.value) })}
                    inputMode="decimal"
                    title="Aquisição (R$)"
                    className="rounded-md border bg-background px-1 py-0.5 text-xs"
                  />
                  <input
                    value={String(editPrinter.usefulLifeYears)}
                    onChange={(e) => setEditPrinter({ ...editPrinter, usefulLifeYears: Number(e.target.value) || 0 })}
                    inputMode="numeric"
                    title="Vida (anos)"
                    className="rounded-md border bg-background px-1 py-0.5 text-xs"
                  />
                  <input
                    value={String(editPrinter.powerWatts)}
                    onChange={(e) => setEditPrinter({ ...editPrinter, powerWatts: Number(e.target.value) || 0 })}
                    inputMode="numeric"
                    title="Consumo (W)"
                    className="rounded-md border bg-background px-1 py-0.5 text-xs"
                  />
                  <input
                    value={toBRL(editPrinter.maintenanceCentsPerHour)}
                    onChange={(e) =>
                      setEditPrinter({ ...editPrinter, maintenanceCentsPerHour: centsOf(e.target.value) })
                    }
                    inputMode="decimal"
                    title="Manut. (R$/h)"
                    className="rounded-md border bg-background px-1 py-0.5 text-xs"
                  />
                </div>
              </form>
            ) : (
              <>
                <span>
                  {p.name} · {formatBRL(p.acquisitionCents)} · {p.powerWatts}W
                </span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => setEditPrinter(p)} className="text-muted-foreground">
                    editar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await deletePrinter(formId(p.id));
                        if (r.ok) setPrinters(r.data.printers);
                      })
                    }
                    className="text-red-600"
                  >
                    remover
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="space-y-1">
        <input
          value={prName}
          onChange={(e) => setPrName(e.target.value)}
          placeholder="Modelo"
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
        <div className="grid grid-cols-2 gap-1">
          <input
            value={prAcq}
            onChange={(e) => setPrAcq(e.target.value)}
            placeholder="Aquisição (R$)"
            inputMode="decimal"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <input
            value={prLife}
            onChange={(e) => setPrLife(e.target.value)}
            placeholder="Vida (anos)"
            inputMode="numeric"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <input
            value={prWatts}
            onChange={(e) => setPrWatts(e.target.value)}
            placeholder="Consumo (W)"
            inputMode="numeric"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <input
            value={prMaint}
            onChange={(e) => setPrMaint(e.target.value)}
            placeholder="Manut. (R$/h)"
            inputMode="decimal"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addPrinter}
          disabled={pending || !prName.trim()}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
        >
          + impressora
        </button>
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}

function formId(id: number): FormData {
  const form = new FormData();
  form.set("id", String(id));
  return form;
}

function toBRL(cents: number): string {
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
