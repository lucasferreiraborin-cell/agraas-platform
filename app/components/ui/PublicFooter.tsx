import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

const FOOTER_STYLE = {
  background:
    "linear-gradient(180deg, #1E5E26 0%, #0f3517 100%)",
  color: "#ffffff",
} as const;

const WHITE = { color: "#ffffff" } as const;

const PLATFORM_LINKS = [
  { href: "/",           label: "Início" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/planos",      label: "Planos" },
  { href: "/login",       label: "Entrar" },
  { href: "/cadastro",    label: "Criar conta" },
];

const COMPANY_LINKS = [
  { href: "/sobre",                                  label: "Sobre" },
  { href: "mailto:contato@agraas.com.br",            label: "Contato", external: true },
  { href: "mailto:contato@agraas.com.br?subject=Imprensa", label: "Imprensa", external: true },
];

const LEGAL_LINKS = [
  { label: "Privacidade" },
  { label: "Termos de uso" },
  { label: "LGPD" },
];

export default function PublicFooter() {
  return (
    <footer style={FOOTER_STYLE}>
      {/* Top section */}
      <div className="mx-auto max-w-[1200px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_.6fr_.6fr_.6fr]">
          {/* Brand + pitch */}
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#2E8B3E]"
                style={{ backgroundColor: "#ffffff", fontWeight: 700, letterSpacing: "-0.08em", fontSize: 22 }}
              >
                A
              </div>
              <div>
                <p style={WHITE} className="text-[1.25rem] font-semibold tracking-[-.04em]">
                  Agraas
                </p>
                <p className="font-mono text-[.625rem] uppercase tracking-[.2em] text-white/40">
                  Intelligence Layer
                </p>
              </div>
            </div>

            <p style={WHITE} className="mt-6 max-w-[380px] text-[.875rem] leading-[1.7] opacity-70">
              A infraestrutura digital do agronegócio brasileiro. Pecuária, grãos e exportação sobre uma camada só de dados verificáveis.
            </p>

            <a
              href="mailto:contato@agraas.com.br"
              style={WHITE}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[.04] px-4 py-2.5 text-[.8125rem] font-medium backdrop-blur-sm transition hover:border-white/40 hover:bg-white/[.08]"
            >
              <Mail size={14} />
              contato@agraas.com.br
              <ArrowUpRight size={12} className="opacity-60" />
            </a>
          </div>

          {/* Platform */}
          <div>
            <p style={WHITE} className="font-mono text-[.625rem] font-semibold uppercase tracking-[.2em] opacity-50">
              Plataforma
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {PLATFORM_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={WHITE}
                  className="text-[.875rem] opacity-80 transition hover:opacity-100"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <p style={WHITE} className="font-mono text-[.625rem] font-semibold uppercase tracking-[.2em] opacity-50">
              Empresa
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {COMPANY_LINKS.map((l) =>
                l.external ? (
                  <a
                    key={l.href}
                    href={l.href}
                    style={WHITE}
                    className="text-[.875rem] opacity-80 transition hover:opacity-100"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    style={WHITE}
                    className="text-[.875rem] opacity-80 transition hover:opacity-100"
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* Legal */}
          <div>
            <p style={WHITE} className="font-mono text-[.625rem] font-semibold uppercase tracking-[.2em] opacity-50">
              Legal
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {LEGAL_LINKS.map((l) => (
                <span
                  key={l.label}
                  style={WHITE}
                  className="text-[.875rem] opacity-60"
                >
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stack signature */}
        <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[.1] pt-8">
          <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-white/40">
            Construído com
          </p>
          {["Next.js 16", "Supabase + PostgreSQL RLS", "Stripe Connect", "React Native"].map(
            (tool) => (
              <span key={tool} className="font-mono text-[.6875rem] text-white/50">
                {tool}
              </span>
            ),
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[.08]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-5 lg:px-10">
          <p style={WHITE} className="text-[.75rem] opacity-50">
            © 2026 Agraas Agritech. Todos os direitos reservados.
          </p>
          <p style={WHITE} className="font-mono text-[.625rem] uppercase tracking-[.18em] opacity-40">
            Feito no Brasil · São Paulo + Jussara-GO
          </p>
        </div>
      </div>
    </footer>
  );
}
