"use client";

import {
  createMaterial,
  createPrinter,
  deleteMaterial,
  deletePrinter,
  getMaterials,
  getPrinters,
  setGlobalParams,
  updateMaterial,
  updatePrinter,
} from "@/app/actions/catalog";
import type { MaterialRow, PrinterRow } from "@/lib/catalog/service";
import { formatBRL } from "@/lib/domain/money";
import { useEffect, useState, useTransition } from "react";

/**
 * US4 — Parâmetros globais do motor de custo (energia, horas/semana, mão de
 * obra), materiais de filamento e impressoras de referência (mais cara = R$/hora).
 */

export default function PricingSettingsPanel({
  initialMaterials,
  initialPrinters,
}: {
  initialMaterials: MaterialRow[];
  initialPrinters: PrinterRow[];
}) {
  const [materials, setMaterials] = useState<MaterialRow[]>(initialMaterials);
  const [printers, setPrinters] = useState<PrinterRow[]>(initialPrinters);
  const [kwh, setKwh] = useState("");
  const [hours, setHours] = useState("");
  const [labor, setLabor] = useState("");
  const [matName, setMatName] = useState("");
  const [matPrice, setMatPrice] = useState("");
  const [prName, setPrName] = useState("");
  const [prAcq, setPrAcq] = useState("");
  const [prLife, setPrLife] = useState("");
  const [prWatts, setPrWatts] = useState("");
  const [prMaint, setPrMaint] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editMat, setEditMat] = useState<MaterialRow | null>(null);
  const [editPrinter, setEditPrinter] = useState<PrinterRow | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getMaterials(), getPrinters()]).then(([m, p]) => {
      if (!active) return;
      if (m.ok) setMaterials(m.data.materials);
      if (p.ok) setPrinters(p.data.printers);
    });
    return () => {
      active = false;
    };
  }, []);

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

  const addMaterial = () => {
    const form = new FormData();
    form.set("name", matName);
    form.set("pricePerKgCents", String(centsOf(matPrice)));
    startTransition(async () => {
      const r = await createMaterial(form);
      if (r.ok) setMaterials(r.data.materials);
      else setMessage(r.error);
      setMatName("");
      setMatPrice("");
    });
  };

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
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Precificação — parâmetros globais e impressoras</h2>
        <p className="text-xs text-muted-foreground">
          Energia, mão de obra e impressoras alimentam o custo por hora global (usa-se a impressora mais cara).
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3">
        {/* Parâmetros globais */}
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
        </div>

        {/* Materiais */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Materiais de filamento (R$/kg)</h3>
          <ul className="space-y-1">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                {editMat?.id === m.id ? (
                  <form
                    className="flex flex-1 items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData();
                      fd.set("id", String(m.id));
                      fd.set("name", editMat.name);
                      fd.set("pricePerKgCents", String(editMat.pricePerKgCents));
                      startTransition(async () => {
                        const r = await updateMaterial(fd);
                        if (r.ok) {
                          setMaterials(r.data.materials);
                          setEditMat(null);
                        } else {
                          setMessage(r.error);
                        }
                      });
                    }}
                  >
                    <input
                      value={editMat.name}
                      onChange={(e) => setEditMat({ ...editMat, name: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                    />
                    <input
                      value={toBRL(editMat.pricePerKgCents)}
                      onChange={(e) => setEditMat({ ...editMat, pricePerKgCents: centsOf(e.target.value) })}
                      inputMode="decimal"
                      className="w-20 rounded-md border bg-background px-2 py-1 text-xs"
                    />
                    <button type="submit" className="rounded-md border px-2 py-1 text-xs">
                      salvar
                    </button>
                  </form>
                ) : (
                  <>
                    <span>
                      {m.name} · {formatBRL(m.pricePerKgCents)}/kg
                    </span>
                    <span className="flex gap-1">
                      <button type="button" onClick={() => setEditMat(m)} className="text-muted-foreground">
                        editar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            const r = await deleteMaterial(formId(m.id));
                            if (r.ok) setMaterials(r.data.materials);
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
          <div className="flex items-center gap-1">
            <input
              value={matName}
              onChange={(e) => setMatName(e.target.value)}
              placeholder="PLA Preto"
              className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
            />
            <input
              value={matPrice}
              onChange={(e) => setMatPrice(e.target.value)}
              placeholder="R$/kg"
              inputMode="decimal"
              className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={addMaterial}
              disabled={pending || !matName.trim()}
              className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
            >
              + material
            </button>
          </div>
        </div>

        {/* Impressoras */}
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
                        onChange={(e) =>
                          setEditPrinter({ ...editPrinter, usefulLifeYears: Number(e.target.value) || 0 })
                        }
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
        </div>
      </div>

      {message && <p className="border-t px-4 py-2 text-xs text-red-600">{message}</p>}
    </section>
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
