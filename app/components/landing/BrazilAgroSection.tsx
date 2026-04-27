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

type MacroStat = {
  value: string;
  label: string;
  sub: string;
  featured?: boolean;
  badge?: string;
};

const MACRO_STATS: MacroStat[] = [
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
  {
    value: "44%",
    label: "da proteína bovina saudita",
    sub: "das importações de carne da Arábia Saudita vêm do Brasil",
  },
  {
    value: "108 Mi t",
    label: "de soja exportadas",
    sub: "em 2025 — cerca de 40% da produção global",
  },
  {
    value: "R$ 1,2 tri",
    label: "de PIB agro",
    sub: "o maior do mundo em termos relativos para uma economia emergente",
    featured: true,
  },
  {
    value: "230 Mi",
    label: "cabeças bovinas",
    sub: "maior rebanho comercial do planeta",
    featured: true,
  },
  {
    value: "2027",
    label: "PNIB obrigatória",
    sub: "rastreabilidade vira exigência legal — janela estratégica aberta agora",
    featured: true,
    badge: "Marco regulatório",
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

      <div className="relative mx-auto max-w-[1200px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div>
            <FadeIn>
              <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.05] tracking-[-.025em] text-[var(--text-primary)]">
                O Brasil é <span className="text-[var(--primary)]">líder mundial</span> do agro.
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-6 text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
                Somos o maior exportador global de carne bovina, soja, açúcar, café e suco de laranja — e a camada digital que conecta produtor, comprador e conformidade precisa estar à altura desse mercado.
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

        {/* Macro stats band — 4×2 com novos números estratégicos */}
        <div className="mt-16 grid gap-x-10 gap-y-12 border-t border-[var(--border)] pt-14 sm:grid-cols-2 lg:grid-cols-4">
          {MACRO_STATS.map((s, i) => (
            <FadeIn key={s.label} delay={0.1 + i * 0.05}>
              <div>
                <p
                  className={`leading-none tracking-[-.025em] text-[var(--text-primary)] ${
                    s.featured
                      ? "text-5xl font-bold"
                      : "text-4xl font-semibold"
                  }`}
                >
                  {s.value}
                </p>
                {s.badge && (
                  <span className="mt-3 inline-flex items-center rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2 py-0.5 text-[.6875rem] font-semibold text-[var(--primary)]">
                    {s.badge}
                  </span>
                )}
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

        {/* Closing paragraph */}
        <FadeIn delay={0.2}>
          <div className="mt-16 max-w-[860px] border-l-4 border-[var(--primary)] pl-6">
            <p className="text-[1.0625rem] leading-[1.8] text-[var(--text-primary)]">
              Nenhum outro país concentra essa escala de produção, essa diversidade de commodities e essa convergência regulatória simultânea. O Brasil não precisa de mais produção — precisa de infraestrutura que prove o que já produz.
            </p>
          </div>
        </FadeIn>

        <p className="mt-10 text-[.75rem] text-[var(--text-muted)]">
          Fontes: CNA, MAPA, CEPEA, ABIEC, CONAB, USDA, MAPA-PNIB (valores aproximados, referência 2023–2025).
        </p>
      </div>
    </section>
  );
}
