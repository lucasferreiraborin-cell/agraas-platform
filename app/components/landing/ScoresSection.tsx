"use client";

import ScoreRing from "@/app/components/ui/ScoreRing";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";
import { motion } from "framer-motion";
import { QrCode, ShoppingBag, FileCheck, TrendingUp } from "lucide-react";

const DIMENSIONS = [
  {
    label: "Produtivo",
    weight: 28,
    description:
      "Ganho de peso diário (GMD), taxa de natalidade, eficiência reprodutiva e comparativo com média da raça e fase.",
  },
  {
    label: "Sanitário",
    weight: 24,
    description:
      "Vacinação em dia, carência MAPA respeitada, histórico sanitário completo e adesão ao calendário profilático.",
  },
  {
    label: "Continuidade",
    weight: 20,
    description:
      "Consistência operacional ao longo do tempo. Avalia gaps, interrupções e regularidade de eventos registrados.",
  },
  {
    label: "Operacional",
    weight: 18,
    description:
      "Qualidade dos dados, frequência de pesagens, tempo entre evento real e registro digital.",
  },
  {
    label: "Rastreabilidade",
    weight: 10,
    description:
      "Vínculo genealógico, GTA, origem e movimentações documentadas. Completude da cadeia de custódia.",
  },
];

const APPARITIONS = [
  {
    Icon: QrCode,
    title: "Passaporte público do animal",
    text: "QR code aberto que comprador institucional acessa sem cadastro. Mesmo número que você vê no painel.",
  },
  {
    Icon: ShoppingBag,
    title: "Anúncio no marketplace",
    text: "Exposto em cada listing como 'Score Agraas'. Filtro de busca permite score mínimo.",
  },
  {
    Icon: FileCheck,
    title: "Certificações e exportação",
    text: "Incluído em relatórios de auditoria, selos e documentos fiscais exportados.",
  },
  {
    Icon: TrendingUp,
    title: "Dashboard operacional",
    text: "Ranqueamento do rebanho, alertas quando o score cai, tendência histórica.",
  },
];

export default function ScoresSection() {
  return (
    <section className="relative overflow-hidden bg-[#050c06]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsla(0,0%,100%,.02) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.02) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 py-[clamp(6rem,12vw,10rem)] lg:px-10">
        {/* Headline + intro */}
        <div className="max-w-[860px]">
          <FadeIn>
            <h2 className="text-[clamp(2.2rem,5.2vw,3.8rem)] font-medium leading-[1.05] tracking-[-.025em] text-white">
              O Score que <span className="text-[var(--primary)]">nenhum concorrente</span> tem.
            </h2>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mt-6 max-w-[680px] text-[1.0625rem] leading-[1.8] text-white/65">
              Calculado automaticamente a cada evento. O mesmo número no passaporte público, no dashboard, no marketplace e nos relatórios de exportação. Uma linguagem única para toda a cadeia.
            </p>
          </FadeIn>
        </div>

        {/* Big demo + dimensions grid */}
        <div className="mt-16 grid gap-14 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          {/* Big demo ring */}
          <FadeIn delay={0.15}>
            <div className="relative flex flex-col items-center rounded-3xl border border-white/[.08] bg-white/[.02] p-10 backdrop-blur-sm">
              <p className="text-[.8125rem] font-medium text-white/55">
                Exemplo · animal de cria com operação regular
              </p>
              <div className="mt-8">
                <ScoreRing
                  score={78}
                  size="lg"
                  variant="dark"
                />
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[.6875rem]">
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                  ≥ 70 · Premium
                </span>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-400">
                  50 – 69 · Padrão
                </span>
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-semibold text-red-400">
                  &lt; 50 · Revisar
                </span>
              </div>
              <p className="mt-6 max-w-[320px] text-center text-[.75rem] leading-[1.7] text-white/45">
                Cores e faixas idênticas no passaporte público, dashboard logado e marketplace. Uma linguagem só pra toda a cadeia.
              </p>
            </div>
          </FadeIn>

          {/* 5 dimensions list with animated bars */}
          <div>
            <FadeIn>
              <p className="text-[.8125rem] font-semibold uppercase tracking-[.1em] text-[var(--primary)]">
                5 dimensões que compõem o score
              </p>
              <h3 className="mt-3 text-[1.5rem] font-medium leading-[1.25] text-white">
                Cada evento recalcula. Cada recálculo é auditável.
              </h3>
            </FadeIn>

            <StaggerContainer className="mt-8 space-y-3" staggerChildren={0.07}>
              {DIMENSIONS.map((d, i) => (
                <StaggerItem key={d.label}>
                  <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[.9375rem] font-semibold text-white">{d.label}</p>
                      <span className="font-mono text-[.8125rem] font-semibold text-[var(--primary)]">
                        {d.weight}% do score
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.weight * 3.3}%` }}
                        viewport={{ once: true, margin: "-15%" }}
                        transition={{ duration: 1.1, delay: 0.15 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
                        className="h-full rounded-full bg-[var(--primary)]"
                      />
                    </div>
                    <p className="mt-3 text-[.8125rem] leading-[1.65] text-white/55">
                      {d.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeIn delay={0.4}>
              <p className="mt-8 rounded-xl border border-white/[.08] bg-white/[.03] p-5 text-[.9375rem] leading-[1.7] text-white/70">
                Cada evento recalcula. Cada recálculo é auditável. Nenhuma nota pode ser manipulada retroativamente.
              </p>
            </FadeIn>
          </div>
        </div>

        {/* Where the score appears */}
        <div className="mt-24">
          <FadeIn>
            <h3 className="text-[1.5rem] font-medium text-white md:text-[1.875rem]">
              Onde o score aparece
            </h3>
            <p className="mt-3 max-w-[680px] text-[.9375rem] leading-[1.7] text-white/55">
              Consistência total entre quem produz e quem compra. O mesmo número acompanha o animal ou o talhão em toda interação externa.
            </p>
          </FadeIn>

          <StaggerContainer className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4" staggerChildren={0.06}>
            {APPARITIONS.map((a) => (
              <StaggerItem key={a.title}>
                <div className="flex h-full flex-col rounded-2xl border border-white/[.08] bg-white/[.04] p-7 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/[.06]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
                    <a.Icon size={22} className="text-[var(--primary)]" />
                  </div>
                  <p className="mt-5 text-[1rem] font-semibold text-white">
                    {a.title}
                  </p>
                  <p className="mt-2.5 text-[.875rem] leading-[1.7] text-white/55">
                    {a.text}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
