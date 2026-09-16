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
      <input
        type="month"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="rounded-md border bg-background px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        Ver
      </button>
    </form>
  );
}
