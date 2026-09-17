import type { LucideIcon } from "lucide-react";

export default function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{title}</p>
    </div>
  );
}
