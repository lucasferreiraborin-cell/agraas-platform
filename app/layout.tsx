import "./globals.css";
import LogoutButton from "./components/LogoutButton";
import SidebarNav from "./components/SidebarNav";
import { ToastContainer } from "./components/Toast";
import AgroAssistant from "./components/AgroAssistant";
import QuickActions from "./components/QuickActions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const environmentLabel =
    process.env.NODE_ENV === "production" ? "Agraas MVP" : "Ambiente local";

  const phaseLabel =
    process.env.NODE_ENV === "production"
      ? "Fase 1 entregue"
      : "Fase 1 em consolidação final";

  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
          <div className="flex min-h-screen">
            <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] text-white lg:flex lg:flex-col">
              <div className="border-b border-white/10 px-7 py-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">
                      Plataforma
                    </p>
                    <h1 className="mt-3 text-[3rem] font-semibold leading-none tracking-[-0.07em] text-white">
                      Agraas
                    </h1>
                    <p className="mt-3 text-base text-white/72">
                      Intelligence Layer
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    MVP
                  </div>
                </div>
              </div>

              <div className="px-5 pt-5">
                <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Status
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Ambiente ativo
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {phaseLabel}
                      </p>
                    </div>
                    <span className="inline-flex h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.85)]" />
                  </div>
                </div>
              </div>

              <SidebarNav />

              <div className="border-t border-white/10 p-5">
                <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 ring-1 ring-white/8 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                    Visão
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/82">
                    Rastreabilidade, performance produtiva, identidade digital
                    animal e inteligência operacional para a cadeia pecuária.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/42">
                        Stack
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Next + Supabase
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/42">
                        Fase
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Fase 1 entregue
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-20 border-b border-black/5 bg-[rgba(244,247,242,0.82)] backdrop-blur-2xl">
                <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 lg:px-10">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Agraas Intelligence Layer
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      Infraestrutura digital da cadeia pecuária
                    </h2>
                  </div>

                  <div className="hidden items-center gap-3 md:flex">
                    <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                      {environmentLabel}
                    </div>
                    {user && (
                      <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                        {user.email}
                      </div>
                    )}
                    <LogoutButton />
                  </div>
                </div>
              </header>

              <main className="flex-1">
                <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
                  {children}
                </div>
              </main>
              <ToastContainer />
              <QuickActions />
              <AgroAssistant />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}