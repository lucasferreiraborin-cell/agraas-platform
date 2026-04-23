"use client";

import Link from "next/link";
import { ArrowRight, ScanLine, Activity, Ship } from "lucide-react";
import { FadeIn } from "@/app/components/ui/Motion";

const STEPS = [
  {
    Icon: ScanLine,
    title: "Identifique uma vez",
    text: "Cada animal nasce ou entra na propriedade com ID único, GPS, genealogia e certificações iniciais. Cada talhão ganha polígono georreferenciado com CAR. O passaporte digital começa aqui.",
    tags: ["RFID bolus", "GPS do talhão", "CAR verificado"],
  },
  {
    Icon: Activity,
    title: "Opere no automático",
    text: "Pesagens, aplicações sanitárias, movimentações, colheitas e notas de insumos são registradas em segundos. O Score recalcula sozinho, o estoque debita sozinho, o custo acumula sozinho.",
    tags: ["Score automático", "Estoque ligado", "Custo por animal"],
  },
  {
    Icon: Ship,
    title: "Venda com rastreio",
    text: "Anuncie no marketplace com score e certificações automáticos. Feche a venda com NF-e gerada. Embarque via porto brasileiro com rastreio em 7 checkpoints — e o comprador final verifica origem pelo QR público.",
    tags: ["Marketplace integrado", "NF-e automática", "QR público"],
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-[var(--bg)]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="max-w-[760px]">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Como funciona na prática
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-5 max-w-[580px] text-[1rem] leading-[1.75] text-[var(--text-secondary)]">
              Configurar leva minutos. Operar vira rotina automática. Vender com rastreabilidade se torna o padrão.
            </p>
          </FadeIn>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white p-7 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--primary)]/25">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                  <step.Icon size={20} className="text-[var(--primary)]" />
                </div>
                <h3 className="mt-5 text-[1.125rem] font-semibold leading-[1.3] text-[var(--text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-[.9375rem] leading-[1.75] text-[var(--text-muted)]">
                  {step.text}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {step.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-[.75rem] font-medium text-[var(--text-secondary)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <div className="mt-14 flex flex-wrap items-center gap-4">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[.9375rem] font-semibold text-white shadow-[0_10px_30px_rgba(46,139,62,.2)] transition-all hover:bg-[var(--primary-hover)]"
            >
              Criar conta grátis
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/planos"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-white px-6 py-3 text-[.9375rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
            >
              Ver planos
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
