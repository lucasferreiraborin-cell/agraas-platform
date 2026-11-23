import type { Metadata } from "next";
import { contextoGestao } from "@/lib/gestao/contexto";
import { GestaoSidebar, GestaoMobileMenu } from "./GestaoNav";
import GestaoSair from "./GestaoSair";

export const metadata: Metadata = {
  title: { default: "Agraas Gestão", template: "%s · Agraas Gestão" },
  robots: { index: false, follow: false },
};

export default async function GestaoLayout({ children }: { children: React.ReactNode }) {
  const ctx = await contextoGestao();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-y-auto bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] lg:flex">
        <div className="border-b border-white/10 px-7 py-7">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/50">Mini ERP do agro</p>
          <p className="mt-2 text-[1.9rem] font-semibold leading-none tracking-[-0.06em] text-white">
            Agraas <span className="font-normal text-white/60">Gestão</span>
          </p>
        </div>
        <GestaoSidebar />
        <div className="mt-auto border-t border-white/10 px-7 py-5">
          <p className="truncate text-[.8rem] font-medium text-white/85">{ctx.clientName}</p>
          <p className="truncate text-[.72rem] text-white/50">{ctx.email}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-black/5 bg-[rgba(244,247,242,0.88)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-2">
              <GestaoMobileMenu />
              <div className="min-w-0">
                <p className="truncate text-[.95rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {ctx.clientName}
                </p>
                <p className="hidden text-[.72rem] text-[var(--text-muted)] sm:block">Agraas Gestão</p>
              </div>
            </div>
            <GestaoSair />
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
