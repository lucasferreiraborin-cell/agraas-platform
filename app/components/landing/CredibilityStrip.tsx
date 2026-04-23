"use client";

import { FadeIn } from "@/app/components/ui/Motion";

const METRICS = [
  { value: "5",    label: "cadeias produtivas integradas", sub: "pecuária, grãos, aves, ovinos e fiscal" },
  { value: "78",   label: "módulos operacionais",          sub: "do passaporte ao balanço patrimonial" },
  { value: "Jussara-GO", label: "piloto ativo",            sub: "Fazenda São João da Boa Esperança" },
];

export default function CredibilityStrip() {
  return (
    <section className="border-y border-[var(--border)] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {METRICS.map((m, i) => (
            <FadeIn key={m.label} delay={i * 0.08}>
              <div>
                <p className="text-[2.2rem] font-semibold leading-none tracking-[-.025em] text-[var(--text-primary)]">
                  {m.value}
                </p>
                <p className="mt-3 text-[.9375rem] font-medium leading-[1.4] text-[var(--text-primary)]">
                  {m.label}
                </p>
                <p className="mt-1.5 text-[.8125rem] leading-[1.6] text-[var(--text-muted)]">
                  {m.sub}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
