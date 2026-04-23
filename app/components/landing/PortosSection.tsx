"use client";

import { Anchor, ShieldCheck, Globe2 } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const HIGHLIGHTS = [
  {
    Icon: Anchor,
    title: "4 portos, toda a logística brasileira",
    text: "Santos, Paranaguá, Rio Grande e Itaqui — cobertura do sul ao MATOPIBA.",
  },
  {
    Icon: Globe2,
    title: "Destino livre, rastreio constante",
    text: "Cada embarque gera QR público com origem, certificações e checkpoints — seu comprador acessa de qualquer lugar do mundo.",
  },
  {
    Icon: ShieldCheck,
    title: "Conformidade verificada em cada etapa",
    text: "Halal, SIF, MAPA, EUDR — selos ativos com validade monitorada em tempo real.",
  },
];

const PORTS = [
  {
    label: "Santos",
    uf: "SP",
    hint: "Maior porto do Brasil em contêineres e açúcar",
    volume: "150 Mt/ano",
  },
  {
    label: "Paranaguá",
    uf: "PR",
    hint: "Segundo maior em grãos — soja e milho do Sul",
    volume: "58 Mt/ano",
  },
  {
    label: "Rio Grande",
    uf: "RS",
    hint: "Hub da soja e arroz gaúcho, acesso direto ao Atlântico Sul",
    volume: "43 Mt/ano",
  },
  {
    label: "Itaqui",
    uf: "MA",
    hint: "Porta de saída do MATOPIBA para Ásia e Oriente Médio",
    volume: "32 Mt/ano",
  },
];

export default function PortosSection() {
  return (
    <section className="relative overflow-hidden bg-[#050c06]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsla(0,0%,100%,.025) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.025) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(46,139,62,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 py-[clamp(6rem,12vw,10rem)] lg:px-10">
        <div className="max-w-[820px]">
          <FadeIn>
            <h2 className="text-[clamp(2rem,5vw,4rem)] font-medium leading-[1] tracking-[-.03em] text-white">
              Dos portos brasileiros <span className="text-white/55">para qualquer destino no mundo.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mt-6 max-w-[620px] text-[1.0625rem] leading-[1.75] text-white/55">
              Santos, Paranaguá, Rio Grande e Itaqui concentram o que o Brasil exporta de carne e grãos. A Agraas rastreia cada embarque desde o carregamento até a entrega — qualquer porto de destino no mundo.
            </p>
          </FadeIn>
        </div>

        {/* Port cards — grid maior, cada porto como protagonista */}
        <StaggerContainer
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          staggerChildren={0.08}
        >
          {PORTS.map((p) => (
            <StaggerItem key={p.label}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.03] p-7 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/[.05]">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[1.5rem] font-semibold leading-none tracking-[-.02em] text-white">
                      {p.label}
                    </p>
                    <p className="mt-2 text-[.8125rem] font-medium text-white/50">
                      {p.uf}
                    </p>
                  </div>
                  <Anchor size={18} className="text-[var(--primary)]/70" />
                </div>
                <p className="mt-6 text-[.875rem] leading-[1.6] text-white/60">
                  {p.hint}
                </p>
                <div className="mt-6 border-t border-white/[.06] pt-4">
                  <p className="text-[.6875rem] text-white/40">Movimentação</p>
                  <p className="mt-1 text-[.9375rem] font-semibold text-white">
                    {p.volume}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Feature highlights */}
        <div className="mt-20 grid gap-10 md:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <FadeIn key={h.title} delay={0.3 + i * 0.08}>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.03]">
                  <h.Icon size={18} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-[.9375rem] font-semibold leading-[1.3] text-white">
                    {h.title}
                  </p>
                  <p className="mt-2 text-[.8125rem] leading-[1.7] text-white/50">
                    {h.text}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Conformity bar */}
        <FadeIn delay={0.5}>
          <div className="mt-16 flex flex-wrap items-center gap-3">
            {[
              "Halal certificado",
              "SIF aprovado",
              "MAPA verificado",
              "EUDR ready",
              "QR público por lote",
              "Checkpoints auditáveis",
            ].map((b) => (
              <span
                key={b}
                className="rounded-md border border-white/[.08] bg-white/[.04] px-3.5 py-1.5 text-[.75rem] font-medium text-white/60"
              >
                {b}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
