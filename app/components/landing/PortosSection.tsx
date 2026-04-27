"use client";

import { Anchor, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const PORTS = [
  { label: "Santos",     uf: "SP" },
  { label: "Paranaguá",  uf: "PR" },
  { label: "Rio Grande", uf: "RS" },
  { label: "Itaqui",     uf: "MA" },
];

const DESTINATIONS = [
  { city: "Oriente Médio",     country: "Jeddah · Dubai · Doha" },
  { city: "Europa",            country: "Rotterdam · Hamburgo" },
  { city: "Ásia",              country: "Xangai · Singapura" },
  { city: "América do Norte",  country: "Houston · Long Beach" },
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
        <div className="max-w-[860px]">
          <FadeIn>
            <h2 className="text-[clamp(2rem,5vw,3.6rem)] font-medium leading-[1.05] tracking-[-.025em] text-white">
              Construído para a cadeia exportadora. <span className="text-white/55">De qualquer porto brasileiro ao mundo.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mt-6 max-w-[680px] text-[1.0625rem] leading-[1.8] text-white/60">
              A plataforma foi pensada para acompanhar embarques de ponta a ponta — origem, certificações documentadas e checkpoints auditáveis. Para que, quando o produtor exportar, o comprador verifique a origem sem precisar confiar na palavra de ninguém.
            </p>
          </FadeIn>
        </div>

        {/* Rota visual: BR → MUNDO */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[.4fr_1fr] lg:items-stretch lg:gap-10">
          {/* Origem: portos BR */}
          <FadeIn delay={0.2}>
            <div className="rounded-3xl border border-white/[.08] bg-white/[.02] p-7 backdrop-blur-sm">
              <p className="text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                Origem · Brasil
              </p>
              <h3 className="mt-3 text-[1.25rem] font-medium text-white">
                Portos suportados
              </h3>
              <div className="mt-6 space-y-3">
                {PORTS.map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.03] px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15">
                      <Anchor size={16} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-[.9375rem] font-semibold text-white">
                        {p.label}
                      </p>
                      <p className="text-[.6875rem] text-white/45">{p.uf}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Linhas + destinos */}
          <div className="relative">
            {/* SVG com rotas animadas */}
            <svg
              className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
              viewBox="0 0 600 380"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              {[60, 130, 200, 270, 340].map((y, i) => (
                <motion.path
                  key={y}
                  d={`M 0 190 Q 250 ${190 - (y - 190) * 0.6} 600 ${y}`}
                  stroke="var(--primary)"
                  strokeWidth="1.4"
                  strokeOpacity="0.55"
                  strokeDasharray="4 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-15%" }}
                  transition={{ duration: 1.6, delay: 0.2 + i * 0.12, ease: [0.19, 1, 0.22, 1] }}
                />
              ))}
            </svg>

            <StaggerContainer
              className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:items-stretch"
              staggerChildren={0.08}
            >
              {DESTINATIONS.map((d) => (
                <StaggerItem key={d.city}>
                  <div className="group flex items-center gap-4 rounded-2xl border border-white/[.08] bg-white/[.03] px-5 py-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/[.06]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/15">
                      <MapPin size={18} className="text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[1rem] font-semibold text-white">
                        {d.city}
                      </p>
                      <p className="mt-0.5 text-[.8125rem] text-white/55">
                        {d.country}
                      </p>
                    </div>
                    <span className="ml-auto rounded-md border border-white/[.1] px-2 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.08em] text-white/55">
                      Rota mapeada
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
