import type { ReactNode } from "react";

type DashboardHeaderProps = {
  monthLabel: string;
  children?: ReactNode;
};

export default function DashboardHeader({ monthLabel, children }: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral do seu negócio — {monthLabel}</p>
      </div>
      {children}
    </header>
  );
}
