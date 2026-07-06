"use client";

import Image from "next/image";
import { FadeIn } from "@/app/components/ui/Motion";

const PORTS = [
  { label: "Santos",     uf: "SP" },
  { label: "Paranaguá",  uf: "PR" },
  { label: "Rio Grande", uf: "RS" },
  { label: "Itaqui",     uf: "MA" },
];

const DESTINATIONS = [
  { region: "Oriente Médio",    hubs: "Dubai · Doha" },
  { region: "Europa",           hubs: "Rotterdam · Hamburgo" },
  { region: "Ásia",             hubs: "Xangai · Singapura" },
  { region: "América do Norte", hubs: "Houston · Long Beach" },
];

export default function PortosSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/lp/Maquina-agricola-colheita.jpg"
        alt=""
        fill
        loading="lazy"
        sizes="100vw"
        quality={85}
        className="absolute inset-0 -z-10 object-cover"
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,53,23,.94) 0%, rgba(15,53,23,.78) 55%, rgba(15,53,23,.95) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-[820px]">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-[var(--primary-soft)]">
              Cadeia exportadora
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.6rem)] font-medium leading-[1.05] tracking-[-.025em] text-white">
              Do produtor brasileiro{" "}
              <span className="text-white/55">ao comprador no outro lado do mundo.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-7 max-w-[640px] text-[1.0625rem] leading-[1.8] text-white/65">
              A plataforma foi pensada para acompanhar embarques de ponta a ponta — origem, certificações documentadas e checkpoints auditáveis. Para que, quando o produtor exportar, o comprador verifique a origem sem precisar confiar na palavra de ninguém.
            </p>
          </FadeIn>
        </div>

        <div className="mt-20 grid gap-14 border-t border-white/15 pt-14 lg:grid-cols-[auto_1fr] lg:gap-24">
          <FadeIn delay={0.25}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--primary-soft)]">
                Origem · Brasil
              </p>
              <ul className="mt-7 space-y-4">
                {PORTS.map((p) => (
                  <li key={p.label} className="flex items-baseline gap-3">
                    <span className="text-[1.5rem] font-medium leading-none text-white">
                      {p.label}
                    </span>
                    <span className="text-[.8125rem] tracking-[.1em] text-white/45">
                      {p.uf}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.35}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--primary-soft)]">
                Destino · Mundo
              </p>
              <div className="mt-7 grid gap-x-12 gap-y-8 sm:grid-cols-2">
                {DESTINATIONS.map((d) => (
                  <div key={d.region} className="border-l border-white/15 pl-5">
                    <p className="text-[1.25rem] font-medium leading-tight text-white">
                      {d.region}
                    </p>
                    <p className="mt-2 text-[.8125rem] leading-[1.55] text-white/55">
                      {d.hubs}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
