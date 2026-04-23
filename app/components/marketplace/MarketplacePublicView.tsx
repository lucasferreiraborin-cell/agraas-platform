"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Package,
  Tag,
  Truck,
  MapPin,
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  Wheat,
  Droplets,
  Syringe,
  Leaf,
  HardHat,
  Radio,
  Sprout,
  Wrench,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  CounterAnimation,
} from "@/app/components/ui/Motion";
import type { Listing } from "./MarketplaceTabs";
import ActivityTicker from "./ActivityTicker";

const TYPE_META: Record<
  string,
  { icon: typeof Package; label: string; color: string; bg: string }
> = {
  animal:      { icon: Tag,         label: "Animal",      color: "text-emerald-700", bg: "bg-emerald-50" },
  safra:       { icon: Wheat,       label: "Safra",       color: "text-amber-700",   bg: "bg-amber-50"   },
  insumo:      { icon: ShoppingBag, label: "Insumo",      color: "text-blue-700",    bg: "bg-blue-50"    },
  maquinario:  { icon: Truck,       label: "Maquinário",  color: "text-purple-700",  bg: "bg-purple-50"  },
  equipamento: { icon: Truck,       label: "Equipamento", color: "text-indigo-700",  bg: "bg-indigo-50"  },
  epi:         { icon: ShoppingBag, label: "EPI",         color: "text-teal-700",    bg: "bg-teal-50"    },
  outro:       { icon: Package,     label: "Outro",       color: "text-gray-700",    bg: "bg-gray-50"    },
};

// Rich categories showcasing marketplace breadth — Mercado Livre do Agro
const CATEGORIES = [
  { Icon: Tag,       label: "Animais",           examples: "Nelore, ovinos, aves, reprodutores",    color: "text-emerald-700", bg: "bg-emerald-50" },
  { Icon: Wheat,     label: "Safras & grãos",    examples: "Soja, milho, café, cana, trigo",        color: "text-amber-700",   bg: "bg-amber-50" },
  { Icon: Droplets,  label: "Defensivos",        examples: "Herbicidas, fungicidas, inseticidas",   color: "text-blue-700",    bg: "bg-blue-50" },
  { Icon: Sprout,    label: "Sementes & mudas",  examples: "Híbridas, convencionais, viveiros",     color: "text-lime-700",    bg: "bg-lime-50" },
  { Icon: Leaf,      label: "Ração & nutrição",  examples: "Confinamento, mineral, creep",          color: "text-green-700",   bg: "bg-green-50" },
  { Icon: Syringe,   label: "Veterinários",      examples: "Vacinas, antiparasitários, vitaminas",  color: "text-rose-700",    bg: "bg-rose-50" },
  { Icon: Truck,     label: "Máquinas",          examples: "Tratores, colheitadeiras, plantadeiras", color: "text-purple-700",  bg: "bg-purple-50" },
  { Icon: Wrench,    label: "Equipamentos",      examples: "Balanças, cochos, silos, contenção",    color: "text-indigo-700",  bg: "bg-indigo-50" },
  { Icon: Radio,     label: "Tecnologia & IoT",  examples: "Brincos RFID, sensores, drones",        color: "text-cyan-700",    bg: "bg-cyan-50" },
  { Icon: HardHat,   label: "EPIs & segurança",  examples: "Botinas, máscaras, luvas, capacetes",   color: "text-teal-700",    bg: "bg-teal-50" },
  { Icon: Store,     label: "Revendas",          examples: "Distribuidores, representantes",        color: "text-orange-700",  bg: "bg-orange-50" },
  { Icon: Package,   label: "Insumos diversos",  examples: "Fertilizantes, corretivos, adjuvantes", color: "text-stone-700",   bg: "bg-stone-50" },
] as const;

