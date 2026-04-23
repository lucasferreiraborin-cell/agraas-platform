"use client";

import Link from "next/link";
import { MapPin, Calendar, ArrowRight, CheckCircle2, Shield, Ship } from "lucide-react";
import ScoreRing from "@/app/components/ui/ScoreRing";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/app/components/ui/Motion";

const TIMELINE = [
  {
    date: "Jan 2025",
    title: "Fazenda ativa na Agraas",
    text: "Onboarding completo com importação do rebanho existente em 72 horas.",
    Icon: CheckCircle2,
    done: true,
  },
  {
    date: "Mar 2025",
    title: "2.300 Nelore com passaporte individual",
    text: "Cada animal ganha ID, histórico sanitário, pesagens automatizadas e score em tempo real.",
    Icon: Shield,
    done: true,
  },
  {
    date: "Ago 2025",
    title: "Certificação Halal + SIF aprovada",
    text: "Cadeia completa auditada — fazenda, abatedouro e documentação fiscal verificados.",
    Icon: Shield,
    done: true,
  },
  {
    date: "Q2 2026",
    title: "Primeiro embarque Santos → Jeddah",
    text: "Lote de exportação com rastreio em 7 checkpoints e QR público para comprador institucional.",
    Icon: Ship,
    done: false,
  },
];

const SCORE_BREAKDOWN = [
  { label: "Produtivo",       weight: 28 },
  { label: "Sanitário",       weight: 24 },
  { label: "Continuidade",    weight: 20 },
  { label: "Operacional",     weight: 18 },
  { label: "Rastreabilidade", weight: 10 },
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
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Case · cliente em operação
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.02] tracking-[-.03em] text-[var(--text-primary)]">
              Fazenda São João
              <br />
              da Boa Esperança.
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[.9375rem] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                Jussara, Goiás
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>2.300 cabeças Nelore</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>Primeiro cliente institucional</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p className="mt-8 max-w-[620px] text-[1.0625rem] leading-[1.8] text-[var(--text-secondary)]">
              A FSJBE é a primeira fazenda em operação com passaporte digital individual ativo e lote Halal confirmado para exportação. Do cadastro inicial ao primeiro embarque previsto para Santos em Q2 2026, cada etapa é rastreada pela infraestrutura Agraas.
            </p>
          </FadeIn>
        </div>

        {/* Grid: timeline + score */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[1.3fr_.7fr] lg:gap-16">
          {/* Timeline */}
          <div>
            <FadeIn>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--text-muted)]">
                Linha do tempo
              </p>
            </FadeIn>
            <StaggerContainer className="mt-6" staggerChildren={0.1}>
              {TIMELINE.map((t, i) => (
                <StaggerItem key={t.title} direction="right" distance={24}>
                  <div className="group flex gap-5 pb-9 last:pb-0">
                    {/* Dot + line */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          t.done
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_0_0_6px_var(--primary-soft)]"
                            : "border-[var(--primary)] bg-white text-[var(--primary)] shadow-[0_0_0_6px_var(--primary-soft)] ring-1 ring-[var(--primary)]/30"
                        }`}
                      >
                        <t.Icon size={15} />
                      </div>
                      {i < TIMELINE.length - 1 && (
                        <div className="mt-2 w-px flex-1 bg-gradient-to-b from-[var(--primary)]/50 to-[var(--border)]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-baseline gap-3">
                        <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[var(--primary)]">
                          {t.date}
                        </p>
                        {!t.done && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[.625rem] font-bold uppercase tracking-[.12em] text-amber-700">
                            <Calendar size={9} /> Programado
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[1.0625rem] font-semibold leading-[1.3] tracking-[-.01em] text-[var(--text-primary)]">
                        {t.title}
                      </p>
                      <p className="mt-2 max-w-[520px] text-[.875rem] leading-[1.7] text-[var(--text-muted)]">
                        {t.text}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Score + certifications */}
          <div className="space-y-6">
            <FadeIn delay={0.2}>
              <div
                className="relative overflow-hidden rounded-3xl p-10"
                style={{
                  background:
                    "linear-gradient(135deg, #0f3517 0%, #1E5E26 100%)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      "linear-gradient(hsla(0,0%,100%,.03) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.03) 1px, transparent 1px)",
                    backgroundSize: "3rem 3rem",
                  }}
                />
                <div className="relative flex flex-col items-center">
                  <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
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

            <FadeIn delay={0.35}>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--text-muted)]">
                  Certificações ativas
                </p>
                <div className="mt-4 space-y-2.5">
                  {[
                    { label: "MAPA", sub: "Inspeção federal", active: true },
                    { label: "GTA", sub: "Guia de trânsito vigente", active: true },
                    { label: "Halal SAMS-KSA", sub: "Cadeia validada", active: true },
                    { label: "SIF", sub: "Abatedouro aprovado", active: true },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-[.8125rem] font-semibold text-[var(--text-primary)]">
                          {c.label}
                        </p>
                        <p className="text-[.6875rem] text-[var(--text-muted)]">
                          {c.sub}
                        </p>
                      </div>
                      <CheckCircle2 size={16} className="text-[var(--primary)]" />
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.45}>
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
