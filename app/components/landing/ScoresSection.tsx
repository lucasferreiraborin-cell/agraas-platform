"use client";

import InteractiveScoreDemo from "@/app/components/landing/InteractiveScoreDemo";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";
import { QrCode, ShoppingBag, FileCheck, TrendingUp } from "lucide-react";

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
              Um <span className="text-[var(--primary)]">número só</span> para a cadeia inteira.
            </h2>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mt-6 max-w-[680px] text-[1.0625rem] leading-[1.8] text-white/65">
              Calculado automaticamente a cada evento. O mesmo número no passaporte público, no dashboard, no marketplace e nos relatórios de exportação. Uma linguagem única para toda a cadeia.
            </p>
          </FadeIn>
        </div>

        {/* Demo interativo do score */}
        <FadeIn delay={0.15}>
          <div className="mt-16">
            <InteractiveScoreDemo />
          </div>
        </FadeIn>

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
