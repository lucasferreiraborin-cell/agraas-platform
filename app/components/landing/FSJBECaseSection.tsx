"use client";

import Link from "next/link";
import { MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import ScoreRing from "@/app/components/ui/ScoreRing";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const STATS = [
  { value: "5",      label: "animais passaportados" },
  { value: "19",     label: "pesagens registradas" },
  { value: "21",     label: "aplicações sanitárias" },
  { value: "78/100", label: "score médio do rebanho" },
  { value: "1",      label: "lote de exportação ativo → Jeddah" },
  { value: "PIF",    label: "comprador institucional vinculado" },
];

const SCORE_BREAKDOWN = [
  { label: "Produtivo",       weight: 28 },
  { label: "Sanitário",       weight: 24 },
  { label: "Continuidade",    weight: 20 },
  { label: "Operacional",     weight: 18 },
  { label: "Rastreabilidade", weight: 10 },
];

const DELIVERABLES = [
  { label: "Passaporte digital",  sub: "ID único por animal, acessível via QR público" },
  { label: "Score em tempo real", sub: "5 dimensões recalculadas por evento" },
  { label: "Operacional diário",  sub: "Pesagens, manejo e sanitário registrados no campo" },
  { label: "Cadeia de exportação", sub: "Lotes, certificações e comprador institucional vinculados" },
];

export default function FSJBECaseSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[.4]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(46,139,62,0.06) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(46,139,62,0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-[720px]">
          <FadeIn>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.05] tracking-[-.025em] text-[var(--text-primary)]">
              Fazenda São João da Boa Esperança
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[.9375rem] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                Jussara, Goiás
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>Rebanho Nelore</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>Cliente ativo</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.25}>
            <p className="mt-8 max-w-[620px] text-[1.0625rem] leading-[1.8] text-[var(--text-secondary)]">
              A FSJBE opera no Agraas com passaporte digital individual, score em tempo real e um lote de exportação ativo para Jeddah. O comprador institucional tem acesso direto à cadeia via portal dedicado.
            </p>
          </FadeIn>
        </div>

        {/* Grid: dados operacionais + score */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[1.3fr_.7fr] lg:gap-16">
          {/* Operational stats grid */}
          <div>
            <FadeIn>
              <h3 className="text-[1.125rem] font-semibold text-[var(--text-primary)]">
                Operação em números
              </h3>
            </FadeIn>
            <StaggerContainer
              className="mt-6 grid gap-4 sm:grid-cols-2"
              staggerChildren={0.06}
            >
              {STATS.map((s) => (
                <StaggerItem key={s.label}>
                  <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--primary)]/25">
                    <p className="text-[1.75rem] font-semibold leading-none tracking-[-.02em] text-[var(--text-primary)]">
                      {s.value}
                    </p>
                    <p className="mt-3 text-[.8125rem] leading-[1.55] text-[var(--text-muted)]">
                      {s.label}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Deliverables list (what platform already delivers) */}
            <FadeIn delay={0.3}>
              <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6">
                <h4 className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                  O que está ativo
                </h4>
                <ul className="mt-4 space-y-3">
                  {DELIVERABLES.map((d) => (
                    <li key={d.label} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                      <div>
                        <p className="text-[.875rem] font-semibold text-[var(--text-primary)]">
                          {d.label}
                        </p>
                        <p className="text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
                          {d.sub}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>

          {/* Score card + CTA */}
          <div className="space-y-6">
            <FadeIn delay={0.2}>
              <div
                className="relative overflow-hidden rounded-3xl p-10"
                style={{
                  background:
                    "linear-gradient(135deg, #0f3517 0%, #1E5E26 100%)",
                }}
              >
                <div className="relative flex flex-col items-center">
                  <p className="text-[.875rem] font-medium text-white/80">
                    Score médio do rebanho
                  </p>
                  <div className="mt-6">
                    <ScoreRing
                      score={78}
                      size="lg"
                      variant="dark"
                      breakdown={SCORE_BREAKDOWN}
                    />
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <Link
                href="/cadastro"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/40 bg-white px-6 py-3.5 text-[.875rem] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
              >
                Ter o mesmo rastreio
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
