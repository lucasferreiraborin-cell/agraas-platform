"use client";

/**
 * Preview do passaporte público na landing — torna tangível o "passaporte
 * digital verificável sem cadastro" que a LP cita. Card de EXEMPLO (não é
 * animal real; sem claim de Halal/export), com a mesma linguagem visual do
 * passaporte público real: ScoreRing, identidade, timeline de eventos e QR.
 */

import ScoreRing from "@/app/components/ui/ScoreRing";
import { FadeIn } from "@/app/components/ui/Motion";
import {
  QrCode,
  Sprout,
  Tag,
  Scale,
  Syringe,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";

const EVENTS = [
  { Icon: Sprout, label: "Nascimento", date: "12/03/2024", meta: "Cria própria" },
  { Icon: Tag, label: "RFID vinculado", date: "20/03/2024", meta: "ISO 11784/11785" },
  { Icon: Scale, label: "Pesagem", date: "18/07/2026", meta: "412 kg · GMD 0,84" },
  { Icon: Syringe, label: "Vacinação", date: "02/08/2026", meta: "Aftosa · carência ok" },
];

export default function PassportPreview() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_.9fr] lg:gap-20">
          {/* Texto */}
          <div className="max-w-[520px]">
            <FadeIn>
              <p className="text-[.75rem] font-semibold uppercase tracking-[.22em] text-[var(--primary)]">
                Passaporte público
              </p>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h2 className="mt-5 text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.08] tracking-[-.02em] text-[var(--text-primary)] [text-wrap:balance]">
                O que o comprador vê antes do aperto de mão.
              </h2>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="mt-6 text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
                Cada animal carrega um passaporte digital com QR aberto. O comprador
                institucional confere score, origem, sanidade e histórico completo —
                sem cadastro, sem confiar na palavra do vendedor. O mesmo número que
                o produtor vê no painel.
              </p>
            </FadeIn>
            <FadeIn delay={0.24}>
              <ul className="mt-8 space-y-3">
                {[
                  "QR verificável por qualquer comprador, sem login",
                  "Histórico imutável — nenhum evento reescrito retroativamente",
                  "Score, sanidade e origem na mesma tela",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[.9375rem] leading-[1.6] text-[var(--text-secondary)]">
                    <BadgeCheck size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    {t}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>

          {/* Card do passaporte */}
          <FadeIn delay={0.2}>
            <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-soft)] px-6 py-4">
                <div>
                  <p className="text-[.625rem] font-semibold uppercase tracking-[.2em] text-[var(--text-muted)]">
                    Passaporte digital · Agraas
                  </p>
                  <p className="mt-1 font-mono text-[.9375rem] font-semibold text-[var(--text-primary)]">
                    BRV-2026-0007
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white">
                  <QrCode size={24} className="text-[var(--text-primary)]" />
                </div>
              </div>

              {/* Score + identidade */}
              <div className="flex items-center gap-6 px-6 py-6">
                <ScoreRing score={78} size="sm" variant="light" animate={false} />
                <div className="min-w-0">
                  <p className="text-[1.0625rem] font-semibold text-[var(--text-primary)]">
                    Nelore · Recria
                  </p>
                  <p className="mt-1 text-[.8125rem] text-[var(--text-muted)]">
                    Fazenda Santa Cruz · Jandaia-GO
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2 py-0.5 text-[.625rem] font-semibold text-[var(--primary)]">
                      <ShieldCheck size={11} /> GTA
                    </span>
                    <span className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-[.625rem] font-semibold text-[var(--text-secondary)]">
                      Origem verificada
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t border-[var(--border)] px-6 py-5">
                <p className="text-[.625rem] font-semibold uppercase tracking-[.16em] text-[var(--text-muted)]">
                  Histórico verificável
                </p>
                <ul className="mt-4 space-y-3.5">
                  {EVENTS.map((e) => (
                    <li key={e.label} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)]">
                        <e.Icon size={15} className="text-[var(--primary)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[.8125rem] font-medium text-[var(--text-primary)]">
                          {e.label}
                        </p>
                        <p className="text-[.6875rem] text-[var(--text-muted)]">{e.meta}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[.6875rem] text-[var(--text-muted)]">
                        {e.date}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border)] bg-[var(--surface-soft)] px-6 py-3 text-center">
                <p className="text-[.6875rem] text-[var(--text-muted)]">
                  Exemplo · verificável em <span className="font-medium text-[var(--text-secondary)]">agraas.com.br/passaporte</span> — sem cadastro
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
