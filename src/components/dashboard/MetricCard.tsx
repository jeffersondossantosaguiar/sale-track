import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  secondary?: string;
};

export default function MetricCard({ icon: Icon, iconClassName, label, value, secondary }: MetricCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
      {secondary && <p className="mt-3 text-xs text-muted-foreground">{secondary}</p>}
    </div>
  );
}