// Rotating pill pattern showcasing breadth without limiting scope
const ROTATING_EXAMPLES = [
  "Brincos RFID para bovinos",
  "Soja convencional · 500 toneladas",
  "Ração de confinamento premium",
  "Trator John Deere 6110J · 2023",
  "Inseticida sistêmico · 20 L",
  "Sementes híbridas de milho",
  "Drone agrícola DJI · pulverização",
  "Vacina aftosa · 2.000 doses",
  "Balança rodoviária eletrônica",
  "Botinas de segurança · NR-31",
  "Serviço de consultoria técnica",
  "Novilhas Nelore PO · 18 meses",
];

function RotatingCategoryPill() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((v) => (v + 1) % ROTATING_EXAMPLES.length),
      2200,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.04] px-4 py-2 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
      <span className="font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/50">
        Hoje no marketplace:
      </span>
      <div className="relative h-[1.1em] min-w-[18ch] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
            className="absolute inset-0 text-[.8125rem] font-semibold text-white"
          >
            {ROTATING_EXAMPLES[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { key: "recentes",      label: "Mais recentes"       },
  { key: "preco-asc",     label: "Menor preço"         },
  { key: "preco-desc",    label: "Maior preço"         },
  { key: "score-desc",    label: "Maior Score Agraas"  },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function MarketplacePublicView({ listings }: { listings: Listing[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [halalOnly, setHalalOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortKey>("recentes");
  const [openFilters, setOpenFilters] = useState(false);

  const stateCount = useMemo(() => {
    const s = new Set<string>();
    listings.forEach((l) => {
      if (l.location_state) s.add(l.location_state);
    });
    return s.size;
  }, [listings]);

  const avgScore = useMemo(() => {
    const scored = listings.filter((l) => l.score_agraas != null);
    if (scored.length === 0) return 0;
    const total = scored.reduce((s, l) => s + (l.score_agraas ?? 0), 0);
    return Math.round(total / scored.length);
  }, [listings]);

  const halalCount = useMemo(
    () => listings.filter((l) => l.halal_certified).length,
    [listings],
  );

  const filtered = useMemo(() => {
    let r = listings;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description ?? "").toLowerCase().includes(q) ||
          (l.location_city ?? "").toLowerCase().includes(q),
      );
    }
    if (typeFilter) r = r.filter((l) => l.listing_type === typeFilter);
    if (halalOnly) r = r.filter((l) => l.halal_certified);
    if (minScore > 0)
      r = r.filter((l) => l.score_agraas != null && l.score_agraas >= minScore);

    const sorted = [...r];
    switch (sort) {
      case "preco-asc":
        sorted.sort((a, b) => a.price_per_unit - b.price_per_unit);
        break;
      case "preco-desc":
        sorted.sort((a, b) => b.price_per_unit - a.price_per_unit);
        break;
      case "score-desc":
        sorted.sort(
          (a, b) => (b.score_agraas ?? 0) - (a.score_agraas ?? 0),
        );
        break;
      default:
        // already ordered by created_at desc from server
        break;
    }
    return sorted;
  }, [listings, search, typeFilter, halalOnly, minScore, sort]);

  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#0f3517]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(hsla(0,0%,100%,.04) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.04) 1px, transparent 1px)",
            backgroundSize: "4rem 4rem",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(46,139,62,0.18) 0%, transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-6 pt-24 pb-16 lg:px-10 lg:pt-32">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <FadeIn>
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                  Agraas Marketplace · Mercado Livre do Agro
                </p>
              </FadeIn>
              <FadeIn delay={0.15}>
                <h1 className="mt-5 text-[clamp(2.2rem,5.2vw,4rem)] font-medium leading-[.98] tracking-[-.035em] text-white">
                  Tudo do agro,
                  <br />
                  <span className="italic text-white/90">em um só lugar.</span>
                </h1>
              </FadeIn>
              <FadeIn delay={0.25}>
                <RotatingCategoryPill />
              </FadeIn>
              <FadeIn delay={0.35}>
                <p className="mt-6 max-w-[540px] text-[1.0625rem] leading-[1.75] text-white/60">
                  O único marketplace 100% dedicado ao agronegócio brasileiro. Animais, safras, ração, defensivos, sementes, máquinas, brincos RFID, drones, EPIs, serviços — com rastreio Agraas incluso em cada oferta.
                </p>
              </FadeIn>
              <FadeIn delay={0.45}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/cadastro"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-[14px] text-[.9375rem] font-semibold text-white shadow-[0_14px_40px_rgba(93,156,68,.35)] transition-all hover:bg-[var(--primary-hover)]"
                  >
                    Vender na Agraas
                    <ArrowRight size={15} />
                  </Link>
                  <a
                    href="#catalogo"
                    className="rounded-xl border border-white/40 px-7 py-[14px] text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5"
                  >
                    Explorar catálogo
                  </a>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.4}>
              <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-8 backdrop-blur-sm">
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-white/40">
                  Marketplace ao vivo
                </p>
                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[2.4rem] font-semibold leading-none tracking-[-.02em] text-white">
                      <CounterAnimation value={listings.length} />
                    </p>
                    <p className="mt-2 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/45">
                      anúncios ativos
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.4rem] font-semibold leading-none tracking-[-.02em] text-white">
                      <CounterAnimation value={halalCount} />
                    </p>
                    <p className="mt-2 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/45">
                      Halal certificados
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.4rem] font-semibold leading-none tracking-[-.02em] text-white">
                      <CounterAnimation value={stateCount} />
                    </p>
                    <p className="mt-2 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/45">
                      estados brasileiros
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.4rem] font-semibold leading-none tracking-[-.02em] text-white">
                      <CounterAnimation value={avgScore} />
                    </p>
                    <p className="mt-2 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/45">
                      score médio
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ ACTIVITY TICKER (live feed) ════════════════════════════════ */}
      <ActivityTicker listings={listings} />

      {/* ═══ CATEGORIES BREADTH ═════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-24">
          <div className="max-w-[720px]">
            <FadeIn>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                Todas as categorias do agro
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                Um marketplace construído para a cadeia inteira.
              </h2>
              <p className="mt-4 max-w-[580px] text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
                Do produtor ao fornecedor, da revenda ao prestador de serviço — qualquer produto ou serviço do agronegócio pode ser anunciado, negociado e rastreado aqui.
              </p>
            </FadeIn>
          </div>

          <StaggerContainer
            className="mt-12 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            staggerChildren={0.04}
          >
            {CATEGORIES.map((c) => (
              <StaggerItem key={c.label}>
                <div className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-soft)]">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${c.bg}`}
                  >
                    <c.Icon size={18} className={c.color} />
                  </div>
                  <p className="mt-4 text-[.8125rem] font-semibold leading-snug text-[var(--text-primary)]">
                    {c.label}
                  </p>
                  <p className="mt-1 text-[.6875rem] leading-snug text-[var(--text-muted)]">
                    {c.examples}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ VALUE PROPS ════════════════════════════════════════════════ */}
      <section className="border-t border-b border-[var(--border)] bg-[var(--surface-soft)]">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-12 md:grid-cols-3 lg:px-10">
          {[
            {
              Icon: HalalShield,
              title: "Rastreio verificável",
              text: "Cada anúncio linka ao passaporte digital — histórico completo antes de fechar.",
            },
            {
              Icon: TrendingUp,
              title: "Score Agraas integrado",
              text: "Animais, talhões e lotes trazem Score próprio. Transparência quantitativa por oferta.",
            },
            {
              Icon: MapPin,
              title: "Origem brasileira comprovada",
              text: "Propriedade, UF e certificações ativas exibidas. CAR, GTA e NF-e prontas para export.",
            },
          ].map((v) => (
            <div key={v.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                <v.Icon size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">{v.title}</p>
                <p className="mt-1 text-[.8125rem] leading-[1.65] text-[var(--text-muted)]">{v.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CATALOG ════════════════════════════════════════════════════ */}
      <section id="catalogo" className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 lg:px-10 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                Catálogo
              </p>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                {filtered.length} {filtered.length === 1 ? "oferta disponível" : "ofertas disponíveis"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpenFilters(!openFilters)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-[.8125rem] font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-soft)] lg:hidden"
            >
              <SlidersHorizontal size={14} />
              Filtros {(typeFilter || halalOnly || minScore > 0) && <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
            </button>
          </div>

          {/* Filter bar */}
          <div
            className={`mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] transition-[max-height] duration-300 lg:!max-h-none ${
              openFilters ? "max-h-[400px]" : "max-h-[72px]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título, descrição ou cidade..."
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option value="">Todos os tipos</option>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    Ordenar: {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[.8125rem]">
                <input
                  type="checkbox"
                  checked={halalOnly}
                  onChange={(e) => setHalalOnly(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--primary)]"
                />
                <HalalBadgeSVG size={16} /> Halal certificado
              </label>
              <div className="flex items-center gap-2 text-[.8125rem]">
                <span className="text-[var(--text-muted)]">Score mín.:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
                  className="w-32 accent-[var(--primary)]"
                />
                <span className="font-mono text-[.75rem] font-semibold text-[var(--text-primary)]">
                  {minScore}
                </span>
              </div>
              {(search || typeFilter || halalOnly || minScore > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("");
                    setHalalOnly(false);
                    setMinScore(0);
                  }}
                  className="ml-auto text-[.75rem] font-medium text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--primary)] hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-white p-16 text-center">
              <ShoppingBag size={32} className="mx-auto text-[var(--text-muted)]" />
              <p className="mt-4 text-[.9375rem] font-semibold text-[var(--text-primary)]">
                Nenhum anúncio encontrado com esses filtros
              </p>
              <p className="mt-2 text-[.8125rem] text-[var(--text-muted)]">
                Tente ajustar a busca ou remover filtros.
              </p>
            </div>
          ) : (
            <StaggerContainer
              className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              staggerChildren={0.05}
            >
              {filtered.map((l) => (
                <StaggerItem key={l.id}>
                  <PublicListingCard listing={l} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-24">
          <div className="max-w-[720px]">
            <FadeIn>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                Como funciona
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                Três passos do produtor ao comprador.
              </h2>
            </FadeIn>
          </div>

          <StaggerContainer
            className="mt-14 grid gap-6 md:grid-cols-3"
            staggerChildren={0.12}
          >
            {[
              {
                n: "01",
                title: "Publique com rastreio",
                text: "O vendedor cria o anúncio em 2 minutos. Score Agraas, certificações e dados do vendedor aparecem automaticamente.",
              },
              {
                n: "02",
                title: "Negocie com dados, não sorte",
                text: "Comprador acessa histórico, score e certificações antes de abrir a conversa. Oferta direta pelo marketplace, sem intermediário.",
              },
              {
                n: "03",
                title: "Feche com NF-e e segurança",
                text: "Proteção Agraas em todo o fluxo. Transação registrada no sistema, NF-e automática, reputação construída a cada negócio.",
              },
            ].map((s) => (
              <StaggerItem key={s.n}>
                <div className="group h-full rounded-2xl border border-[var(--border)] bg-white p-7 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[2.2rem] font-medium text-[var(--primary)]/80 leading-none">
                      {s.n}
                    </span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                  <h3 className="mt-5 text-[1.0625rem] font-semibold leading-[1.3] text-[var(--text-primary)]">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[.875rem] leading-[1.7] text-[var(--text-muted)]">
                    {s.text}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ WHY AGRAAS ═════════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <FadeIn>
              <div>
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                  Por que aqui
                </p>
                <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                  O único marketplace onde cada oferta é verificável.
                </h2>
                <p className="mt-5 text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
                  Marketplaces genéricos tratam agro como categoria. A Agraas é infraestrutura do agro — cada detalhe pensado para quem produz e quem compra no setor.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid gap-4 sm:grid-cols-2" staggerChildren={0.08}>
              {[
                {
                  title: "Score Agraas nativo",
                  text: "Cada animal ou talhão traz Score do algoritmo Agraas — 5 dimensões, cálculo em tempo real.",
                },
                {
                  title: "Origem certificada",
                  text: "Propriedade georreferenciada com CAR, GTA e certificações ativas exibidas em todo anúncio.",
                },
                {
                  title: "RLS + dados soberanos",
                  text: "Row Level Security em PostgreSQL. Seus dados nunca são visíveis a outros clientes, em nenhuma hipótese.",
                },
                {
                  title: "NF-e automática",
                  text: "Transação fechada no marketplace gera nota fiscal eletrônica automaticamente, pronta para contabilidade.",
                },
                {
                  title: "Reputação do vendedor",
                  text: "Histórico de anúncios e vendas visível ao comprador. Quem cumpre ganha destaque orgânico.",
                },
                {
                  title: "100% dedicado ao agro",
                  text: "Sem dispersão com nichos fora do setor. Cada recurso, feature, suporte — pensado para o agronegócio.",
                },
              ].map((v) => (
                <StaggerItem key={v.title}>
                  <div className="h-full rounded-xl border border-[var(--border)] bg-white p-5 transition-colors hover:border-[var(--primary)]/30">
                    <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                      {v.title}
                    </p>
                    <p className="mt-2 text-[.8125rem] leading-[1.7] text-[var(--text-muted)]">
                      {v.text}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ═══ SELLER CTA ═════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, var(--sidebar) 0%, var(--sidebar-2) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(hsla(0,0%,100%,.03) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.03) 1px, transparent 1px)",
            backgroundSize: "4rem 4rem",
          }}
        />

        <div className="mx-auto max-w-[900px] px-6 py-24 text-center">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Para vendedores
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h2 className="mt-5 text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.1] tracking-[-.03em] text-white">
              Qualquer coisa do agro
              <br />
              merece um marketplace à altura.
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mx-auto mt-5 max-w-[560px] text-[1rem] leading-[1.75] text-white/70">
              Publicar um anúncio leva 2 minutos. Score Agraas, certificações e sua reputação aparecem automaticamente — o comprador encontra você por qualidade, não por sorte.
            </p>
          </FadeIn>
          <FadeIn delay={0.45}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/cadastro"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-4 text-[.9375rem] font-semibold text-[var(--sidebar-2)] shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]"
              >
                <span className="relative flex items-center gap-2">
                  Cadastrar grátis
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="/planos"
                className="rounded-xl border border-white/40 px-8 py-4 text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5"
              >
                Ver planos
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

function PublicListingCard({ listing: l }: { listing: Listing }) {
  const t = TYPE_META[l.listing_type] ?? TYPE_META.outro;
  const Icon = t.icon;

  return (
    <Link
      href={`/marketplace/${l.id}`}
      className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.bg}`}
        >
          <Icon size={18} className={t.color} />
        </span>
        <div className="flex items-center gap-1.5">
          {l.halal_certified && <HalalBadgeSVG size={22} />}
          {l.score_agraas != null && (
            <span className="rounded-md bg-[var(--primary-soft)] px-2 py-0.5 font-mono text-[.6875rem] font-bold text-[var(--primary)]">
              Score {l.score_agraas}
            </span>
          )}
        </div>
      </div>

      <h4 className="mt-4 line-clamp-2 text-[.9375rem] font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
        {l.title}
      </h4>
      {l.description && (
        <p className="mt-2 line-clamp-2 text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
          {l.description}
        </p>
      )}

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[1.375rem] font-semibold tracking-[-.01em] text-[var(--primary)]">
          {fmt(l.price_per_unit)}
        </span>
        <span className="text-[.75rem] text-[var(--text-muted)]">/{l.unit}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[.6875rem] text-[var(--text-muted)]">
        {l.location_city && l.location_state && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={10} />
            {l.location_city}-{l.location_state}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Package size={10} />
          {l.quantity_available.toLocaleString("pt-BR")} {l.unit}
        </span>
      </div>

      <div className="mt-auto pt-5">
        <span className="inline-flex items-center gap-1 text-[.8125rem] font-semibold text-[var(--primary)] transition-colors group-hover:underline">
          Ver detalhes
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function HalalShield({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
