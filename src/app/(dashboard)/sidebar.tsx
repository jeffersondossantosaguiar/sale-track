"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SETTINGS_NAV, TOP_NAV } from "./nav";

/**
 * FR-001 a FR-004 — Menu lateral substituindo a barra de navegação superior.
 * Accordion expansível em "Configurações", item ativo destacado via usePathname
 * e auto-abertura do accordion quando a rota é /settings/*. Em telas pequenas
 * vira um drawer (overlay) acionado por um botão hambúrguer.
 */

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inSettings = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(inSettings);

  const handleOpenChange = (next: boolean) => setOpen(next);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav className="flex h-full flex-col gap-1 text-sm text-muted-foreground">
      <Link
        href="/"
        onClick={() => handleOpenChange(false)}
        className="mb-2 px-3 text-sm font-semibold text-foreground"
      >
        sale-track <span className="font-normal text-muted-foreground">· MEI</span>
      </Link>
      {TOP_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => handleOpenChange(false)}
          className={`rounded-md px-3 py-2 hover:bg-muted hover:text-foreground ${
            isActive(item.href) ? "bg-muted font-medium text-foreground" : ""
          }`}
        >
          {item.label}
        </Link>
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
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleOpenChange(false)}
              className={`rounded-md px-3 py-1.5 hover:bg-muted hover:text-foreground ${
                isActive(item.href) ? "bg-muted font-medium text-foreground" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Sidebar fixa no desktop */}
      <aside className="hidden w-56 shrink-0 border-r bg-card/80 p-4 lg:block">{nav}</aside>

      {/* Drawer no mobile */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"
          aria-label="Abrir menu"
        >
          ☰ Menu
        </button>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => handleOpenChange(false)}
            />
            <div className="absolute left-0 top-0 h-full w-64 bg-card p-4 shadow-lg">{nav}</div>
          </div>
        )}
      </div>
    </>
  );
}
