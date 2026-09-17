"use client";

import { CalendarDays } from "lucide-react";
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
      className="inline-flex items-center gap-2 rounded-full border bg-card py-1.5 pl-3 pr-1.5 shadow-sm focus-within:ring-1 focus-within:ring-primary"
    >
      <label className="sr-only" htmlFor="dashboard-month">
        Mês exibido
      </label>
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        id="dashboard-month"
        type="month"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="bg-transparent text-sm text-foreground outline-none [&::-webkit-calendar-picker-indicator]:opacity-60"
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ver
      </button>
    </form>
  );
}
