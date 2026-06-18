"use client";

import Link from "next/link";
import { MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const STATS = [
  { value: "Nelore", label: "Rebanho passaportado individual" },
  { value: "2.300",  label: "cabeças sob rastreio digital" },
  { value: "Cria",   label: "fazenda com foco em terminação reprodutiva" },
  { value: "Goiás",  label: "Jussara — região central do cinturão pecuário" },
];

const DELIVERABLES = [
  { label: "Passaporte digital",        sub: "ID único por animal, acessível via QR público" },
  { label: "Operação no campo",         sub: "Pesagens, manejo e sanitário registrados pelo time" },
  { label: "Conformidade sanitária",    sub: "Calendário MAPA e carências respeitadas" },
  { label: "Infraestrutura preparada",  sub: "Base de dados pronta para os próximos passos comerciais" },
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
        <div className="max-w-[820px]">
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
              <span>Piloto operacional</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.25}>
            <div className="mt-8 max-w-[720px] space-y-5 text-[1.0625rem] leading-[1.85] text-[var(--text-secondary)]">
              <p>
                A Fazenda São João da Boa Esperança é o piloto operacional da Agraas. Com 2.300 cabeças de Nelore em Jussara (GO), a FSJBE tem passaporte digital individual por animal e rastreio do manejo diário rodando em campo aberto.
              </p>
              <p className="font-medium text-[var(--text-primary)]">
                A prova de que a Agraas roda no campo real — não só em demo.
              </p>
            </div>
          </FadeIn>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.3fr_.7fr] lg:gap-16 lg:items-start">
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
                    <p className="text-[1.5rem] font-semibold leading-tight tracking-[-.02em] text-[var(--text-primary)]">
                      {s.value}
                    </p>
                    <p className="mt-3 text-[.8125rem] leading-[1.55] text-[var(--text-muted)]">
                      {s.label}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Deliverables + CTA */}
          <div className="space-y-6">
            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-[var(--shadow-soft)]">
                <h3 className="text-[1rem] font-semibold text-[var(--text-primary)]">
                  Status do piloto
                </h3>
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

            <FadeIn delay={0.35}>
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
