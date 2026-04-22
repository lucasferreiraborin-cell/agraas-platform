"use client";

import { motion } from "framer-motion";
import { Anchor, Ship } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const PORTOS_BR = [
  { city: "Santos",       uf: "SP", hint: "Maior porto do Brasil" },
  { city: "Paranaguá",    uf: "PR", hint: "2º maior em grãos" },
  { city: "Rio Grande",   uf: "RS", hint: "Hub da soja sul" },
  { city: "Itaqui",       uf: "MA", hint: "Porta do MATOPIBA" },
];

const DESTINOS = [
  { city: "Jeddah",     country: "Arábia Saudita",   flag: "🇸🇦", hint: "Foco PIF" },
  { city: "Doha",       country: "Qatar",            flag: "🇶🇦", hint: "Golfo" },
  { city: "Dubai",      country: "Emirados Árabes",  flag: "🇦🇪", hint: "EAU" },
  { city: "Xangai",     country: "China",            flag: "🇨🇳", hint: "Maior comprador de soja" },
  { city: "Rotterdam",  country: "Países Baixos",    flag: "🇳🇱", hint: "Maior porto europeu" },
  { city: "Hamburgo",   country: "Alemanha",         flag: "🇩🇪", hint: "UE EUDR" },
];

export default function PortosSection() {
  return (
    <section className="relative overflow-hidden bg-[#071a0e]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[.5]"
        style={{
          backgroundImage:
            "linear-gradient(hsla(0,0%,100%,.03) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.03) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(46,139,62,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-[clamp(6rem,12vw,10rem)] lg:px-10">
        <div className="mb-20 max-w-[820px]">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Portos brasileiros → o mundo
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h2 className="mt-5 text-[clamp(2rem,5.2vw,4rem)] font-medium leading-[.98] tracking-[-.03em] text-white">
              De Santos, Paranaguá, Rio Grande e Itaqui<br />
              <span className="text-[var(--primary)]">até Jeddah, Xangai e Rotterdam.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mt-6 max-w-[520px] text-[1rem] leading-[1.8] text-white/40">
              Cada embarque rastreado com checkpoints, certificações e passaporte digital verificável por QR code. Da lavoura ao porto, do porto ao comprador institucional.
            </p>
          </FadeIn>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(240px,1fr)_minmax(320px,1.4fr)_minmax(240px,1fr)] lg:items-center">
          {/* ─── ORIGEM ───────────────────────────────────────── */}
          <StaggerContainer className="space-y-3">
            <FadeIn>
              <div className="mb-4 flex items-center gap-2 text-white/50">
                <Anchor size={14} />
                <span className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em]">
                  Origem
                </span>
              </div>
            </FadeIn>
            {PORTOS_BR.map((p) => (
              <StaggerItem key={p.city} direction="right" distance={20}>
                <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-4 backdrop-blur-sm transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/[.06]">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[.9375rem] font-medium text-white">
                      {p.city}
                    </p>
                    <span className="font-mono text-[.6875rem] text-white/40">
                      {p.uf}
                    </span>
                  </div>
                  <p className="mt-1 text-[.75rem] text-white/40">{p.hint}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* ─── CONEXÕES ─────────────────────────────────────── */}
          <div className="flex min-h-[360px] items-center justify-center py-8 lg:py-0">
            <ConnectionsSVG />
          </div>

          {/* ─── DESTINO ──────────────────────────────────────── */}
          <StaggerContainer className="space-y-3" staggerChildren={0.07}>
            <FadeIn>
              <div className="mb-4 flex items-center gap-2 text-white/50">
                <Ship size={14} />
                <span className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em]">
                  Destino
                </span>
              </div>
            </FadeIn>
            {DESTINOS.map((d) => (
              <StaggerItem key={d.city} direction="left" distance={20}>
                <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-4 backdrop-blur-sm transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/[.06]">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[.9375rem] font-medium text-white">
                      <span className="mr-1.5">{d.flag}</span>
                      {d.city}
                    </p>
                    <span className="font-mono text-[.6875rem] text-white/40">
                      {d.hint}
                    </span>
                  </div>
                  <p className="mt-1 text-[.75rem] text-white/40">
                    {d.country}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        <FadeIn delay={0.4}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
            {["Halal certificado", "SIF aprovado", "MAPA verificado", "EUDR ready", "QR público"].map(
              (b) => (
                <span
                  key={b}
                  className="rounded-md border border-white/[.08] bg-white/[.04] px-3 py-1.5 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/60"
                >
                  {b}
                </span>
              ),
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function ConnectionsSVG() {
  const points = [
    { x: 10, y: 15, target: 0 },
    { x: 10, y: 38, target: 2 },
    { x: 10, y: 62, target: 3 },
    { x: 10, y: 85, target: 5 },
  ];
  const destinations = [
    { x: 90, y: 10 },
    { x: 90, y: 26 },
    { x: 90, y: 42 },
    { x: 90, y: 58 },
    { x: 90, y: 74 },
    { x: 90, y: 90 },
  ];

  return (
    <svg viewBox="0 0 100 100" className="h-[360px] w-full">
      <defs>
        <linearGradient id="flow-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E8B3E" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#2E8B3E" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2E8B3E" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2E8B3E" stopOpacity="1" />
          <stop offset="100%" stopColor="#2E8B3E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Every origin connects to every destination for lattice feel, but fade by distance */}
      {points.map((p, i) =>
        destinations.map((d, j) => {
          const midX = (p.x + d.x) / 2;
          const midY = (p.y + d.y) / 2 + (i - j) * 2;
          const path = `M ${p.x} ${p.y} Q ${midX} ${midY} ${d.x} ${d.y}`;
          return (
            <motion.path
              key={`${i}-${j}`}
              d={path}
              fill="none"
              stroke="url(#flow-line)"
              strokeWidth="0.3"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.7 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{
                duration: 2,
                delay: 0.1 + (i * 6 + j) * 0.04,
                ease: [0.19, 1, 0.22, 1],
              }}
            />
          );
        }),
      )}

      {/* Origin dots */}
      {points.map((p, i) => (
        <motion.g
          key={`o-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
        >
          <circle cx={p.x} cy={p.y} r="3" fill="url(#dot-glow)" opacity="0.5" />
          <circle cx={p.x} cy={p.y} r="1.2" fill="#2E8B3E" />
        </motion.g>
      ))}

      {/* Destination dots */}
      {destinations.map((d, j) => (
        <motion.g
          key={`d-${j}`}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 + j * 0.06 }}
        >
          <circle cx={d.x} cy={d.y} r="3" fill="url(#dot-glow)" opacity="0.5" />
          <circle cx={d.x} cy={d.y} r="1.2" fill="#2E8B3E" />
        </motion.g>
      ))}
    </svg>
  );
}
