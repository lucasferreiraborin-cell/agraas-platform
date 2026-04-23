"use client";

import dynamic from "next/dynamic";
import { Anchor, ShieldCheck, Globe2 } from "lucide-react";
import { FadeIn } from "@/app/components/ui/Motion";

// Dynamic import — three.js/globe.gl only loads when the section is rendered,
// keeping it out of the initial page bundle (~150kb saved from LCP budget).
const AnimatedGlobe = dynamic(() => import("./AnimatedGlobe"), {
  ssr: false,
  loading: () => <GlobeSkeleton />,
});

function GlobeSkeleton() {
  return (
    <div
      className="relative mx-auto animate-pulse"
      style={{ width: "100%", maxWidth: 640, aspectRatio: "1/1" }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(46,139,62,0.16) 0%, rgba(46,139,62,0.04) 40%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div className="absolute inset-[15%] rounded-full border border-white/[.06] bg-white/[.02]" />
    </div>
  );
}

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

const PORT_CARDS = [
  { label: "Santos",       uf: "SP", hint: "Maior porto do Brasil em contêineres e açúcar" },
  { label: "Paranaguá",    uf: "PR", hint: "Segundo maior em grãos — soja e milho do Sul" },
  { label: "Rio Grande",   uf: "RS", hint: "Hub da soja e arroz gaúcho, acesso direto ao Atlântico Sul" },
  { label: "Itaqui",       uf: "MA", hint: "Porta de saída do MATOPIBA para Ásia e Oriente Médio" },
];

export default function PortosSection() {
  return (
    <section className="relative overflow-hidden bg-[#050c06]">
      {/* Base grid + radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[.4]"
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
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(46,139,62,0.14) 0%, transparent 60%)",
        }}
      />
      {/* Starfield accent (subtle) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[.35]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.55), transparent 60%)," +
            "radial-gradient(1px 1px at 82% 22%, rgba(255,255,255,0.4), transparent 60%)," +
            "radial-gradient(1.5px 1.5px at 64% 74%, rgba(255,255,255,0.5), transparent 60%)," +
            "radial-gradient(1px 1px at 24% 78%, rgba(255,255,255,0.35), transparent 60%)," +
            "radial-gradient(1px 1px at 92% 58%, rgba(255,255,255,0.35), transparent 60%)," +
            "radial-gradient(1px 1px at 6% 48%, rgba(255,255,255,0.35), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 py-[clamp(7rem,14vw,12rem)] lg:px-10">
        {/* Heading */}
        <div className="mx-auto max-w-[900px] text-center">
          <FadeIn>
            <h2 className="text-[clamp(2rem,5vw,4rem)] font-medium leading-[1] tracking-[-.03em] text-white">
              Dos portos brasileiros <span className="text-white/55">para qualquer destino no mundo.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-6 max-w-[620px] text-[1.0625rem] leading-[1.75] text-white/55">
              Santos, Paranaguá, Rio Grande e Itaqui concentram o que o Brasil exporta de carne e grãos. A Agraas rastreia cada embarque desde o carregamento até a entrega — qualquer porto de destino no mundo.
            </p>
          </FadeIn>
        </div>

        {/* Globe */}
        <FadeIn delay={0.4}>
          <div className="relative mx-auto mt-20 flex justify-center">
            <AnimatedGlobe size={640} />
          </div>
        </FadeIn>

        {/* Port cards (grid of 4) */}
        <FadeIn delay={0.55}>
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORT_CARDS.map((p) => (
              <div
                key={p.label}
                className="group relative overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.03] p-5 backdrop-blur-sm transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/[.05]"
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(46,139,62,0.4) 0%, transparent 70%)",
                  }}
                />
                <div className="relative flex items-baseline justify-between gap-2">
                  <p className="text-[1.0625rem] font-semibold tracking-[-.01em] text-white">
                    {p.label}
                  </p>
                  <span className="font-mono text-[.6875rem] text-white/40">{p.uf}</span>
                </div>
                <p className="relative mt-2 text-[.75rem] leading-[1.6] text-white/50">
                  {p.hint}
                </p>
                <div className="relative mt-4 flex items-center gap-1.5 text-[.6875rem] font-medium text-[var(--primary)]/80">
                  <Anchor size={10} />
                  Rastreio ativo
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Feature highlights */}
        <div className="mt-24 grid gap-10 md:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <FadeIn key={h.title} delay={0.7 + i * 0.1}>
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
        <FadeIn delay={1}>
          <div className="mt-20 flex flex-wrap items-center justify-center gap-3">
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
                className="rounded-md border border-white/[.08] bg-white/[.04] px-3.5 py-1.5 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/60"
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
