"use client";

import { useMemo, useState } from "react";
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
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/app/components/ui/Motion";
import type { Listing } from "./MarketplaceTabs";
import ActivityTicker from "./ActivityTicker";

const TYPE_META: Record<
  string,
  { icon: typeof Package; label: string; color: string; bg: string; stripe: string }
> = {
  animal:      { icon: Tag,         label: "Animal",      color: "text-emerald-700", bg: "bg-emerald-50", stripe: "from-emerald-400 to-emerald-600" },
  safra:       { icon: Wheat,       label: "Safra",       color: "text-amber-700",   bg: "bg-amber-50",   stripe: "from-amber-400 to-amber-600" },
  insumo:      { icon: ShoppingBag, label: "Insumo",      color: "text-blue-700",    bg: "bg-blue-50",    stripe: "from-blue-400 to-blue-600" },
  maquinario:  { icon: Truck,       label: "Maquinário",  color: "text-purple-700",  bg: "bg-purple-50",  stripe: "from-purple-400 to-purple-600" },
  equipamento: { icon: Truck,       label: "Equipamento", color: "text-indigo-700",  bg: "bg-indigo-50",  stripe: "from-indigo-400 to-indigo-600" },
  epi:         { icon: ShoppingBag, label: "EPI",         color: "text-teal-700",    bg: "bg-teal-50",    stripe: "from-teal-400 to-teal-600" },
  outro:       { icon: Package,     label: "Outro",       color: "text-gray-700",    bg: "bg-gray-50",    stripe: "from-gray-400 to-gray-600" },
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

const UF_OPTIONS = [
  "SP","MG","GO","MT","MS","PR","RS","SC","BA","MA","TO","PA","PI","RO","ES","RJ",
];

export default function MarketplacePublicView({ listings }: { listings: Listing[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [halalOnly, setHalalOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recentes");
  const [openFilters, setOpenFilters] = useState(false);

  const toggleUF = (uf: string) =>
    setSelectedUFs((prev) =>
      prev.includes(uf) ? prev.filter((u) => u !== uf) : [...prev, uf],
    );

  const clearAllFilters = () => {
    setSearch("");
    setTypeFilter("");
    setHalalOnly(false);
    setMinScore(0);
    setPriceMin("");
    setPriceMax("");
    setSelectedUFs([]);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (halalOnly ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    selectedUFs.length;

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

  const featured = useMemo(() => {
    // Destaques: top 3 por score + halal + mais quantidade
    return [...listings]
      .sort((a, b) => {
        const scoreA = (a.score_agraas ?? 0) + (a.halal_certified ? 10 : 0);
        const scoreB = (b.score_agraas ?? 0) + (b.halal_certified ? 10 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [listings]);

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
    const minVal = priceMin ? parseFloat(priceMin) : null;
    const maxVal = priceMax ? parseFloat(priceMax) : null;
    if (minVal != null) r = r.filter((l) => l.price_per_unit >= minVal);
    if (maxVal != null) r = r.filter((l) => l.price_per_unit <= maxVal);
    if (selectedUFs.length > 0)
      r = r.filter((l) => l.location_state && selectedUFs.includes(l.location_state));

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
  }, [listings, search, typeFilter, halalOnly, minScore, priceMin, priceMax, selectedUFs, sort]);

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
                <h1 className="text-[clamp(2.2rem,5.2vw,4rem)] font-medium leading-[1] tracking-[-.03em] text-white">
                  O marketplace do agro brasileiro.
                </h1>
              </FadeIn>
              <FadeIn delay={0.15}>
                <p className="mt-6 max-w-[560px] text-[1.0625rem] leading-[1.75] text-white/65">
                  Primeiro marketplace 100% dedicado ao agronegócio brasileiro. Animais, safras, ração, defensivos, sementes, máquinas, brincos RFID, drones, EPIs e serviços — com rastreio Agraas em cada oferta.
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

            <FadeIn delay={0.3}>
              <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { value: listings.length, label: "anúncios ativos" },
                    { value: halalCount,      label: "certificados Halal" },
                    { value: stateCount,      label: "estados brasileiros" },
                    { value: avgScore,        label: "score médio" },
                  ].map((k) => (
                    <div key={k.label}>
                      <p className="text-[2.2rem] font-semibold leading-none tracking-[-.02em] text-white">
                        {k.value.toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-2.5 text-[.8125rem] text-white/55">
                        {k.label}
                      </p>
                    </div>
                  ))}
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
              <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                Um marketplace construído para a cadeia inteira.
              </h2>
              <p className="mt-5 max-w-[580px] text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
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

      {/* ═══ DESTAQUES (featured listings, larger cards) ════════════════ */}
      {featured.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                  Destaques da semana
                </h2>
                <p className="mt-2 text-[.875rem] text-[var(--text-muted)]">
                  Anúncios com maior Score Agraas e certificações ativas.
                </p>
              </div>
              <Link
                href="#catalogo"
                className="inline-flex items-center gap-1.5 text-[.8125rem] font-semibold text-[var(--primary)] hover:underline"
              >
                Ver todo o catálogo
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((l) => (
                <FeaturedListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        </section>
      )}

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
        <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
          {/* Category chips — horizontal scroll */}
          <div className="-mx-6 overflow-x-auto px-6 pb-4 lg:-mx-10 lg:px-10">
            <div className="flex min-w-max items-center gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter("")}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[.8125rem] font-semibold transition ${
                  typeFilter === ""
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                Tudo
              </button>
              {Object.entries(TYPE_META).map(([k, v]) => {
                const CatIcon = v.icon;
                const active = typeFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTypeFilter(active ? "" : k)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-[.8125rem] font-semibold transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <CatIcon size={13} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar + sort + mobile filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, descrição ou cidade..."
                className="w-full rounded-xl border border-[var(--border)] bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  Ordenar: {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOpenFilters(!openFilters)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[.8125rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)] lg:hidden"
            >
              <SlidersHorizontal size={14} />
              Filtros {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[.6875rem] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Main layout: sidebar + grid */}
          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            {/* ─── Sidebar filters (desktop always visible; mobile collapsible) ─── */}
            <aside
              className={`${
                openFilters ? "block" : "hidden lg:block"
              } lg:w-[260px] lg:shrink-0`}
            >
              <div className="sticky top-[96px] rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                    Filtros
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[.75rem] font-medium text-[var(--primary)] hover:underline"
                    >
                      Limpar tudo
                    </button>
                  )}
                </div>

                {/* Price range */}
                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <p className="mb-3 text-[.8125rem] font-semibold text-[var(--text-primary)]">
                    Preço
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[.6875rem] text-[var(--text-muted)]">
                        Mínimo
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        placeholder="R$ 0"
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-sm outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[.6875rem] text-[var(--text-muted)]">
                        Máximo
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        placeholder="R$ ∞"
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-sm outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>

                {/* UF multi-select */}
                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <p className="mb-3 text-[.8125rem] font-semibold text-[var(--text-primary)]">
                    Estado (UF)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {UF_OPTIONS.map((uf) => {
                      const active = selectedUFs.includes(uf);
                      return (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => toggleUF(uf)}
                          className={`rounded-md border px-2 py-1 text-[.75rem] font-semibold transition ${
                            active
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                              : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          {uf}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Halal */}
                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <p className="mb-3 text-[.8125rem] font-semibold text-[var(--text-primary)]">
                    Certificação
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[.8125rem] transition hover:bg-[var(--surface-soft)]">
                    <input
                      type="checkbox"
                      checked={halalOnly}
                      onChange={(e) => setHalalOnly(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--primary)]"
                    />
                    <HalalBadgeSVG size={16} />
                    <span className="font-medium text-[var(--text-primary)]">
                      Halal certificado
                    </span>
                  </label>
                </div>

                {/* Score mín */}
                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-[.8125rem] font-semibold text-[var(--text-primary)]">
                      Score Agraas mín.
                    </p>
                    <span className="font-mono text-[.8125rem] font-semibold text-[var(--primary)]">
                      {minScore}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--primary)]"
                  />
                  <div className="mt-1 flex justify-between text-[.6875rem] text-[var(--text-muted)]">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* ─── Main content: results ─── */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[1.25rem] font-semibold text-[var(--text-primary)] md:text-[1.5rem]">
                    {filtered.length.toLocaleString("pt-BR")} {filtered.length === 1 ? "oferta" : "ofertas"}
                  </h2>
                  {activeFilterCount > 0 && (
                    <p className="mt-1 text-[.75rem] text-[var(--text-muted)]">
                      {activeFilterCount} {activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}
                    </p>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-white p-16 text-center">
                  <ShoppingBag size={32} className="mx-auto text-[var(--text-muted)]" />
                  <p className="mt-4 text-[.9375rem] font-semibold text-[var(--text-primary)]">
                    Nenhum anúncio encontrado
                  </p>
                  <p className="mt-2 text-[.8125rem] text-[var(--text-muted)]">
                    Ajuste os filtros à esquerda ou limpe tudo pra ver o catálogo completo.
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-[.8125rem] font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <StaggerContainer
                  className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                  staggerChildren={0.04}
                >
                  {filtered.map((l) => (
                    <StaggerItem key={l.id}>
                      <PublicListingCard listing={l} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-24">
          <div className="max-w-[720px]">
            <FadeIn>
              <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
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
                <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
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
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.1] tracking-[-.025em] text-white">
              Qualquer coisa do agro merece um marketplace à altura.
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
  // Parcelamento estilo Mercado Livre — calcula em 10x sem juros
  const installmentValue = l.price_per_unit / 10;
  const isPremium = (l.score_agraas ?? 0) >= 75;

  return (
    <Link
      href={`/marketplace/${l.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_1px_3px_rgba(30,42,27,0.04)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-card)]"
    >
      {/* ─── Image area (placeholder colored block with category icon) ─── */}
      <div
        className={`relative flex h-40 items-center justify-center overflow-hidden ${t.bg}`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.5) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)
          `,
        }}
      >
        <Icon size={56} className={`${t.color} opacity-30 transition-transform duration-300 group-hover:scale-110`} />

        {/* Top-left badges */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {isPremium && (
            <span className="rounded-sm bg-[var(--primary)] px-1.5 py-0.5 text-[.625rem] font-bold uppercase tracking-wide text-white">
              Premium
            </span>
          )}
          {l.halal_certified && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-white/95 px-1.5 py-0.5 text-[.625rem] font-bold text-[var(--primary-hover)]">
              <HalalBadgeSVG size={10} /> Halal
            </span>
          )}
        </div>

        {/* Top-right score */}
        {l.score_agraas != null && (
          <div className="absolute right-2 top-2 rounded-sm bg-white/95 px-1.5 py-0.5 text-[.625rem] font-bold text-[var(--primary-hover)]">
            Score {l.score_agraas}
          </div>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[.625rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {TYPE_META[l.listing_type]?.label ?? "Outro"}
        </p>
        <h4 className="mt-1 line-clamp-2 min-h-[2.6em] text-[.875rem] font-medium leading-[1.3] text-[var(--text-primary)]">
          {l.title}
        </h4>

        {/* Price block — Mercado Livre style */}
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.375rem] font-semibold leading-none text-[var(--text-primary)]">
              {fmt(l.price_per_unit)}
            </span>
            <span className="text-[.75rem] text-[var(--text-muted)]">/{l.unit}</span>
          </div>
          <p className="mt-1 text-[.6875rem] text-[var(--text-secondary)]">
            em <span className="font-semibold text-[var(--primary)]">10x {fmt(installmentValue)}</span> sem juros
          </p>
        </div>

        {/* Freight / meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[.6875rem]">
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--primary)]">
            <Truck size={11} /> Frete a combinar
          </span>
          {l.location_city && l.location_state && (
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <MapPin size={10} />
              {l.location_city}/{l.location_state}
            </span>
          )}
        </div>

        {/* Quantity available */}
        <p className="mt-2 text-[.6875rem] text-[var(--text-muted)]">
          {l.quantity_available.toLocaleString("pt-BR")} {l.unit} disponíveis
        </p>
      </div>
    </Link>
  );
}

function FeaturedListingCard({ listing: l }: { listing: Listing }) {
  const t = TYPE_META[l.listing_type] ?? TYPE_META.outro;
  const Icon = t.icon;
  const installmentValue = l.price_per_unit / 10;
  const isPremium = (l.score_agraas ?? 0) >= 75;

  return (
    <Link
      href={`/marketplace/${l.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-card)]"
    >
      {/* Image area maior para destaque */}
      <div
        className={`relative flex h-56 items-center justify-center overflow-hidden ${t.bg}`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.5) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)
          `,
        }}
      >
        <Icon size={80} className={`${t.color} opacity-35 transition-transform duration-300 group-hover:scale-110`} />

        {/* Destaque badge + category */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-sm bg-amber-500 px-2 py-0.5 text-[.6875rem] font-bold uppercase tracking-wide text-white">
            ★ Destaque
          </span>
          {isPremium && (
            <span className="rounded-sm bg-[var(--primary)] px-2 py-0.5 text-[.6875rem] font-bold uppercase tracking-wide text-white">
              Premium
            </span>
          )}
          {l.halal_certified && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-white/95 px-2 py-0.5 text-[.6875rem] font-bold text-[var(--primary-hover)]">
              <HalalBadgeSVG size={11} /> Halal
            </span>
          )}
        </div>

        {l.score_agraas != null && (
          <div className="absolute right-3 top-3 rounded-sm bg-white/95 px-2 py-0.5 text-[.75rem] font-bold text-[var(--primary-hover)]">
            Score {l.score_agraas}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[.6875rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {t.label}
        </p>
        <h4 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[1rem] font-semibold leading-[1.3] text-[var(--text-primary)]">
          {l.title}
        </h4>

        <div className="mt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.75rem] font-semibold leading-none text-[var(--text-primary)]">
              {fmt(l.price_per_unit)}
            </span>
            <span className="text-[.8125rem] text-[var(--text-muted)]">/{l.unit}</span>
          </div>
          <p className="mt-1.5 text-[.75rem] text-[var(--text-secondary)]">
            em <span className="font-semibold text-[var(--primary)]">10x {fmt(installmentValue)}</span> sem juros
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[.75rem]">
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--primary)]">
            <Truck size={12} /> Frete a combinar
          </span>
          {l.location_city && l.location_state && (
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <MapPin size={11} />
              {l.location_city}/{l.location_state}
            </span>
          )}
        </div>

        <p className="mt-2 text-[.75rem] text-[var(--text-muted)]">
          {l.quantity_available.toLocaleString("pt-BR")} {l.unit} disponíveis
        </p>
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
