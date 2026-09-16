"use client";

import { createCategory, deleteCategory, renameCategory } from "@/app/actions/catalog";
import type { CategoryRow } from "@/lib/catalog/service";
import { useState, useTransition } from "react";

/**
 * T027 — Gestão de categorias (US2). Ações retornam a lista atualizada
 * (fonte de verdade = servidor); renomear/remover são explícitos.
 */

export default function CategoriesPanel({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const apply = (result: { ok: true; data: { categories: CategoryRow[] } } | { ok: false; error: string }) => {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setCategories(result.data.categories);
  };

  const run = (fn: () => Promise<Parameters<typeof apply>[0]>) => {
    startTransition(async () => apply(await fn()));
  };

  const submitCreate = () => {
    if (!name.trim()) return;
    const form = new FormData();
    form.set("name", name);
    run(() => createCategory(form));
    setName("");
    setAdding(false);
  };

  const submitRename = (id: number) => {
    if (!editingName.trim()) return;
    const form = new FormData();
    form.set("id", String(id));
    form.set("name", editingName);
    run(() => renameCategory(form));
    setEditingId(null);
  };

  const submitDelete = (id: number, nameToDelete: string) => {
    if (!window.confirm(`Remover a categoria "${nameToDelete}"?`)) return;
    const form = new FormData();
    form.set("id", String(id));
    run(() => deleteCategory(form));
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Categorias</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          disabled={pending}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
        >
          {adding ? "Cancelar" : "+ Nova categoria"}
        </button>
      </div>

      {adding && (
        <form
          className="flex items-center gap-2 border-b px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitCreate();
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome da categoria"
            maxLength={40}
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
      )}

      {categories.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-4 px-4 py-2">
              {editingId === category.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitRename(category.id);
                  }}
                >
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    maxLength={40}
                    className="flex-1 rounded-md border bg-background px-3 py-1 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border px-3 py-1 text-xs text-muted-foreground"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <span>
                    {category.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {category.productCount} produto{category.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                      className="rounded-md border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50"
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      disabled={pending || category.productCount > 0}
                      onClick={() => submitDelete(category.id, category.name)}
                      title={
                        category.productCount > 0 ? "Remova primeiro os produtos da categoria" : "Remover categoria"
                      }
                      className="rounded-md border px-2 py-1 text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="border-t px-4 py-2 text-xs text-red-600">{message}</p>}
    </section>
  );
}
