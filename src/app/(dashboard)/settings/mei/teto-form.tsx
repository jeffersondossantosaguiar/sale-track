"use client";

import { setMeiLimitFrom } from "@/app/actions/settings";
import { useTransition } from "react";

/**
 * FR-013 — teto anual MEI configurável (default R$ 81.000,00). Como o limite
 * pode mudar por lei, o dono ajusta aqui; o % usado recalcula de imediato.
 */

export default function TetoForm({ initialCents }: { initialCents: number }) {
  const [pending, startTransition] = useTransition();
  const toBRLInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

  const submit = (formData: FormData) => {
    startTransition(async () => {
      await setMeiLimitFrom(formData);
    });
  };

  return (
    <form action={submit} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground">Teto anual (R$)</span>
      <input
        type="text"
        inputMode="decimal"
        name="value"
        defaultValue={toBRLInput(initialCents)}
        className="w-36 rounded-md border bg-background px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}
