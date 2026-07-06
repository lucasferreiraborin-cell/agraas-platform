import Link from "next/link";

const FOOTER_STYLE = {
  background: "linear-gradient(180deg, #1E5E26 0%, #0f3517 100%)",
  color: "#ffffff",
} as const;

const WHITE = { color: "#ffffff" } as const;

export default function PublicFooter() {
  return (
    <footer style={FOOTER_STYLE}>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 sm:grid-cols-4 lg:px-10">
        <div>
          <p style={WHITE} className="text-[1.25rem] font-semibold tracking-[-.04em]">
            Agraas
          </p>
          <p style={WHITE} className="mt-3 text-[.8125rem] leading-[1.75] opacity-80">
            Infraestrutura digital do agronegócio brasileiro.
          </p>
        </div>

        <div>
          <p style={WHITE} className="text-[.6875rem] font-semibold uppercase tracking-[.15em] opacity-70">
            Plataforma
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/marketplace" style={WHITE} className="text-[.875rem] transition-opacity hover:opacity-80">
              Marketplace
            </Link>
            <Link href="/login" style={WHITE} className="text-[.875rem] transition-opacity hover:opacity-80">
              Login
            </Link>
          </div>
        </div>

        <div>
          <p style={WHITE} className="text-[.6875rem] font-semibold uppercase tracking-[.15em] opacity-70">
            Empresa
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/sobre" style={WHITE} className="text-[.875rem] transition-opacity hover:opacity-80">
              Sobre nós
            </Link>
            <a href="mailto:contato@agraas.com.br" style={WHITE} className="text-[.875rem] transition-opacity hover:opacity-80">
              Contato
            </a>
          </div>
        </div>

        <div>
          <p style={WHITE} className="text-[.6875rem] font-semibold uppercase tracking-[.15em] opacity-70">
            Legal
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/privacidade" style={WHITE} className="text-[.875rem] transition-opacity hover:opacity-80">
              Privacidade
            </Link>
            <Link href="/termos" style={WHITE} className="text-[.875rem] transition-opacity hover:opacity-80">
              Termos
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] border-t border-white/[.12] px-6 py-6">
        <p style={WHITE} className="text-[.75rem] opacity-70">
          © 2026 Agraas Agritech. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
