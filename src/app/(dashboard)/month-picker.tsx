"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * T042 — troca do mês em exibição no dashboard (GSI/ano-anterior e volta).
 * Navega para `/?m=YYYY-MM`; o servidor recalcula o bloco (traça ao banco).
 */

export default function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(value);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (draft) router.push(`/?m=${draft}`);
      }}
      className="flex items-center gap-2 text-sm"
    >
      <label className="sr-only" htmlFor="dashboard-month">
        Mês exibido
      </label>
      <input
        id="dashboard-month"
        type="month"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 rounded-full border bg-card px-4 text-sm shadow-sm"
      />
      <button
        type="submit"
        className="h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ver
      </button>
    </form>
  );
}
