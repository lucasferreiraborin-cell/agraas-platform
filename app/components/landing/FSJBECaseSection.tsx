"use client";

import Link from "next/link";
import { MapPin, ArrowRight, CheckCircle2, Sparkles, Cpu, Rocket, Calendar } from "lucide-react";
import ScoreRing from "@/app/components/ui/ScoreRing";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/app/components/ui/Motion";

const TIMELINE = [
  {
    date: "2025",
    title: "Selecionada como piloto MVP",
    text: "Primeira fazenda a integrar a plataforma — rebanho de cria Nelore escolhido como referência operacional para o produto.",
    Icon: Sparkles,
    done: true,
  },
  {
    date: "Em curso",
    title: "Rebanho em digitalização",
    text: "Cadastro individual dos animais, pesagens históricas e estrutura de passaporte digital sendo montada com o time do campo.",
    Icon: Cpu,
    done: true,
  },
  {
    date: "Próximos passos",
    title: "Scores completos + integrações sanitárias",
    text: "Algoritmo Agraas calculando em tempo real as 5 dimensões e conectando eventos sanitários à agenda operacional.",
    Icon: CheckCircle2,
    done: false,
  },
  {
    date: "Roadmap",
    title: "Caminho para exportação",
    text: "Conforme a fazenda evolui para exportação, a infraestrutura Agraas já acompanha — rastreio de embarques, conformidade Halal e certificações ficam prontas para ativar.",
    Icon: Rocket,
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
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.05] tracking-[-.025em] text-[var(--text-primary)]">
              Fazenda São João da Boa Esperança
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[.9375rem] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                Jussara, Goiás
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>Rebanho Nelore de cria</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>Piloto MVP</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p className="mt-8 max-w-[620px] text-[1.0625rem] leading-[1.8] text-[var(--text-secondary)]">
              A FSJBE é a primeira fazenda a rodar a plataforma Agraas como piloto operacional. Rebanho em digitalização, scores em formação e infraestrutura completa pronta para escalar — do manejo do dia a dia ao futuro roadmap de exportação.
            </p>
          </FadeIn>
        </div>

        {/* Grid: timeline + score */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[1.3fr_.7fr] lg:gap-16">
          {/* Timeline */}
          <div>
            <FadeIn>
              <h3 className="text-[1.125rem] font-semibold text-[var(--text-primary)]">
                Linha do tempo
              </h3>
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
                        <p className="text-[.8125rem] font-semibold text-[var(--primary)]">
                          {t.date}
                        </p>
                        {!t.done && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[.6875rem] font-semibold text-amber-700">
                            <Calendar size={10} /> Programado
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
                  <p className="text-[.875rem] font-medium text-white/80">
                    Score em execução na FSJBE
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
                <h3 className="text-[1rem] font-semibold text-[var(--text-primary)]">
                  O que a plataforma já entrega
                </h3>
                <div className="mt-4 space-y-2.5">
                  {[
                    { label: "Passaporte digital", sub: "1 ID único por animal" },
                    { label: "Score em tempo real", sub: "5 dimensões recalculadas por evento" },
                    { label: "Operacional diário", sub: "Pesagens, manejo e sanitário registrados" },
                    { label: "Pronto para escala", sub: "Lotes, exportação e certificações disponíveis" },
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
