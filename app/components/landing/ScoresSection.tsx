"use client";

import ScoreRing from "@/app/components/ui/ScoreRing";
import { FadeIn } from "@/app/components/ui/Motion";

const SCORES = [
  {
    score: 78,
    label: "Bovino",
    sub: "Pecuária de cria",
    breakdown: [
      { label: "Produtivo",      weight: 28 },
      { label: "Sanitário",      weight: 24 },
      { label: "Continuidade",   weight: 20 },
      { label: "Operacional",    weight: 18 },
      { label: "Rastreabilidade", weight: 10 },
    ],
  },
  {
    score: 85,
    label: "Talhão de Soja",
    sub: "EUDR · MATOPIBA",
    breakdown: [
      { label: "Rastreabilidade", weight: 25 },
      { label: "Fiscal",          weight: 25 },
      { label: "Operacional",     weight: 25 },
      { label: "Certificações",   weight: 25 },
    ],
  },
  {
    score: 72,
    label: "Lote de Aves",
    sub: "Halal · Abatedouro SIF",
    breakdown: [
      { label: "Sanitário",    weight: 30 },
      { label: "Produtivo",    weight: 30 },
      { label: "Operacional",  weight: 20 },
      { label: "Conformidade", weight: 20 },
    ],
  },
];

export default function ScoresSection() {
  return (
    <section className="relative overflow-hidden bg-[#071a0e]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[.5]"
        style={{
          backgroundImage:
            "linear-gradient(hsla(0,0%,100%,.03) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.03) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-[clamp(6rem,12vw,10rem)] lg:px-10">
        <div className="mb-16 max-w-[780px]">
          <FadeIn>
            <h2 className="text-[clamp(2rem,4.8vw,3.4rem)] font-medium leading-[1.05] tracking-[-.025em] text-white">
              O mesmo score <span className="text-white/55">para pecuária, agricultura e aves.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mt-6 max-w-[560px] text-[1.0625rem] leading-[1.75] text-white/55">
              O Score Agraas é calculado em tempo real a cada evento registrado — pesagem, aplicação sanitária, embarque, certificação. O mesmo número que aparece na plataforma é o que o comprador vê no passaporte público.
            </p>
          </FadeIn>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8 lg:gap-12">
          {SCORES.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.15}>
              <div className="flex flex-col items-center rounded-2xl border border-white/[.06] bg-white/[.02] p-8 backdrop-blur-sm">
                <ScoreRing
                  score={s.score}
                  size="md"
                  variant="dark"
                  label={s.label}
                  sub={s.sub}
                  breakdown={s.breakdown}
                  delay={0.3 + i * 0.1}
                />
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.5}>
          <div className="mx-auto mt-16 max-w-[640px] rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/[.04] p-6 text-center">
            <p className="text-[.9375rem] leading-[1.7] text-white/70">
              <span className="font-mono text-[.75rem] font-semibold uppercase tracking-[.12em] text-[var(--primary)]">
                Mesma ciência
              </span>{" "}
              — pecuária, agricultura e aves operam com o mesmo motor de scoring. Uma única camada de confiança para toda a exportação brasileira.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
