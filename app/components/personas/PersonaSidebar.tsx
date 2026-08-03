"use client";

/**
 * PersonaSidebar — chrome responsivo da sidebar dos shells de persona.
 *
 * Desktop (lg+): sidebar estática de 288px, como antes.
 * Mobile (<lg): a sidebar de 288px cobria quase toda a viewport e espremia
 * o conteúdo numa coluna ilegível. Agora ela vira um drawer off-canvas
 * acionado por um top bar com hambúrguer; o conteúdo ocupa a largura toda.
 *
 * O logout (PersonaLogoutButton) e o rodapé (topLabel) ficam fixos no fim
 * da sidebar. O drawer fecha ao trocar de rota e ao tocar no backdrop.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { PersonaTheme } from "@/lib/persona-themes";
import PersonaLogoutButton from "@/app/components/personas/PersonaLogoutButton";

export default function PersonaSidebar({
  theme,
  clientName,
  children,
}: {
  theme: PersonaTheme;
  clientName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao navegar (a state do client component sobrevive à
  // navegação soft, então sem isso ele ficaria aberto sobre a nova página).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Top bar mobile — some no desktop */}
      <div
        className="fixed inset-x-0 top-0 z-[72] flex h-14 items-center justify-between border-b border-white/10 px-4 lg:hidden"
        style={{ backgroundColor: theme.sidebarBg }}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold text-white">
            {theme.shortLabel}
          </span>
          <span className="truncate text-xs text-white/50">{clientName}</span>
        </div>
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="text-white/80 transition hover:text-white"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-[73] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: drawer off-canvas no mobile, estática no desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-[74] flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-white/8 transition-transform duration-300 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: theme.sidebarBg }}
      >
        <div className="flex items-start justify-between border-b border-white/8 px-6 py-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
              Agraas
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {theme.shortLabel}
            </div>
            <div className="mt-0.5 text-xs text-white/60">{clientName}</div>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="text-white/60 transition hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {children}

        <div className="space-y-2 border-t border-white/8 px-4 py-3">
          <PersonaLogoutButton />
          <div className="px-3 text-[10px] uppercase tracking-wider text-white/40">
            {theme.topLabel}
          </div>
        </div>
      </aside>
    </>
  );
}
