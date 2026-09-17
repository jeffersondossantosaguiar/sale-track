import { formatBRL } from "@/lib/domain/money";
import { ArrowRightLeft, ShieldAlert } from "lucide-react";

type MeiLimitCardProps = {
  usedCents: number;
  limitCents: number;
  usedPct: number;
  over: boolean;
};

export default function MeiLimitCard({ usedCents, limitCents, usedPct, over }: MeiLimitCardProps) {
  const remainingCents = Math.max(0, limitCents - usedCents);

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span
              className={`flex size-8 items-center justify-center rounded-lg ${
                over ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
              }`}
            >
              {over ? (
                <ShieldAlert className="size-4" aria-hidden="true" />
              ) : (
                <ArrowRightLeft className="size-4" aria-hidden="true" />
              )}
            </span>
            Teto anual MEI
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatBRL(usedCents)}{" "}
            <span className="text-base font-normal text-muted-foreground">de {formatBRL(limitCents)}</span>
          </p>
        </div>
        <p className={`text-3xl font-bold tracking-tight ${over ? "text-red-600" : "text-primary"}`}>
          {usedPct.toFixed(1)}%
        </p>
      </div>

      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
        aria-label="Progresso do teto anual MEI"
      >
        <div
          className={`h-full rounded-full transition-colors ${over ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>

      {over ? (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <ShieldAlert className="size-4" aria-hidden="true" />
          Ultrapassou o teto!
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">R$ restante: {formatBRL(remainingCents)}</p>
      )}
    </section>
  );
}
