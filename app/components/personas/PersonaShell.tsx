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

import Link from "next/link";
import { Home } from "lucide-react";
import { themeToCssVars } from "@/lib/persona-themes";
import type { PersonaContext } from "@/lib/persona-resolver";
import BuyerSidebarNav from "@/app/components/BuyerSidebarNav";
import BankSidebarNav from "@/app/components/BankSidebarNav";
import ContadorSidebarNav from "@/app/components/ContadorSidebarNav";
import AdminSwitcher from "@/app/components/AdminSwitcher";
import PersonaSidebar from "@/app/components/personas/PersonaSidebar";

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
    // Overlay full-screen: cobre o chrome global (sidebar verde + header + FABs)
    // do root layout nas rotas de persona, eliminando o "double sidebar" sem
    // tocar no middleware/auth. z alto para ficar acima de qualquer FAB global.
    <div
      className="fixed inset-0 z-[60] flex"
      style={{ ...themeToCssVars(theme), backgroundColor: theme.mainBg }}
    >
      <PersonaSidebar theme={theme} clientName={clientName}>
        <SidebarNav />
      </PersonaSidebar>

      <main
        className="flex-1 overflow-y-auto pt-14 lg:pt-0"
        style={{ backgroundColor: theme.mainBg }}
      >
        {(isAdmin || isViewingAs) && (
          <div
            className="sticky top-14 z-40 border-b border-white/8 backdrop-blur lg:top-0"
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
    case "contador":
      return ContadorSidebarNav;
    default:
      return ProdutorSidebarStub;
  }
}

// Produtor usa a AppSidebar global. Aqui (admin vendo rota de persona sem
// simular) mostramos só wayfinding — nunca vazio (parecia app quebrado) nem
// texto interno de dev.
function ProdutorSidebarStub() {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      <Link
        href="/painel"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Home size={15} className="opacity-70" />
        Voltar ao painel
      </Link>
    </nav>
  );
}
