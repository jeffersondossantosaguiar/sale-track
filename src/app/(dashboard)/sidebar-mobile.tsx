"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import SidebarNavigation from "./sidebar-navigation";

export default function SidebarMobile() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" aria-hidden />
        Menu
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-card shadow-lg">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <SidebarNavigation onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
