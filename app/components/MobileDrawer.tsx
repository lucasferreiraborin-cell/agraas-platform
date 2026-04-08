"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "./SidebarNav";
import { Menu, X } from "lucide-react";

export default function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-soft)]"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[320px] transform bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] text-white transition-transform duration-300 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Plataforma</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-white">Agraas</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white/70 transition hover:bg-white/15"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 72px)" }}>
          <SidebarNav />
        </div>
      </div>
    </>
  );
}
