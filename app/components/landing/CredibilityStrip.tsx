"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/app/components/ui/Motion";

const METRICS = [
  { label: "Cadeias integradas",      value: "5",    sub: "pecuária · grãos · aves · ovinos · fiscal" },
  { label: "Migrations no banco",     value: "104+", sub: "schema evolution auditável" },
  { label: "Módulos na plataforma",   value: "78",   sub: "passaporte ao balanço" },
  { label: "Cliente piloto em op.",   value: "1",    sub: "FSJBE · Jussara-GO" },
];

export default function CredibilityStrip() {
  return (
    <section className="relative border-y border-[var(--border)] bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(46,139,62,0.025) 50%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-10 lg:px-10 lg:py-12">
        <FadeIn>
          <p className="mb-8 font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--text-muted)]">
            Infraestrutura construída no open
          </p>
        </FadeIn>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m, i) => (
            <FadeIn key={m.label} delay={i * 0.06}>
              <div className="group relative">
                <div className="absolute -left-3 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--border)] to-transparent" />
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[var(--text-muted)]">
                  {m.label}
                </p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
                  className="mt-3 text-[2.4rem] font-semibold leading-none tracking-[-.035em] text-[var(--text-primary)]"
                >
                  {m.value}
                </motion.p>
                <p className="mt-2 text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
                  {m.sub}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Stack signature */}
        <FadeIn delay={0.4}>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border)] pt-6">
            <span className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--text-muted)]">
              Stack production-grade
            </span>
            {[
              "Next.js 16",
              "Supabase (PostgreSQL + RLS)",
              "Claude Sonnet 4.6 (IA preditiva)",
              "Stripe Connect",
              "React Native · Agraas Campo",
            ].map((tool) => (
              <span
                key={tool}
                className="font-mono text-[.6875rem] font-medium text-[var(--text-secondary)]"
              >
                {tool}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
