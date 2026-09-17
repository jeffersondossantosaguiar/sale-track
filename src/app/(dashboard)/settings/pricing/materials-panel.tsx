"use client";

import { createMaterial, deleteMaterial, updateMaterial } from "@/app/actions/catalog";
import type { MaterialRow } from "@/lib/catalog/service";
import { formatBRL } from "@/lib/domain/money";
import { useState, useTransition } from "react";

/**
 * FR-004 — Materiais de filamento (R$/kg). Extraído do antigo
 * pricing-settings-panel em Produtos.
 */

export default function MaterialsPanel({ initialMaterials }: { initialMaterials: MaterialRow[] }) {
  const [materials, setMaterials] = useState<MaterialRow[]>(initialMaterials);
  const [matName, setMatName] = useState("");
  const [matPrice, setMatPrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editMat, setEditMat] = useState<MaterialRow | null>(null);

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

  return (
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
