"use client";

import { ChevronDown, ChevronRight, type LucideIcon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SETTINGS_NAV, TOP_NAV } from "./nav";

type NavigationItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
};

function NavigationItem({ href, label, icon: Icon, active, compact = false, onNavigate }: NavigationItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-md px-3 transition-colors hover:bg-muted hover:text-foreground ${
        compact ? "py-1.5" : "py-2"
      } ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

type SidebarNavigationProps = {
  onNavigate?: () => void;
};

export default function SidebarNavigation({ onNavigate }: SidebarNavigationProps) {
  const pathname = usePathname();
  const inSettings = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(inSettings);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="flex h-full flex-col p-3 text-sm">
      <Link href="/" onClick={onNavigate} className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-sm font-bold">s</span>
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-foreground">sale-track</span>
          <span className="block text-xs text-muted-foreground">Controle MEI</span>
        </span>
      </Link>

      <div className="flex-1 space-y-6 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Principal</p>
          {TOP_NAV.map((item) => (
            <NavigationItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground ${
            inSettings ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
          }`}
        >
          <span className="flex items-center gap-3">
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Configurações</span>
          </span>
          {settingsOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>

        {settingsOpen && (
          <div className="ml-3 flex flex-col gap-1 border-l border-border pl-2">
            {SETTINGS_NAV.map((item) => (
              <NavigationItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                compact
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-2 pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">sale-track</span>
        <span className="mx-1">·</span>
        <span>v0.1.0</span>
      </div>
    </nav>
  );
}
