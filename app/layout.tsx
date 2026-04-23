import "./globals.css";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import LogoutButton from "./components/LogoutButton";
import SidebarNav from "./components/SidebarNav";
import BuyerSidebarNav from "./components/BuyerSidebarNav";
import MobileDrawer from "./components/MobileDrawer";
import { ToastContainer } from "./components/Toast";
import AgroAssistant from "./components/AgroAssistant";
import QuickActions from "./components/QuickActions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

const SITE_URL = "https://agraas-platform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agraas — O agro do Brasil, auditável em tempo real.",
    template: "%s · Agraas",
  },
  description:
    "Infraestrutura digital do agronegócio brasileiro. Pecuária, grãos e exportação sobre uma única camada de dados verificáveis — do pasto ao porto.",
  applicationName: "Agraas",
  authors: [{ name: "Agraas Agritech" }],
  keywords: [
    "rastreabilidade agro",
    "passaporte digital animal",
    "Halal exportação",
    "Grain ID",
    "soja rastreabilidade",
    "Nelore exportação",
    "marketplace agro",
    "score agronegócio",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Agraas",
    title: "Agraas — O agro do Brasil, auditável em tempo real.",
    description:
      "Pecuária, grãos e exportação sobre uma única camada de dados verificáveis. Do pasto ao porto, do talhão ao comprador institucional.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agraas — O agro do Brasil, auditável em tempo real.",
    description:
      "Infraestrutura digital do agronegócio brasileiro. Pecuária, grãos e exportação em uma só camada.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2E8B3E" },
    { media: "(prefers-color-scheme: dark)", color: "#0f3517" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Detect buyer role for sidebar customization
  const { data: clientData } = user
    ? await supabase.from("clients").select("role").eq("auth_user_id", user.id).single()
    : { data: null };
  const isBuyer = clientData?.role === "buyer";

  const environmentLabel =
    process.env.NODE_ENV === "production" ? "Agraas MVP" : "Ambiente local";

  const phaseLabel =
    process.env.NODE_ENV === "production"
      ? "Fase 1 entregue"
      : "Fase 1 em consolidação final";

  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : null;

  // Login e páginas de auth: layout sem sidebar/header
  if (!user) {
    return (
      <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <head>
          <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://images.unsplash.com" />
          {supabaseHost && (
            <>
              <link rel="preconnect" href={`https://${supabaseHost}`} crossOrigin="" />
              <link rel="dns-prefetch" href={`https://${supabaseHost}`} />
            </>
          )}
        </head>
        <body className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <head>
        {supabaseHost && (
          <>
            <link rel="preconnect" href={`https://${supabaseHost}`} crossOrigin="" />
            <link rel="dns-prefetch" href={`https://${supabaseHost}`} />
          </>
        )}
      </head>
      <body>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
          <div className="flex min-h-screen">
            <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] text-white lg:flex lg:flex-col">
              <div className="border-b border-white/10 px-7 py-8">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
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
                  <HalalBadgeSVG size={56} />
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

              {isBuyer ? <BuyerSidebarNav /> : <SidebarNav />}

              <div className="border-t border-white/10 p-5">
                <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 ring-1 ring-white/8 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                    {isBuyer ? "Vision" : "Visão"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/82">
                    {isBuyer
                      ? "Traceability, productive performance, animal digital identity and operational intelligence for the food supply chain."
                      : "Rastreabilidade, performance produtiva, identidade digital animal e inteligência operacional para a cadeia pecuária."}
                  </p>

                  {isBuyer ? (
                    <div className="mt-5 rounded-2xl border border-white/8 bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/42">
                        Infrastructure
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Enterprise · ISO 27001
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/42">Stack</p>
                        <p className="mt-2 text-sm font-medium text-white">Next + Supabase</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/8 p-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/42">Fase</p>
                        <p className="mt-2 text-sm font-medium text-white">Fase 1 entregue</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-20 border-b border-black/5 bg-[rgba(244,247,242,0.82)] backdrop-blur-2xl">
                <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 lg:px-10">
                  <div className="flex items-center gap-3">
                    <MobileDrawer />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                        Agraas Intelligence Layer
                      </p>
                      <h2 className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                        {isBuyer
                          ? "Digital infrastructure for the Brazilian food supply chain"
                          : "Infraestrutura digital da cadeia pecuária"}
                      </h2>
                    </div>
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