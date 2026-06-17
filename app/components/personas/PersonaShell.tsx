/**
 * PersonaShell — wrapper visual universal por persona.
 *
 * Aplica:
 * 1. CSS vars (--persona-accent etc.) injetadas via style inline
 * 2. Sidebar correta (BuyerSidebarNav, BankSidebarNav, etc.)
 * 3. Header com nome do cliente + AdminSwitcher quando admin
 * 4. Banner de "viewing as" quando admin está simulando uma persona
 *
 * Uso:
 *   <PersonaShell ctx={ctx}>
 *     <YourPageContent />
 *   </PersonaShell>
 */

import { themeToCssVars } from "@/lib/persona-themes";
import type { PersonaContext } from "@/lib/persona-resolver";
import BuyerSidebarNav from "@/app/components/BuyerSidebarNav";
import BankSidebarNav from "@/app/components/BankSidebarNav";
import AdminSwitcher from "@/app/components/AdminSwitcher";

export default function PersonaShell({
  ctx,
  children,
}: {
  ctx: PersonaContext;
  children: React.ReactNode;
}) {
  const { theme, clientName, isAdmin, isViewingAs, effectivePersona } = ctx;
  const SidebarNav = getSidebar(effectivePersona);

  return (
    <div
      className="flex h-screen"
      style={{ ...themeToCssVars(theme), backgroundColor: theme.mainBg }}
    >
      <aside
        className="w-72 shrink-0 border-r border-white/8 flex flex-col"
        style={{ backgroundColor: theme.sidebarBg }}
      >
        <div className="px-6 py-5 border-b border-white/8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">Agraas</div>
          <div className="text-white font-semibold text-lg mt-1">{theme.shortLabel}</div>
          <div className="text-white/60 text-xs mt-0.5">{clientName}</div>
        </div>
        <SidebarNav />
        <div className="border-t border-white/8 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {theme.topLabel}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: theme.mainBg }}>
        {(isAdmin || isViewingAs) && (
          <div
            className="sticky top-0 z-40 border-b border-white/8 backdrop-blur"
            style={{ backgroundColor: `${theme.mainBg}cc` }}
          >
            <div className="max-w-7xl mx-auto px-8 py-2 flex items-center justify-between gap-4">
              {isViewingAs ? (
                <div className="text-xs text-amber-300 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Admin simulando perfil <strong>{theme.label}</strong>
                </div>
              ) : (
                <div className="text-xs text-red-300 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  Modo Admin · acesso total
                </div>
              )}
              <AdminSwitcher
                currentViewing={effectivePersona}
                isViewingAs={isViewingAs}
              />
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

function getSidebar(persona: PersonaContext["effectivePersona"]) {
  switch (persona) {
    case "frigorifico":
      return BuyerSidebarNav;
    case "banco":
      return BankSidebarNav;
    default:
      return ProdutorSidebarStub;
  }
}

// Produtor já usa AppSidebar global em outro lugar — stub no-op aqui
function ProdutorSidebarStub() {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5 text-white/40 text-xs">
      Sidebar produtor — use AppSidebar global em /painel
    </nav>
  );
}
