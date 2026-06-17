"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Circle, MapPin, ArrowUpRight } from "lucide-react";
import type { Listing } from "./MarketplaceTabs";

// Activity exemplo apenas com produtos bovinos (foco da plataforma desde mig 106).
// Quando há ≥ 3 listings reais, este array nem é usado — ver lógica em items abaixo.
// Removidos: Soja, Milho, Trator (cadeias agrícolas pausadas — não geram listings reais).
const SEEDED_ACTIVITY = [
  { where: "Campo Grande, MS", what: "Nelore PO · 120 cabeças · 420 kg média",   minsAgo: 8  },
  { where: "Rio Verde, GO",    what: "Brincos RFID bovinos · 2.000 unidades",    minsAgo: 14 },
  { where: "Cascavel, PR",     what: "Ração de confinamento premium · 30 t",     minsAgo: 22 },
  { where: "Passo Fundo, RS",  what: "Vacina aftosa · 2.000 doses",              minsAgo: 31 },
  { where: "Uberaba, MG",      what: "Touro Nelore PO · reprodutor",             minsAgo: 44 },
  { where: "Dourados, MS",     what: "Suplemento mineral · 50 sacos",            minsAgo: 58 },
];

function humanTime(mins: number): string {
  if (mins < 1) return "agora";
  if (mins === 1) return "há 1 min";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h === 1) return "há 1 hora";
  if (h < 24) return `há ${h} horas`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

export default function ActivityTicker({ listings }: { listings: Listing[] }) {
  // Take up to 5 real listings, fall back to seeded ones to show breadth
  const items = useMemo(() => {
    const now = Date.now();
    const real = (listings ?? []).slice(0, 5).map((l) => {
      const createdAt = new Date(l.created_at).getTime();
      const mins = Math.max(1, Math.round((now - createdAt) / 60000));
      const where =
        l.location_city && l.location_state
          ? `${l.location_city}, ${l.location_state}`
          : "Brasil";
      return {
        id: l.id,
        where,
        what: l.title,
        time: humanTime(mins),
      };
    });
    if (real.length >= 3) return real;

    const seeded = SEEDED_ACTIVITY.map((s, i) => ({
      id: `seed-${i}`,
      where: s.where,
      what: s.what,
      time: humanTime(s.minsAgo),
    }));
    // mix real with seeded so it feels alive without pretending scale
    return [...real, ...seeded].slice(0, 7);
  }, [listings]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(
      () => setIdx((v) => (v + 1) % items.length),
      3000,
    );
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const current = items[idx];

  return (
    <div className="relative border-y border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-3.5 lg:px-10">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[.8125rem] font-semibold text-[var(--text-primary)]">
            Últimos anúncios
          </span>
        </div>

        <div className="hidden h-4 w-px bg-[var(--border)] md:block" />

        <div className="relative h-[1.5em] min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
              className="absolute inset-0 flex items-center gap-3 overflow-hidden whitespace-nowrap"
            >
              <span className="truncate text-[.8125rem] font-medium text-[var(--text-primary)]">
                {current.what}
              </span>
              <span className="hidden items-center gap-1 text-[.75rem] text-[var(--text-muted)] sm:inline-flex">
                <Circle size={3} className="fill-current" />
                <MapPin size={11} />
                {current.where}
              </span>
              <span className="hidden text-[.75rem] text-[var(--text-muted)] md:inline">
                <Circle size={3} className="mr-1 inline fill-current" />
                {current.time}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <Link
          href="#catalogo"
          className="hidden shrink-0 items-center gap-1 text-[.75rem] font-semibold text-[var(--primary)] hover:underline md:inline-flex"
        >
          Ver catálogo
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}
