"use client";

import { motion } from "framer-motion";
import { QrCode, ShieldCheck, Calendar, MapPin, Tag } from "lucide-react";
import ScoreRing from "@/app/components/ui/ScoreRing";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

const BREAKDOWN = [
  { label: "Produtivo",       weight: 28 },
  { label: "Sanitário",       weight: 24 },
  { label: "Continuidade",    weight: 20 },
  { label: "Operacional",     weight: 18 },
  { label: "Rastreabilidade", weight: 10 },
];

const EVENTS = [
  { label: "Pesagem registrada",        date: "Hoje · 06:42" },
  { label: "Vacinação Aftosa",          date: "4 dias atrás" },
  { label: "Movimentação entre pastos", date: "12 dias atrás" },
];

export default function PassportPreviewVisual() {
  return (
    <div className="relative flex h-full items-center justify-center p-8 lg:p-12">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(46,139,62,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Main passport card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
        className="relative z-10 w-full max-w-[420px] rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(30,42,27,0.12)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
              Passaporte Agraas
            </p>
            <p className="mt-1 font-mono text-[.9375rem] font-semibold text-[var(--text-primary)]">
              AGR-SAU-00123
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-1.5">
            <QrCode size={24} className="text-[var(--text-primary)]" />
          </div>
        </div>

        {/* Animal identity */}
        <div className="mt-5 rounded-2xl bg-[var(--surface-soft)] p-4">
          <div className="flex items-center gap-2 text-[.75rem] text-[var(--text-muted)]">
            <Tag size={11} />
            <span>Nelore PO · Fêmea · 420 kg</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[.75rem] text-[var(--text-muted)]">
            <MapPin size={11} />
            <span>Fazenda São João · Jussara-GO</span>
          </div>
        </div>

        {/* ScoreRing */}
        <div className="mt-6 flex items-center gap-6">
          <ScoreRing score={78} size="sm" variant="light" breakdown={BREAKDOWN} />
        </div>

        {/* Certifications */}
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <p className="text-[.6875rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
            Certificações ativas
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-semibold text-[var(--primary)]">
              <ShieldCheck size={11} /> MAPA
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-semibold text-[var(--primary)]">
              <ShieldCheck size={11} /> GTA
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-semibold text-[var(--primary)]">
              <HalalBadgeSVG size={11} /> Halal
            </span>
          </div>
        </div>

        {/* Recent events */}
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <p className="text-[.6875rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
            Eventos recentes
          </p>
          <ul className="mt-3 space-y-2">
            {EVENTS.map((e) => (
              <li key={e.label} className="flex items-center justify-between text-[.75rem]">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar size={11} className="text-[var(--primary)]" />
                  {e.label}
                </span>
                <span className="text-[var(--text-muted)]">{e.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Floating mini badge — pulsing confidence signal */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: -10 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
        className="absolute right-2 top-10 z-20 hidden rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-[0_14px_40px_rgba(30,42,27,0.1)] sm:flex sm:items-center sm:gap-3 lg:right-4 lg:top-16"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
          <ShieldCheck size={17} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="text-[.75rem] font-semibold text-[var(--text-primary)]">
            Origem verificada
          </p>
          <p className="text-[.6875rem] text-[var(--text-muted)]">
            Passaporte público por QR
          </p>
        </div>
      </motion.div>
    </div>
  );
}
