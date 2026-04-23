"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ScanLine, Activity, Ship } from "lucide-react";
import { FadeIn } from "@/app/components/ui/Motion";

const STEPS = [
  {
    n: "01",
    Icon: ScanLine,
    title: "Identifique uma vez.",
    sub: "Passaporte para a vida toda.",
    text: "Cada animal nasce ou entra na propriedade com ID único, GPS, genealogia e certificações iniciais. Cada talhão ganha polígono georreferenciado com CAR. O passaporte digital começa aqui.",
    tags: ["RFID bolus", "GPS talhão", "CAR verificado"],
  },
  {
    n: "02",
    Icon: Activity,
    title: "Opere no automático.",
    sub: "Cada evento vira dado.",
    text: "Pesagens, aplicações sanitárias, movimentações, colheitas, NF-e de insumos — tudo registrado em segundos. O Score Agraas recalcula sozinho. Estoque debita sozinho. Custo acumula sozinho.",
    tags: ["Score automático", "Estoque ligado", "Custo por animal"],
  },
  {
    n: "03",
    Icon: Ship,
    title: "Venda com rastreio.",
    sub: "Do pasto ao comprador global.",
    text: "Anúncie no marketplace com score e certificações automáticos. Feche a venda com NF-e gerada. Embarque via porto brasileiro com rastreio em 7 checkpoints. Comprador final verifica origem por QR público.",
    tags: ["Marketplace integrado", "NF-e automática", "QR público"],
  },
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 20%"],
  });
  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="relative overflow-hidden bg-[var(--bg)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(46,139,62,0.06) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(46,139,62,0.06) 0%, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[820px] text-center">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Como funciona
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.02] tracking-[-.03em] text-[var(--text-primary)]">
              Três passos.
              <br />
              <span className="italic text-[var(--primary)]">Uma plataforma inteira.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mx-auto mt-6 max-w-[560px] text-[1.0625rem] leading-[1.75] text-[var(--text-secondary)]">
              Configurar leva minutos. Operar vira automático. Vender com rastreabilidade se torna o default.
            </p>
          </FadeIn>
        </div>

        <div ref={ref} className="relative mt-20 max-w-[980px] mx-auto">
          {/* Progress line (vertical) — scroll-linked */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[27px] top-[40px] bottom-[40px] w-px bg-[var(--border)] hidden md:block"
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-[27px] top-[40px] w-px bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/30 hidden md:block"
            style={{ height: progressHeight }}
          />

          <div className="space-y-10 md:space-y-14">
            {STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="group relative flex gap-6 md:gap-10">
                  {/* Number circle */}
                  <div className="relative shrink-0">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white ring-4 ring-[var(--bg)] shadow-[0_8px_24px_rgba(46,139,62,.18)] transition-transform group-hover:scale-105">
                      <step.Icon size={22} className="text-[var(--primary)]" />
                    </div>
                    <span className="absolute -right-2 -top-2 z-20 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-2 py-0.5 font-mono text-[.625rem] font-bold text-[var(--primary)]">
                      {step.n}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-card)] md:p-8">
                    <div>
                      <h3 className="text-[clamp(1.25rem,2.4vw,1.5rem)] font-semibold leading-[1.2] tracking-[-.015em] text-[var(--text-primary)]">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[.9375rem] font-medium text-[var(--primary)]">
                        {step.sub}
                      </p>
                    </div>
                    <p className="mt-5 max-w-[620px] text-[.9375rem] leading-[1.75] text-[var(--text-muted)]">
                      {step.text}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {step.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-semibold text-[var(--primary)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Mid-page CTA */}
        <FadeIn delay={0.3}>
          <div className="mx-auto mt-20 flex max-w-[720px] flex-wrap items-center justify-between gap-6 rounded-2xl border border-[var(--primary)]/20 bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[var(--primary)]">
                Pronto pra começar?
              </p>
              <p className="mt-2 text-[1.0625rem] font-semibold text-[var(--text-primary)]">
                Cadastre sua operação em 2 minutos.
              </p>
            </div>
            <Link
              href="/cadastro"
              className="group inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_16px_40px_rgba(46,139,62,.4)]"
            >
              Criar conta grátis
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
