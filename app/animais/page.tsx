"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientRow = { id: string; name: string };
type PropertyRow = { id: string; name: string };

type PassportCacheRow = {
  animal_id: string;
  identity_json: {
    internal_code?: string | null;
    sex?: string | null;
    breed?: string | null;
    status?: string | null;
  } | null;
  score_json: { total_score?: number | null } | null;
};

type AnimalBaseRow = {
  id: string;
  agraas_id: string | null;
  birth_date: string | null;
  nickname: string | null;
  current_property_id: string | null;
};

type CertRow = {
  animal_id: string;
  certification_name: string;
  status: string;
  certification_code: string | null;
};

// BUG 4 fix: table is "weights" with columns weight + weighing_date
type WeighingRow = { animal_id: string; weight: number; weighing_date: string };
type ActiveAppRow = { animal_id: string; withdrawal_date: string };

type AnimalCard = {
  animal_id: string;
  internal_code: string | null;
  nickname: string | null;
  agraas_id: string | null;
  sex: string | null;
  breed: string | null;
  animal_status: string | null;
  total_score: number | null;
  birth_date: string | null;
  last_weight: number | null;
  last_weight_date: string | null;
  property_id: string | null;
  property_name: string | null;
  certifications: { name: string; status: string; code: string | null }[];
  has_halal: boolean;
  is_export_ready: boolean;
  is_in_alert: boolean;
  days_since_weighing: number | null;
  has_active_withdrawal: boolean;
};

