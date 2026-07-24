"use client";

import Link from "next/link";
import { ArrowRight, Fingerprint, ActivitySquare, Globe } from "lucide-react";
import { FadeIn } from "@/app/components/ui/Motion";

const STEPS = [
  {
    Icon: Fingerprint,
    title: "Identidade desde o primeiro dia",
    text: "Cada animal nasce com um ID Agraas único. Cada talhão ganha um polígono georreferenciado com CAR verificado. A rastreabilidade começa antes da primeira pesagem — e nunca para. O produtor sabe exatamente o que tem, onde está e o que vale.",
    tags: ["RFID bolus", "GPS talhão", "CAR verificado", "ID único vitalício"],
  },
  {
    Icon: ActivitySquare,
    title: "Operação que vira dado automático",
    text: "Pesagens, vacinações, movimentações, colheitas, notas fiscais de insumos — tudo registrado em segundos pelo produtor ou pelo peão no campo, via app mobile. O Score recalcula sozinho. O estoque debita sozinho. O custo acumula sozinho. O contador tem o DRE pronto sem precisar pedir.",
    tags: ["Score automático", "Estoque ligado", "Custo por animal", "DRE em tempo real"],
  },
  {
    Icon: Globe,
    title: "Venda com rastreio, chegue ao mundo",
    text: "Animais anunciados no marketplace com score e documentos atrelados. Venda fechada com NF-e gerada. Embarque preparado para rastreio em checkpoints auditáveis. O comprador institucional verifica a origem pelo QR público — sem precisar de intermediário, sem precisar confiar na palavra de ninguém.",
    tags: ["Marketplace integrado", "NF-e automática", "QR público", "Checkpoints auditáveis"],
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-[var(--bg)]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="max-w-[820px]">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              A Agraas está em toda a cadeia.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 max-w-[680px] text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
              Do nascimento do animal ao comprador no outro lado do mundo — cada etapa da cadeia produtiva brasileira conectada, verificada e auditável.
            </p>
          </FadeIn>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white p-7 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--primary)]/25">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                  <step.Icon size={22} className="text-[var(--primary)]" />
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
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--primary)] bg-white px-6 py-3 text-[.9375rem] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
            >
              Ver planos
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
