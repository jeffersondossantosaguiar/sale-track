"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SETTINGS_NAV, TOP_NAV } from "./nav";

type NavigationItemProps = {
  href: string;
  label: string;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
};

function NavigationItem({ href, label, active, compact = false, onNavigate }: NavigationItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-md px-3 hover:bg-muted hover:text-foreground ${
        compact ? "py-1.5" : "py-2"
      } ${active ? "bg-muted font-medium text-foreground" : ""}`}
    >
      {label}
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
    <nav className="flex h-full flex-col gap-1 text-sm text-muted-foreground">
      <Link href="/" onClick={onNavigate} className="mb-2 px-3 text-sm font-semibold text-foreground">
        sale-track <span className="font-normal text-muted-foreground">· MEI</span>
      </Link>
      {TOP_NAV.map((item) => (
        <NavigationItem
          key={item.href}
          href={item.href}
          label={item.label}
          active={isActive(item.href)}
          onNavigate={onNavigate}
        />
      ))}

      <button
        type="button"
        onClick={() => setSettingsOpen((v) => !v)}
        className={`flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted hover:text-foreground ${
          inSettings ? "bg-muted font-medium text-foreground" : ""
        }`}
        aria-expanded={settingsOpen}
      >
        Configurações
        <span className="text-xs text-muted-foreground">{settingsOpen ? "▾" : "▸"}</span>
      </button>

      {settingsOpen && (
        <div className="ml-3 flex flex-col gap-1 border-l pl-2">
          {SETTINGS_NAV.map((item) => (
            <NavigationItem
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(item.href)}
              compact
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