type SortKey = "score_desc" | "score_asc" | "weight_desc" | "name_asc";
type FilterKey = "all" | "halal" | "export" | "alert";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnimaisPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [cards, setCards] = useState<AnimalCard[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("score_desc");

  // Load clients once
  useEffect(() => {
    supabase
      .from("clients")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setClients(data as ClientRow[]);
      });
  }, []);

  // Load animals + enrichment data
  useEffect(() => {
    async function loadAnimals() {
      setLoading(true);
      setError(false);

      const todayStr = new Date().toISOString().split("T")[0];

      let passportQuery = supabase
        .from("agraas_master_passport_cache")
        .select("animal_id, identity_json, score_json");
      // BUG 2 fix: include current_property_id; RLS filters to this user's animals only
      let animalsQuery = supabase
        .from("animals")
        .select("id, agraas_id, birth_date, nickname, current_property_id");

      if (selectedClientId) {
        passportQuery = passportQuery.eq(
          "client_id",
          selectedClientId
        ) as typeof passportQuery;
        animalsQuery = animalsQuery.eq(
          "client_id",
          selectedClientId
        ) as typeof animalsQuery;
      }

      const [
        { data: passportData, error: passportErr },
        { data: animalsBaseData, error: animalsErr },
        { data: weighingsData },
        { data: propertiesData },
        { data: activeAppsData },
        // BUG 3 fix: query animal_certifications directly (certifications_json never populated)
        { data: certsData },
      ] = await Promise.all([
        passportQuery,
        animalsQuery,
        // BUG 4 fix: correct table "weights" with columns weight + weighing_date
        supabase
          .from("weights")
          .select("animal_id, weight, weighing_date")
          .order("weighing_date", { ascending: false }),
        supabase.from("properties").select("id, name"),
        supabase
          .from("applications")
          .select("animal_id, withdrawal_date")
          .gte("withdrawal_date", todayStr),
        supabase
          .from("animal_certifications")
          .select("animal_id, certification_name, status, certification_code"),
      ]);

      if (passportErr || animalsErr) {
        setError(true);
        setLoading(false);
        return;
      }

      const passports = (passportData as PassportCacheRow[] | null) ?? [];
      const animalsBase = (animalsBaseData as AnimalBaseRow[] | null) ?? [];
      const weighings = (weighingsData as WeighingRow[] | null) ?? [];
      const propsData = (propertiesData as PropertyRow[] | null) ?? [];
      const activeApps = (activeAppsData as ActiveAppRow[] | null) ?? [];
      const allCerts = (certsData as CertRow[] | null) ?? [];

      // Build lookup maps
      const animalBaseMap = new Map<string, AnimalBaseRow>();
      for (const a of animalsBase) animalBaseMap.set(a.id, a);

      const propertyMap = new Map<string, string>();
      for (const p of propsData) propertyMap.set(p.id, p.name);

      // BUG 4 fix: last weight per animal from "weights" table
      const lastWeightMap = new Map<string, number>();
      const lastWeighDateMap = new Map<string, string>();
      for (const w of weighings) {
        if (!lastWeighDateMap.has(w.animal_id)) {
          lastWeightMap.set(w.animal_id, w.weight);
          lastWeighDateMap.set(w.animal_id, w.weighing_date);
        }
      }

      // BUG 3 fix: build cert map keyed by animal_id
      const certsByAnimal = new Map<string, { name: string; status: string; code: string | null }[]>();
      for (const c of allCerts) {
        const arr = certsByAnimal.get(c.animal_id) ?? [];
        arr.push({ name: c.certification_name, status: c.status, code: c.certification_code });
        certsByAnimal.set(c.animal_id, arr);
      }

      const withdrawalSet = new Set(activeApps.map((a) => a.animal_id));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // BUG 2 fix: only include animals that belong to this user (RLS-filtered animalBaseMap)
      const result: AnimalCard[] = passports
        .filter((p) => animalBaseMap.has(p.animal_id))
        .map((p) => {
          const base = animalBaseMap.get(p.animal_id)!;
          // BUG 2 fix: use animals.current_property_id (ownership_json never populated)
          const propId = base.current_property_id ?? null;
          // BUG 3 fix: certs from direct query
          const certs = certsByAnimal.get(p.animal_id) ?? [];

          const hasHalal = certs.some(
            (c) => c.name.toLowerCase().includes("halal") && c.status === "active"
          );
          const hasWithdrawal = withdrawalSet.has(p.animal_id);
          const score = p.score_json?.total_score ?? 0;
          const isExportReady = score >= 75 && hasHalal && !hasWithdrawal;

          // BUG 4 fix: use weighing_date from weights table
          const lastWeighDate = lastWeighDateMap.get(p.animal_id) ?? null;
          let daysSince: number | null = null;
          if (lastWeighDate) {
            const d = new Date(lastWeighDate);
            d.setHours(0, 0, 0, 0);
            daysSince = Math.floor((today.getTime() - d.getTime()) / 86400000);
          }

          const hasExpiredCert = certs.some((c) => c.status === "expired");
          const isInAlert =
            (daysSince !== null && daysSince > 30) ||
            hasWithdrawal ||
            hasExpiredCert;

          return {
            animal_id: p.animal_id,
            internal_code: p.identity_json?.internal_code ?? null,
            nickname: base.nickname ?? null,
            agraas_id: base.agraas_id ?? null,
            sex: p.identity_json?.sex ?? null,
            breed: p.identity_json?.breed ?? null,
            animal_status: p.identity_json?.status ?? null,
            total_score: score,
            birth_date: base.birth_date ?? null,
            // BUG 4 fix: weight from weights table
            last_weight: lastWeightMap.get(p.animal_id) ?? null,
            last_weight_date: lastWeighDate,
            property_id: propId,
            property_name: propId ? (propertyMap.get(propId) ?? null) : null,
            certifications: certs,
            has_halal: hasHalal,
            is_export_ready: isExportReady,
            is_in_alert: isInAlert,
            days_since_weighing: daysSince,
            has_active_withdrawal: hasWithdrawal,
          };
        });

      // Filter properties to only those used by this user's animals
      // (properties table may have no RLS — avoids showing other clients' farms in dropdown)
      const userPropIds = new Set(result.map((a) => a.property_id).filter(Boolean));
      setProperties(propsData.filter((p) => userPropIds.has(p.id)));

      setCards(result);
      setLoading(false);
    }

    loadAnimals();
  }, [selectedClientId]);

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = cards;
    if (filter === "halal") result = result.filter((a) => a.has_halal);
    if (filter === "export") result = result.filter((a) => a.is_export_ready);
    if (filter === "alert") result = result.filter((a) => a.is_in_alert);
    if (selectedProperty)
      result = result.filter((a) => a.property_id === selectedProperty);

    return [...result].sort((a, b) => {
      if (sortBy === "score_desc")
        return (b.total_score ?? 0) - (a.total_score ?? 0);
      if (sortBy === "score_asc")
        return (a.total_score ?? 0) - (b.total_score ?? 0);
      if (sortBy === "weight_desc")
        return (b.last_weight ?? 0) - (a.last_weight ?? 0);
      if (sortBy === "name_asc")
        return (a.internal_code ?? "").localeCompare(b.internal_code ?? "");
      return 0;
    });
  }, [cards, filter, selectedProperty, sortBy]);

  // ── Summary metrics ──────────────────────────────────────────────────────────
  const avgScore =
    cards.length > 0
      ? Math.round(
          cards.reduce((s, a) => s + (a.total_score ?? 0), 0) / cards.length
        )
      : 0;
  const halalCount = cards.filter((a) => a.has_halal).length;
  const exportReadyCount = cards.filter((a) => a.is_export_ready).length;
  const alertCount = cards.filter((a) => a.is_in_alert).length;

  return (
    <main className="space-y-8">
      {/* ── Client selector (admin) ── */}
      {clients.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Cliente
          </span>
          <button
            type="button"
            onClick={() => setSelectedClientId(null)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedClientId === null
                ? "bg-[var(--primary-hover)] text-white"
                : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--primary-soft)]"
            }`}
          >
            Todos
          </button>
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedClientId(c.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedClientId === c.id
                  ? "bg-[var(--primary-hover)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--primary-soft)]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Hero ── */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />
        <div className="ag-badge ag-badge-green">Base animal</div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-5xl">
          Passaportes vivos da operação
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
          Consulte, filtre e acesse o passaporte individual de cada animal com
          score, certificações, rastreabilidade e leitura produtiva.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/animais/novo" className="ag-button-primary">
            Novo animal
          </Link>
          <Link href="/scores" className="ag-button-secondary">
            Ver ranking
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <HeroStat
            label="Animais"
            value={loading ? "—" : cards.length}
            sub="registrados"
          />
          <HeroStat
            label="Score médio"
            value={loading ? "—" : avgScore}
            sub="do rebanho"
          />
          <HeroStat
            label="Halal ativos"
            value={loading ? "—" : halalCount}
            sub="certificados"
            accent="green"
          />
          <HeroStat
            label="Em alerta"
            value={loading ? "—" : alertCount}
            sub="requerem ação"
            accent={alertCount > 0 ? "red" : undefined}
          />
        </div>
      </section>

      {/* ── Filters + sort ── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "Todos", count: cards.length },
                { key: "halal", label: "Halal", count: halalCount },
                {
                  key: "export",
                  label: "Aptos exportação",
                  count: exportReadyCount,
                },
                { key: "alert", label: "Em alerta", count: alertCount },
              ] as { key: FilterKey; label: string; count: number }[]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === key
                    ? "bg-[var(--primary-hover)] text-white shadow-sm"
                    : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--primary-soft)]"
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    filter === key
                      ? "bg-white/20 text-white"
                      : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
                  }`}
                >
                  {loading ? "—" : count}
                </span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Property filter */}
            {properties.length > 0 && (
              <select
                value={selectedProperty ?? ""}
                onChange={(e) =>
                  setSelectedProperty(e.target.value || null)
                }
                className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-secondary)] shadow-sm focus:outline-none"
              >
                <option value="">Todas as fazendas</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-secondary)] shadow-sm focus:outline-none"
            >
              <option value="score_desc">Score ↓</option>
              <option value="score_asc">Score ↑</option>
              <option value="weight_desc">Peso ↓</option>
              <option value="name_asc">Nome A-Z</option>
            </select>
          </div>
        </div>

        {/* Counter */}
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          {loading
            ? "Carregando animais…"
            : `Exibindo ${filtered.length} de ${cards.length} animal${cards.length !== 1 ? "is" : ""}`}
        </p>
      </section>

      {/* ── Card grid ── */}
      <section>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-[var(--border)] bg-white p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-black/8 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-28 rounded-full bg-black/8" />
                    <div className="h-3 w-20 rounded-full bg-black/6" />
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <div className="h-3 w-full rounded-full bg-black/6" />
                  <div className="h-3 w-3/4 rounded-full bg-black/6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-10 text-center text-sm text-[var(--danger)]">
            Erro ao carregar animais. Tente recarregar a página.
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((animal) => (
              <AnimalCardComponent key={animal.animal_id} animal={animal} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ─── Animal card ──────────────────────────────────────────────────────────────

function AnimalCardComponent({ animal }: { animal: AnimalCard }) {
  const score = animal.total_score ?? 0;
  const alertBorder = animal.is_in_alert
    ? "border-amber-200"
    : "border-[var(--border)]";

  return (
    <Link
      href={`/animais/${animal.animal_id}`}
      className={`group flex flex-col rounded-3xl border bg-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] ${alertBorder}`}
    >
      {/* Top section */}
      <div className="flex items-start gap-4 p-6">
        <div className="flex flex-col items-center gap-1">
          <ScoreCircle score={score} />
          {animal.has_halal && <HalalBadgeSVG size={24} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {animal.internal_code ?? "Animal"}
          </p>
          {animal.nickname && (
            <p className="text-sm font-medium text-[var(--primary-hover)]">
              &ldquo;{animal.nickname}&rdquo;
            </p>
          )}
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {animal.agraas_id ?? "Agraas ID não emitido"}
          </p>
        </div>
        {animal.is_in_alert && (
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
        )}
      </div>

      {/* Details */}
      <div className="border-t border-[var(--border)] px-6 py-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            {[animal.breed, formatSex(animal.sex)].filter(Boolean).join(" · ") ||
              "Raça não informada"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {animal.last_weight ? (
              <>
                <span className="font-medium">{animal.last_weight} kg</span>
                {animal.days_since_weighing !== null && (
                  <span className={`ml-2 ${animal.days_since_weighing > 45 ? "text-red-600 font-medium" : animal.days_since_weighing > 30 ? "text-amber-600 font-medium" : "text-[var(--text-muted)]"}`}>
                    · há {animal.days_since_weighing}d
                  </span>
                )}
              </>
            ) : (
              <span className="text-[var(--text-muted)]">Peso não registrado</span>
            )}
          </span>
        </div>

        {animal.property_name && (
          <p className="truncate text-sm text-[var(--text-muted)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5 inline h-3.5 w-3.5"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {animal.property_name}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-6 py-4">
        <div className="flex flex-wrap gap-1.5">
          <CertBadges certs={animal.certifications} />
          <StatusBadge status={animal.animal_status} isAlert={animal.is_in_alert} />
        </div>
        <span className="flex-shrink-0 text-sm font-medium text-[var(--primary-hover)] opacity-0 transition-opacity group-hover:opacity-100">
          Ver →
        </span>
      </div>
    </Link>
  );
}

// ─── Score donut ──────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r; // ≈ 163.36
  const filled = Math.max(0, Math.min(1, score / 100)) * circ;

  const color =
    score >= 75 ? "#2d9b6f" : score >= 50 ? "#d4930a" : "#c0392b";

  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      className="flex-shrink-0"
    >
      {/* Background track */}
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="6"
      />
      {/* Filled arc */}
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset="0"
        transform="rotate(-90 32 32)"
      />
      {/* Score text */}
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontWeight="700"
        fill={color}
        fontFamily="inherit"
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Cert badges ──────────────────────────────────────────────────────────────

function CertBadges({
  certs,
}: {
  certs: { name: string; status: string; code: string | null }[];
}) {
  return (
    <>
      {certs.map((cert, i) => {
        const name = cert.name.toLowerCase();
        const isActive = cert.status === "active";
        const isExpired = cert.status === "expired";

        if (name.includes("halal")) {
          return (
            <span
              key={i}
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-500 line-through"
              }`}
            >
              {isActive && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              Halal{isActive && " ✓"}
            </span>
          );
        }

        if (name.includes("mapa")) {
          return (
            <span
              key={i}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? "bg-blue-100 text-blue-800"
                  : isExpired
                  ? "bg-gray-100 text-gray-500 line-through"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              MAPA
            </span>
          );
        }

        if (name.includes("gta")) {
          return (
            <span
              key={i}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? "bg-orange-100 text-orange-800"
                  : "bg-gray-100 text-gray-500 line-through"
              }`}
            >
              GTA
            </span>
          );
        }

        // Generic cert
        return (
          <span
            key={i}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isActive
                ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {cert.name}
          </span>
        );
      })}
    </>
  );
}

function StatusBadge({
  status,
  isAlert,
}: {
  status: string | null;
  isAlert: boolean;
}) {
  if (isAlert) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        Alerta
      </span>
    );
  }
  const s = (status ?? "").toLowerCase();
  if (s === "active") {
    return (
      <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary-hover)]">
        Ativo
      </span>
    );
  }
  if (s === "sold" || s === "slaughtered" || s === "archived") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
        {s === "sold" ? "Vendido" : s === "slaughtered" ? "Abatido" : "Arquivado"}
      </span>
    );
  }
  return null;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterKey }) {
  const messages: Record<FilterKey, { title: string; sub: string }> = {
    all: {
      title: "Nenhum animal cadastrado",
      sub: "Registre o primeiro animal para ativar o passaporte vivo.",
    },
    halal: {
      title: "Nenhum animal com Halal ativo",
      sub: "Certifique animais com a certificação Halal para vê-los aqui.",
    },
    export: {
      title: "Nenhum animal apto para exportação",
      sub: "Score ≥ 75 + Halal ativo + sem carência ativa são os critérios.",
    },
    alert: {
      title: "Nenhum alerta ativo",
      sub: "Todos os animais estão dentro dos parâmetros esperados.",
    },
  };
  const msg = messages[filter];

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] shadow-[var(--shadow-soft)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5d9c44"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {msg.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {msg.sub}
      </p>
      {filter === "all" && (
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/animais/novo" className="ag-button-primary">
            Cadastrar animal
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Hero stat ────────────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: "green" | "red";
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        accent === "red"
          ? "border-red-200 bg-red-50"
          : accent === "green"
          ? "border-green-200 bg-green-50"
          : "border-[var(--border)] bg-[var(--surface-soft)]"
      }`}
    >
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${
          accent === "red"
            ? "text-red-600"
            : accent === "green"
            ? "text-green-700"
            : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{sub}</p>
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatSex(value: string | null) {
  const map: Record<string, string> = {
    male: "Macho",
    female: "Fêmea",
    macho: "Macho",
    femea: "Fêmea",
    "fêmea": "Fêmea",
  };
  if (!value) return null;
  return map[value.toLowerCase()] ?? value;
}
