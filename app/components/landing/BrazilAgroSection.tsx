"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const RANKINGS = [
  { rank: "1º",  produto: "Soja",          context: "maior exportador mundial" },
  { rank: "1º",  produto: "Carne bovina",  context: "maior exportador mundial" },
  { rank: "1º",  produto: "Açúcar",        context: "maior produtor e exportador" },
  { rank: "1º",  produto: "Café",          context: "maior produtor mundial" },
  { rank: "1º",  produto: "Suco de laranja", context: "maior exportador mundial" },
  { rank: "2º",  produto: "Milho",         context: "segundo maior exportador" },
  { rank: "3º",  produto: "Frango",        context: "terceiro maior produtor" },
  { rank: "Top 5", produto: "Algodão",     context: "entre os maiores produtores" },
];

const MACRO_STATS = [
  {
    value: "~27%",
    label: "do PIB brasileiro",
    sub: "vem do agronegócio (agricultura + pecuária + cadeias associadas)",
  },
  {
    value: "~US$ 166 bi",
    label: "em exportações agro",
    sub: "2023 · quase metade da pauta exportadora do país",
  },
  {
    value: "~20 milhões",
    label: "de empregos",
    sub: "direta ou indiretamente gerados pelo agronegócio brasileiro",
  },
];

export default function BrazilAgroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(46,139,62,0.05) 0%, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div>
            <FadeIn>
              <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.05] tracking-[-.025em] text-[var(--text-primary)]">
                O Brasil é <span className="text-[var(--primary)]">líder mundial</span> do agro.
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-6 text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
                Somos o maior exportador global de carne bovina, soja, açúcar, café e suco de laranja. Ainda assim, a camada digital que conecta produtor, comprador e conformidade continua fragmentada.
              </p>
              <p className="mt-4 text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
                A Agraas existe para isso — consolidar em uma única plataforma a operação, a rastreabilidade e o acesso ao mercado que o agro brasileiro precisa para competir em posição de força.
              </p>
            </FadeIn>
          </div>

          <StaggerContainer
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
            staggerChildren={0.04}
          >
            {RANKINGS.map((r) => (
              <StaggerItem key={r.produto}>
                <div className="rounded-xl border border-[var(--border)] bg-white p-4 transition-colors hover:border-[var(--primary)]/30">
                  <p className="text-[1.125rem] font-semibold text-[var(--primary)]">
                    {r.rank}
                  </p>
                  <p className="mt-1 text-[.875rem] font-semibold text-[var(--text-primary)]">
                    {r.produto}
                  </p>
                  <p className="mt-1 text-[.6875rem] leading-[1.5] text-[var(--text-muted)]">
                    {r.context}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Macro stats band */}
        <div className="mt-16 grid gap-10 border-t border-[var(--border)] pt-14 md:grid-cols-3">
          {MACRO_STATS.map((s, i) => (
            <FadeIn key={s.label} delay={0.1 + i * 0.08}>
              <div>
                <p className="text-[2rem] font-semibold leading-none tracking-[-.025em] text-[var(--text-primary)]">
                  {s.value}
                </p>
                <p className="mt-3 text-[.9375rem] font-medium text-[var(--text-primary)]">
                  {s.label}
                </p>
                <p className="mt-1 text-[.8125rem] leading-[1.6] text-[var(--text-muted)]">
                  {s.sub}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        <p className="mt-10 text-[.75rem] text-[var(--text-muted)]">
          Fontes: CNA, MAPA, CEPEA, ABIEC, CONAB (valores aproximados, referência 2023–2024).
        </p>
      </div>
    </section>
  );
}
