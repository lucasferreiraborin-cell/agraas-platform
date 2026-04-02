"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
  Beef, CheckCircle2, Clock, AlertTriangle, ShieldCheck,
  ShieldAlert, Truck, MapPin, Users, Activity, Rabbit, Bird,
  Ship, Wheat,
} from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import ShipTrackingMapWrapper from "@/app/components/ShipTrackingMapWrapper";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lot = {
  id: string; name: string; objective: string | null;
  pais_destino: string | null; porto_embarque: string | null;
  data_embarque: string | null; certificacoes_exigidas: string[] | null;
  numero_contrato: string | null; status: string | null;
  ship_name: string | null; arrival_date: string | null;
};
type Assignment       = { animal_id: string; lot_id: string };
type Animal          = { id: string; internal_code: string | null; nickname: string | null; sex: string | null; breed: string | null; birth_date: string | null };
type Cert            = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type Withdrawal      = { animal_id: string; product_name: string | null; withdrawal_date: string | null };
type Score           = { animal_id: string; score_json: Record<string, unknown> | null };
type TrackingCheckpoint = { lot_id: string; stage: string; timestamp: string; animals_confirmed: number | null; animals_lost: number; loss_cause: string | null; location_name: string | null };
type LivestockAnimal = { id: string; species: string; breed: string | null; birth_date: string | null; internal_code: string | null; score: number | null; certifications: string[]; status: string };
type PoultryBatch    = { id: string; batch_code: string; species: string; breed: string | null; current_count: number; mortality_count: number; initial_count: number; feed_conversion: number | null; status: string; halal_certified: boolean; integrator_name: string | null };
type GrainShipment   = { id: string; contract_number: string | null; culture: string; quantity_tons: number; destination_country: string | null; destination_port: string | null; origin_port: string | null; vessel_name: string | null; departure_date: string | null; arrival_date: string | null; status: string; field_id: string | null };
type GrainTracking   = { shipment_id: string; stage: string; stage_date: string; quantity_confirmed_tons: number | null; quantity_lost_tons: number };
type GrainFarm       = { id: string; name: string; car_number: string | null };
type GrainField      = { id: string; farm_id: string; culture: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACKING_STAGES = [
  { key: "fazenda",       en: "Farm",        pt: "Fazenda" },
  { key: "concentracao",  en: "Staging",     pt: "Concentração" },
  { key: "transporte",    en: "Transport",   pt: "Transporte" },
  { key: "porto_origem",  en: "Origin Port", pt: "Porto Origem" },
  { key: "navio",         en: "At Sea",      pt: "Navio" },
  { key: "porto_destino", en: "Dest. Port",  pt: "Porto Destino" },
  { key: "entregue",      en: "Delivered",   pt: "Entregue" },
];

const CERT_LIST = ["Halal", "MAPA", "GTA", "SIF"];

const GRAIN_STAGES = [
  { key: "fazenda",        en: "Farm",         pt: "Fazenda" },
  { key: "armazem",        en: "Storage",      pt: "Armazém" },
  { key: "transportadora", en: "Transport",    pt: "Transportadora" },
  { key: "porto_origem",   en: "Origin Port",  pt: "Porto Origem" },
  { key: "navio",          en: "At Sea",       pt: "Navio" },
  { key: "porto_destino",  en: "Dest. Port",   pt: "Porto Destino" },
  { key: "entregue",       en: "Delivered",    pt: "Entregue" },
];

const CULTURE_LABEL_EN: Record<string, string> = { soja: "Soybean", milho: "Corn", trigo: "Wheat", acucar: "Sugar", cafe: "Coffee" };
const CULTURE_LABEL_PT: Record<string, string> = { soja: "Soja", milho: "Milho", trigo: "Trigo", acucar: "Açúcar", cafe: "Café" };
const GRAIN_STATUS_EN: Record<string, string>  = { planejado: "PLANNED", carregando: "LOADING", embarcado: "SHIPPED", em_transito: "IN TRANSIT", entregue: "DELIVERED" };
const GRAIN_STATUS_PT: Record<string, string>  = { planejado: "PLANEJADO", carregando: "CARREGANDO", embarcado: "EMBARCADO", em_transito: "EM TRÂNSITO", entregue: "ENTREGUE" };
const GRAIN_STATUS_CLS: Record<string, string> = {
  planejado:  "border-gray-200 bg-gray-50 text-gray-600",
  carregando: "border-blue-200 bg-blue-50 text-blue-700",
  embarcado:  "border-indigo-200 bg-indigo-50 text-indigo-700",
  em_transito:"border-amber-200 bg-amber-50 text-amber-700",
  entregue:   "border-emerald-200 bg-emerald-50 text-emerald-700",
};

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    portal: "PIF Procurement Portal", pif: "PIF · Public Investment Fund · Saudi Arabia",
    hero: { title: "Brazilian Livestock · Export Intelligence", sub: "End-to-end traceability from farm to port" },
    kpi: { total: "Total Animals", eligible: "Export Eligible", halal: "Halal Certified", shipments: "Active Shipments", departure: "Next Departure", survival: "Survival Rate" },
    shipments: { title: "Active Shipments", lotId: "Lot ID", origin: "Origin", dest: "Destination", dep: "Departure", animals: "Animals", compliance: "Compliance", status: "Status", details: "View Details" },
    tracking: { title: "Live Shipment Tracking", noData: "No tracking data available yet.", animalsConf: "animals confirmed", loss: "loss", losses: "losses" },
    matrix: { title: "Animal Certification Matrix", all: "All", eligible: "Eligible", pending: "Pending", ineligible: "Ineligible", animal: "Animal", breed: "Breed", age: "Age", withdrawal: "Withdrawal", score: "Score", status: "Status", clear: "Clear", labelEligible: "ELIGIBLE", labelPending: "PENDING", labelIneligible: "INELIGIBLE" },
    species: { all: "All Species", cattle: "Cattle", sheep: "Sheep & Goats", poultry: "Poultry" },
    risk: { title: "Risk Intelligence", sanitary: "Sanitary Risk", compliance: "Compliance Risk", delivery: "Delivery Risk", low: "ON TRACK", medium: "MONITORED", high: "ACTION REQUIRED", withWithdrawal: "animals with active withdrawal", ineligible: "ineligible animals", lostInTransit: "animals lost in transit" },
    footer: "Powered by Agraas Intelligence Layer · Certified by MAPA · Real-time data",
    signOut: "Sign Out",
  },
  pt: {
    portal: "Portal de Compras PIF", pif: "PIF · Public Investment Fund · Saudi Arabia",
    hero: { title: "Pecuária Brasileira · Inteligência de Exportação", sub: "Rastreabilidade completa da fazenda ao porto" },
    kpi: { total: "Total de Animais", eligible: "Aptos para Exportação", halal: "Certificados Halal", shipments: "Embarques Ativos", departure: "Próximo Embarque", survival: "Taxa de Sobrevivência" },
    shipments: { title: "Embarques Ativos", lotId: "ID do Lote", origin: "Origem", dest: "Destino", dep: "Embarque", animals: "Animais", compliance: "Conformidade", status: "Status", details: "Ver Detalhes" },
    tracking: { title: "Rastreio de Embarques ao Vivo", noData: "Nenhum dado de rastreio disponível ainda.", animalsConf: "animais confirmados", loss: "perda", losses: "perdas" },
    matrix: { title: "Matriz de Certificações Animais", all: "Todos", eligible: "Aptos", pending: "Pendentes", ineligible: "Inaptos", animal: "Animal", breed: "Raça", age: "Idade", withdrawal: "Carência", score: "Score", status: "Status", clear: "Livre", labelEligible: "APTO", labelPending: "PENDENTE", labelIneligible: "INAPTO" },
    species: { all: "Todas", cattle: "Bovinos", sheep: "Ovinos", poultry: "Aves" },
    risk: { title: "Inteligência de Risco", sanitary: "Risco Sanitário", compliance: "Risco de Conformidade", delivery: "Risco de Entrega", low: "EM DIA", medium: "MONITORADO", high: "AÇÃO NECESSÁRIA", withWithdrawal: "animais com carência ativa", ineligible: "animais inaptos", lostInTransit: "animais perdidos em trânsito" },
    footer: "Powered by Agraas Intelligence Layer · Certificado pelo MAPA · Dados em tempo real",
    signOut: "Sair",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
function fmtAge(birth: string | null) {
  if (!birth) return "—";
  const m = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  return m >= 12 ? `${Math.floor(m / 12)}y ${m % 12}m` : `${m}m`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompradorView({
  buyerName, lots, assignments, animals, certifications, activeWithdrawals, scores, trackingCheckpoints,
  livestockAnimals, poultryBatches, grainShipments, grainTracking, grainFarms, grainFields,
}: {
  buyerName: string; lots: Lot[]; assignments: Assignment[]; animals: Animal[];
  certifications: Cert[]; activeWithdrawals: Withdrawal[]; scores: Score[];
  trackingCheckpoints: TrackingCheckpoint[];
  livestockAnimals: LivestockAnimal[];
  poultryBatches: PoultryBatch[];
  grainShipments: GrainShipment[];
  grainTracking: GrainTracking[];
  grainFarms: GrainFarm[];
  grainFields: GrainField[];
}) {
  const [lang, setLang]             = useState<"en" | "pt">("en");
  const [mainTab, setMainTab]       = useState<"livestock" | "grains">("livestock");
  const [filter, setFilter]         = useState<"all" | "eligible" | "pending" | "ineligible">("all");
  const [speciesFilter, setSpeciesFilter] = useState<"all" | "bovinos" | "ovinos" | "aves">("all");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [utcTime, setUtcTime]       = useState("");
  const router  = useRouter();
  const t       = T[lang];
  const locale  = lang === "en" ? "en-GB" : "pt-BR";

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().replace(" GMT", " UTC"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived maps ─────────────────────────────────────────────────────────────

  const animalsByLot = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of assignments) { const l = m.get(a.lot_id) ?? []; l.push(a.animal_id); m.set(a.lot_id, l); }
    return m;
  }, [assignments]);

  const certsByAnimal = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of certifications) { if (!m.has(c.animal_id)) m.set(c.animal_id, new Set()); m.get(c.animal_id)!.add(c.certification_name); }
    return m;
  }, [certifications]);

  const withdrawalsByAnimal = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const w of activeWithdrawals) { const l = m.get(w.animal_id) ?? []; l.push(w.withdrawal_date ?? ""); m.set(w.animal_id, l); }
    return m;
  }, [activeWithdrawals]);

  const scoreByAnimal = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scores) { const v = (s.score_json as Record<string, number> | null)?.total_score; if (v != null) m.set(s.animal_id, Number(v)); }
    return m;
  }, [scores]);

  const requiredCerts = lots[0]?.certificacoes_exigidas ?? [];

  const complianceRows = useMemo(() => animals.map(animal => {
    const certs       = certsByAnimal.get(animal.id) ?? new Set<string>();
    const score       = scoreByAnimal.get(animal.id) ?? 0;
    const withdrawals = withdrawalsByAnimal.get(animal.id) ?? [];
    const certsOk     = requiredCerts.every(c => certs.has(c));
    const status: "eligible" | "pending" | "ineligible" =
      score < 60 || withdrawals.length > 0 ? "ineligible" : !certsOk ? "pending" : "eligible";
    return { animal, certs, score, withdrawals, status };
  }), [animals, certsByAnimal, scoreByAnimal, withdrawalsByAnimal, requiredCerts]);

  const lotCompliance = useMemo(() => lots.map(lot => {
    const ids      = animalsByLot.get(lot.id) ?? [];
    const eligible = ids.filter(id => complianceRows.find(r => r.animal.id === id)?.status === "eligible").length;
    return { lot, total: ids.length, eligible, pct: ids.length ? Math.round((eligible / ids.length) * 100) : 0 };
  }), [lots, animalsByLot, complianceRows]);

  const filteredRows = useMemo(() =>
    filter === "all" ? complianceRows : complianceRows.filter(r => r.status === filter),
  [complianceRows, filter]);

  // ── Livestock (ovinos/caprinos) derived rows ──────────────────────────────────

  const livestockRows = useMemo(() => livestockAnimals.map(a => {
    const hasHalal = a.certifications?.includes("Halal") ?? false;
    const score    = a.score ?? 0;
    const status: "eligible" | "pending" | "ineligible" =
      score < 60 ? "ineligible" : "eligible";
    return { ...a, hasHalal, score, status };
  }), [livestockAnimals]);

  const filteredLivestockRows = useMemo(() =>
    filter === "all" ? livestockRows : livestockRows.filter(r => r.status === filter),
  [livestockRows, filter]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const totalAnimals  = animals.length + livestockAnimals.length + poultryBatches.length;
  const eligibleCount = complianceRows.filter(r => r.status === "eligible").length;
  const halalCount    =
    animals.filter(a => certsByAnimal.get(a.id)?.has("Halal")).length +
    livestockAnimals.filter(a => a.certifications?.includes("Halal")).length +
    poultryBatches.filter(b => b.halal_certified).length;
  const nextDeparture = lots.map(l => l.data_embarque).filter(Boolean).sort()[0] ?? null;
  const daysToNext    = daysUntil(nextDeparture);

  const survivalRate = useMemo(() => {
    if (!trackingCheckpoints.length) return null;
    const started = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? null;
    const lastCp  = trackingCheckpoints.reduce<TrackingCheckpoint | null>(
      (a, b) => !a || new Date(b.timestamp) > new Date(a.timestamp) ? b : a, null);
    const alive   = lastCp?.animals_confirmed ?? null;
    return started && alive ? Math.round((alive / started) * 100) : null;
  }, [trackingCheckpoints]);

  // ── Risk scores ───────────────────────────────────────────────────────────────

  const sanitaryRisk = useMemo(() => {
    const n   = activeWithdrawals.length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct <= 15 ? "medium" : "high") as "low"|"medium"|"high", count: n };
  }, [activeWithdrawals, totalAnimals]);

  const complianceRisk = useMemo(() => {
    const n   = complianceRows.filter(r => r.status === "ineligible").length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct <= 20 ? "medium" : "high") as "low"|"medium"|"high", count: n };
  }, [complianceRows, totalAnimals]);

  const deliveryRisk = useMemo(() => {
    const totalLost = trackingCheckpoints.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
    const started   = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? totalAnimals;
    const pct       = started ? Math.round((totalLost / started) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct < 2 ? "medium" : "high") as "low"|"medium"|"high", count: totalLost };
  }, [trackingCheckpoints, totalAnimals]);

  // ── Contextual risk messages ──────────────────────────────────────────────────

  const sanitaryMessage = useMemo(() => {
    const n = activeWithdrawals.length;
    if (n === 0) return lang === "en" ? "On track — No active withdrawal periods" : "Em dia — Sem carências ativas";
    const dates = activeWithdrawals.map(w => w.withdrawal_date).filter(Boolean) as string[];
    const latest = dates.sort().pop()!;
    const clearDate = new Date(latest).toLocaleDateString(lang === "en" ? "en-GB" : "pt-BR", { day: "2-digit", month: "short" });
    return lang === "en"
      ? `Under control — ${n} animal${n > 1 ? "s" : ""} in withdrawal period, clears ${clearDate}`
      : `Monitorado — ${n} animal${n > 1 ? "is" : ""} em carência, termina ${clearDate}`;
  }, [activeWithdrawals, lang]);

  const complianceMessage = useMemo(() => {
    const pending    = complianceRows.filter(r => r.status === "pending").length;
    const ineligible = complianceRows.filter(r => r.status === "ineligible").length;
    if (pending === 0 && ineligible === 0)
      return lang === "en" ? "On track — All animals compliant" : "Em dia — Todos os animais conformes";
    if (pending > 0)
      return lang === "en"
        ? `Action required — ${pending} animal${pending > 1 ? "s" : ""} pending certification`
        : `Ação necessária — ${pending} animal${pending > 1 ? "is" : ""} com certificação pendente`;
    return lang === "en"
      ? `Under review — ${ineligible} animal${ineligible > 1 ? "s" : ""} ineligible`
      : `Em revisão — ${ineligible} animal${ineligible > 1 ? "is" : ""} inapto${ineligible > 1 ? "s" : ""}`;
  }, [complianceRows, lang]);

  const deliveryMessage = useMemo(() => {
    const totalLost = deliveryRisk.count;
    if (totalLost === 0) return lang === "en" ? "On track — 0 losses in transit" : "Em dia — 0 perdas em trânsito";
    return lang === "en"
      ? `Monitored — ${totalLost} loss${totalLost > 1 ? "es" : ""} recorded, within acceptable range`
      : `Monitorado — ${totalLost} perda${totalLost > 1 ? "s" : ""} registrada${totalLost > 1 ? "s" : ""}`;
  }, [deliveryRisk.count, lang]);

  // ── Grain derived values ──────────────────────────────────────────────────────

  const fieldFarmMap  = useMemo(() => new Map(grainFields.map(f => [f.id, f.farm_id])), [grainFields]);
  const farmCarMap    = useMemo(() => new Map(grainFarms.map(f => [f.id, !!f.car_number])), [grainFarms]);

  const grainStageMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of grainTracking) { if (!m.has(t.shipment_id)) m.set(t.shipment_id, t.stage); }
    return m;
  }, [grainTracking]);

  const grainConfirmedMap = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const t of grainTracking) { if (!m.has(t.shipment_id)) m.set(t.shipment_id, t.quantity_confirmed_tons); }
    return m;
  }, [grainTracking]);

  const activeGrainShipments = useMemo(() => grainShipments.filter(s => s.status !== "entregue"), [grainShipments]);
  const grainTonsInTransit   = useMemo(() => activeGrainShipments.reduce((s, sh) => s + Number(sh.quantity_tons), 0), [activeGrainShipments]);
  const grainCultureCount    = useMemo(() => new Set(grainShipments.map(s => s.culture)).size, [grainShipments]);

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── Risk style helpers ────────────────────────────────────────────────────────

  const riskBorderColor = { low: "#22c55e", medium: "#f59e0b", high: "#f59e0b" } as const;
  const riskBadgeCls    = {
    low:    "border-emerald-200 bg-emerald-50 text-emerald-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    high:   "border-amber-200 bg-amber-50 text-amber-700",
  } as const;
  const riskValueCls    = { low: "text-emerald-600", medium: "text-amber-600", high: "text-amber-600" } as const;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-8">

      {/* ═══ HERO ════════════════════════════════════════════════════════════════ */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.1)_0%,rgba(122,168,76,0)_70%)]" />

          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="ag-badge ag-badge-green">{t.pif}</span>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                LIVE
              </span>
              <span className="hidden font-mono text-xs text-[var(--text-muted)] sm:block">{utcTime}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Lang toggle */}
              <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                {(["en", "pt"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${lang === l ? "bg-[var(--primary-hover)] text-white" : "bg-white text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={handleSignOut}
                className="ag-button-secondary text-xs">
                {t.signOut}
              </button>
            </div>
          </div>

          <div className="mt-1 text-xs text-[var(--text-muted)] sm:hidden">{utcTime}</div>

          <h1 className="ag-page-title mt-5">{t.hero.title}</h1>
          <p className="mt-2 text-[1rem] leading-7 text-[var(--text-secondary)]">{t.hero.sub}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{buyerName}</p>
        </div>
      </section>

      {/* ═══ MODULE TABS ════════════════════════════════════════════════════════ */}
      <div className="flex overflow-hidden rounded-2xl border border-[var(--border)] bg-white w-fit">
        {([
          { k: "livestock", label: lang === "en" ? "Livestock & Certifications" : "Pecuária & Certificações", icon: Beef },
          { k: "grains",    label: lang === "en" ? "Grains & Commodities"       : "Grãos & Commodities",       icon: Ship },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setMainTab(k)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition ${mainTab === k ? "bg-[var(--primary-hover)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ═══ 6 KPI CARDS ════════════════════════════════════════════════════════ */}
      {mainTab === "livestock" && <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Beef,        label: t.kpi.total,     value: `${totalAnimals}`,  cls: "text-[var(--text-primary)]", halalBadge: false },
          { icon: CheckCircle2,label: t.kpi.eligible,  value: eligibleCount, cls: "text-emerald-600",           halalBadge: false },
          { icon: ShieldCheck, label: t.kpi.halal,     value: halalCount,    cls: "text-amber-600",             halalBadge: true  },
          { icon: Truck,       label: t.kpi.shipments, value: lots.length,   cls: "text-blue-600",              halalBadge: false },
          { icon: Clock,       label: t.kpi.departure, value: daysToNext != null ? `T−${daysToNext}` : fmtDate(nextDeparture, locale), cls: "text-purple-600", halalBadge: false },
          { icon: Activity,    label: t.kpi.survival,  value: survivalRate != null ? `${survivalRate}%` : "—", cls: survivalRate == null ? "text-[var(--text-muted)]" : survivalRate >= 98 ? "text-emerald-600" : "text-amber-600", halalBadge: false },
        ].map(({ icon: Icon, label, value, cls, halalBadge }) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Icon size={13} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
            </div>
            {halalBadge && halalCount > 0 ? (
              <div className="mt-2 flex items-center gap-2" title="Animais com certificação Halal ativa">
                <HalalBadgeSVG size={48} />
                <p className={`text-3xl font-bold tracking-tight ${cls}`}>{value}</p>
              </div>
            ) : (
              <p className={`mt-3 text-3xl font-bold tracking-tight ${cls}`}>{value}</p>
            )}
          </div>
        ))}
      </section>}

      {/* ═══ ACTIVE SHIPMENTS ════════════════════════════════════════════════════ */}
      {mainTab === "livestock" && <>
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
          <h2 className="font-semibold text-white">{t.shipments.title}</h2>
          <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
            {lots.length} lot{lots.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {[t.shipments.lotId, t.shipments.origin, t.shipments.dest, t.shipments.dep, t.shipments.animals, t.shipments.compliance, t.shipments.status, ""].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lotCompliance.map(({ lot, total, eligible, pct }, idx) => {
                const barColor  = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                const pctCls    = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
                const days      = daysUntil(lot.data_embarque);
                return (
                  <tr key={lot.id} className={`hover:bg-[var(--surface-soft)] transition-colors ${idx < lotCompliance.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{lot.name}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{lot.porto_embarque ?? "—"}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{lot.pais_destino ?? "—"}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {fmtDate(lot.data_embarque, locale)}
                      {days != null && <span className="ml-2 text-[10px] font-bold text-purple-600">T−{days}</span>}
                    </td>
                    <td className="px-5 py-4 text-xl font-bold text-[var(--text-primary)]">{total}</td>
                    <td className="px-5 py-4">
                      <div className="min-w-[120px]">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className={`text-lg font-bold ${pctCls}`}>{pct}%</span>
                          <span className="text-xs text-[var(--text-muted)]">{eligible}/{total}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${lot.status === "closed" ? "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {lot.status ?? "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="ag-button-secondary text-xs whitespace-nowrap">{t.shipments.details} →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ LIVE SHIPMENT TRACKING ══════════════════════════════════════════════ */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
          <h2 className="font-semibold text-white">{t.tracking.title}</h2>
        </div>

        {trackingCheckpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin size={28} className="mb-3 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t.tracking.noData}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {lots.map(lot => {
              const cps = trackingCheckpoints.filter(c => c.lot_id === lot.id);
              if (!cps.length) return null;
              const completedSet = new Set(cps.map(c => c.stage));
              const currentIdx   = TRACKING_STAGES.findIndex(s => !completedSet.has(s.key));
              const totalLost    = cps.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
              const lastConfCp   = [...cps].reverse().find(c => c.animals_confirmed != null);

              return (
                <div key={lot.id} className="p-6 lg:p-8">
                  {/* Lot header */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{lot.name}</span>
                      {lot.pais_destino && <span className="text-xs text-[var(--text-muted)]">→ {lot.pais_destino}</span>}
                      {lot.certificacoes_exigidas?.includes("Halal") && <HalalBadgeSVG size={32} />}
                    </div>
                    <div className="flex items-center gap-3">
                      {lastConfCp?.animals_confirmed != null && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          <span className="text-base font-bold text-emerald-600">{lastConfCp.animals_confirmed}</span>
                          {" "}{t.tracking.animalsConf}
                        </span>
                      )}
                      {totalLost > 0 && (
                        <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          <AlertTriangle size={11} />
                          {totalLost} {totalLost === 1 ? t.tracking.loss : t.tracking.losses}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ship map — shown when lot is at sea */}
                  {completedSet.has("navio") && !completedSet.has("entregue") && lot.data_embarque && (
                    <div className="mb-6">
                      <ShipTrackingMapWrapper
                        departureDate={lot.data_embarque}
                        arrivalDate={lot.arrival_date}
                        shipName={lot.ship_name}
                        animalsOnBoard={lastConfCp?.animals_confirmed ?? 0}
                        lotName={lot.name}
                        originPort={lot.porto_embarque}
                        destinationPort={lot.pais_destino}
                      />
                    </div>
                  )}

                  {/* Horizontal stage bar */}
                  <div className="flex items-start">
                    {TRACKING_STAGES.map((stage, i) => {
                      const isDone    = completedSet.has(stage.key);
                      const isCurrent = currentIdx === i;
                      const cp        = cps.find(c => c.stage === stage.key);
                      const isLast    = i === TRACKING_STAGES.length - 1;

                      return (
                        <div key={stage.key} className="relative flex flex-1 flex-col items-center">
                          {/* Connector */}
                          {!isLast && (
                            <div className="absolute top-[11px] left-1/2 h-0.5 w-full z-0"
                              style={isDone
                                ? { background: "#22c55e" }
                                : { backgroundImage: "repeating-linear-gradient(90deg,#d1d5db 0,#d1d5db 5px,transparent 5px,transparent 10px)" }
                              }
                            />
                          )}

                          {/* Dot */}
                          <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            isDone    ? "border-emerald-500 bg-emerald-500"
                            : isCurrent ? "border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                            : "border-[var(--border)] bg-white"
                          }`}>
                            {isDone    && <span className="text-[10px] font-black text-white">✓</span>}
                            {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>

                          {/* Stage label */}
                          <p className={`mt-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.07em] max-w-[64px] ${
                            isDone ? "text-emerald-600" : isCurrent ? "text-blue-600" : "text-[var(--text-muted)]"
                          }`}>
                            {lang === "en" ? stage.en : stage.pt}
                          </p>

                          {/* Location */}
                          {cp?.location_name && (
                            <p className={`mt-1 text-center text-[8px] leading-tight max-w-[72px] ${isCurrent ? "font-semibold text-blue-500" : "text-[var(--text-muted)]"}`}>
                              {cp.location_name}
                            </p>
                          )}

                          {/* Losses */}
                          {cp && cp.animals_lost > 0 && (
                            <div className="mt-1 text-center">
                              <span className="text-[10px] font-bold text-red-600">▼{cp.animals_lost}</span>
                              {cp.loss_cause && <p className="text-[7.5px] text-red-400 leading-tight max-w-[72px]">{cp.loss_cause}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ ANIMAL CERTIFICATION MATRIX ════════════════════════════════════════ */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-semibold text-white">{t.matrix.title}</h2>
            {/* Species filter */}
            <div className="flex overflow-hidden rounded-lg border border-white/25">
              {([
                { k: "all",     l: t.species.all,     icon: null    },
                { k: "bovinos", l: t.species.cattle,   icon: Beef    },
                { k: "ovinos",  l: t.species.sheep,    icon: Rabbit  },
                { k: "aves",    l: t.species.poultry,  icon: Bird    },
              ] as const).map(f => {
                const Icon = f.icon;
                return (
                  <button key={f.k} onClick={() => setSpeciesFilter(f.k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition ${speciesFilter === f.k ? "bg-white text-[var(--primary-hover)]" : "bg-transparent text-white/70 hover:bg-white/10"}`}>
                    {Icon && <Icon size={10} />}{f.l}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Status filter — only for bovinos/ovinos/all */}
          {speciesFilter !== "aves" && (
            <div className="flex overflow-hidden rounded-lg border border-white/25 w-fit">
              {([
                { k: "all",        l: t.matrix.all },
                { k: "eligible",   l: t.matrix.eligible },
                { k: "pending",    l: t.matrix.pending },
                { k: "ineligible", l: t.matrix.ineligible },
              ] as const).map(f => (
                <button key={f.k} onClick={() => setFilter(f.k)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition ${filter === f.k ? "bg-white/20 text-white" : "bg-transparent text-white/55 hover:bg-white/10"}`}>
                  {f.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Bovinos table (all / bovinos) ── */}
        {(speciesFilter === "all" || speciesFilter === "bovinos") && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                  {[t.matrix.animal, t.matrix.breed, t.matrix.age, "Halal", "MAPA", "GTA", "SIF", t.matrix.withdrawal, t.matrix.score, t.matrix.status].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap ${i > 2 ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No cattle data available.</td></tr>
                ) : filteredRows.map(({ animal, certs, score, withdrawals, status }) => {
                  const sc = status === "eligible" ? "text-emerald-600" : status === "pending" ? "text-amber-600" : "text-red-600";
                  const sbadge = status === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "pending" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700";
                  const sl = status === "eligible" ? t.matrix.labelEligible : status === "pending" ? t.matrix.labelPending : t.matrix.labelIneligible;
                  return (
                    <tr key={animal.id}
                      onMouseEnter={() => setHoveredRow(animal.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`border-b border-[var(--border)] transition-colors ${hoveredRow === animal.id ? "bg-[var(--primary-soft)]" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{animal.nickname ?? animal.internal_code ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{animal.breed ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtAge(animal.birth_date)}</td>
                      {CERT_LIST.map(cert => (
                        <td key={cert} className="px-4 py-3 text-center">
                          {cert === "Halal" && certs.has(cert) && status === "eligible" ? (
                            <div className="flex justify-center"><HalalBadgeSVG size={40} /></div>
                          ) : (
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold ${certs.has(cert) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>
                              {certs.has(cert) ? "✓" : "—"}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        {withdrawals.length === 0
                          ? <span className="text-xs font-semibold text-emerald-600">{t.matrix.clear}</span>
                          : <span className="text-xs font-semibold text-red-600">{new Date(withdrawals[0]).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>}
                      </td>
                      <td className={`px-4 py-3 text-center text-base font-bold ${score >= 75 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : sc}`}>{score > 0 ? score : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${sbadge}`}>{sl}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Ovinos/Caprinos table ── */}
        {speciesFilter === "ovinos" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                  {[t.matrix.animal, t.matrix.breed, "Espécie", t.matrix.age, "Halal", t.matrix.score, t.matrix.status].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap ${i > 3 ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLivestockRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No sheep/goat data available.</td></tr>
                ) : filteredLivestockRows.map(row => {
                  const sbadge = row.status === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700";
                  const sl = row.status === "eligible" ? t.matrix.labelEligible : t.matrix.labelIneligible;
                  const scoreCls = row.score >= 75 ? "text-emerald-600" : row.score >= 60 ? "text-amber-600" : "text-red-600";
                  return (
                    <tr key={row.id}
                      onMouseEnter={() => setHoveredRow(row.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`border-b border-[var(--border)] transition-colors ${hoveredRow === row.id ? "bg-[var(--primary-soft)]" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{row.internal_code ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{row.breed ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{row.species}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtAge(row.birth_date)}</td>
                      <td className="px-4 py-3 text-center">
                        {row.hasHalal ? (
                          <div className="flex justify-center"><HalalBadgeSVG size={40} /></div>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-[10px] font-bold text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-center text-base font-bold ${scoreCls}`}>{row.score > 0 ? row.score : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${sbadge}`}>{sl}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Aves/Frangos table ── */}
        {speciesFilter === "aves" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                  {["Lote", "Espécie", "Aves", "Mortalidade", "Conv. Alimentar", "Halal Abatedouro", "Status"].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap ${i >= 2 ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {poultryBatches.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No poultry batch data available.</td></tr>
                ) : poultryBatches.map(b => {
                  const mort    = b.initial_count > 0 ? ((b.mortality_count / b.initial_count) * 100).toFixed(1) : "—";
                  const highMort = Number(mort) > 5;
                  const STATUS_BADGE: Record<string, string> = {
                    alojado:       "border-blue-200 bg-blue-50 text-blue-700",
                    em_crescimento:"border-emerald-200 bg-emerald-50 text-emerald-700",
                    pronto_abate:  "border-amber-200 bg-amber-50 text-amber-700",
                    abatido:       "border-gray-200 bg-gray-50 text-gray-600",
                  };
                  const STATUS_LABEL: Record<string, string> = {
                    alojado: "HOUSED", em_crescimento: "GROWING", pronto_abate: "READY", abatido: "SLAUGHTERED",
                  };
                  return (
                    <tr key={b.id}
                      onMouseEnter={() => setHoveredRow(b.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`border-b border-[var(--border)] transition-colors ${hoveredRow === b.id ? "bg-[var(--primary-soft)]" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{b.batch_code}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{b.species}{b.breed ? ` · ${b.breed}` : ""}</td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">{b.current_count.toLocaleString("pt-BR")}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${highMort ? "text-red-600" : "text-emerald-600"}`}>
                        {mort}%{highMort && <AlertTriangle size={11} className="inline ml-1" />}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{b.feed_conversion ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {b.halal_certified ? (
                          <div className="flex justify-center"><HalalBadgeSVG size={40} /></div>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-[10px] font-bold text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${STATUS_BADGE[b.status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ RISK INTELLIGENCE ═══════════════════════════════════════════════════ */}
      <section>
        <h2 className="ag-section-title mb-5">{t.risk.title}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t.risk.sanitary,   data: sanitaryRisk,   message: sanitaryMessage,   icon: ShieldAlert },
            { label: t.risk.compliance, data: complianceRisk, message: complianceMessage, icon: ShieldCheck },
            { label: t.risk.delivery,   data: deliveryRisk,   message: deliveryMessage,   icon: Truck },
          ].map(({ label, data, message, icon: Icon }) => {
            const rl     = data.level === "low" ? t.risk.low : data.level === "medium" ? t.risk.medium : t.risk.high;
            const border = riskBorderColor[data.level];
            const badge  = riskBadgeCls[data.level];
            const valCls = riskValueCls[data.level];
            return (
              <div key={label} className="rounded-3xl border border-[var(--border)] bg-white p-6"
                style={{ borderLeft: `4px solid ${border}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Icon size={14} />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${badge}`}>{rl}</span>
                </div>
                <p className={`mt-4 text-sm font-semibold leading-snug ${valCls}`}>{message}</p>
                <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">{data.score}% risk index</p>
              </div>
            );
          })}
        </div>
      </section>
      </>}

      {/* ═══ GRAINS & COMMODITIES ════════════════════════════════════════════════ */}
      {mainTab === "grains" && (
        <div className="space-y-8">
          {/* Grain KPIs */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Ship,  label: lang === "en" ? "Active Shipments"   : "Embarques ativos",      value: activeGrainShipments.length, cls: "text-blue-600" },
              { icon: Wheat, label: lang === "en" ? "Tons in Transit"     : "Toneladas em trânsito", value: grainTonsInTransit.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " t", cls: "text-amber-600" },
              { icon: Wheat, label: lang === "en" ? "Cultures Tracked"    : "Culturas rastreadas",   value: grainCultureCount, cls: "text-emerald-600" },
            ].map(({ icon: Icon, label, value, cls }) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Icon size={13} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
                </div>
                <p className={`mt-3 text-3xl font-bold tracking-tight ${cls}`}>{value}</p>
              </div>
            ))}
          </section>

          {/* Grain shipments table */}
          <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
              <h2 className="font-semibold text-white">{lang === "en" ? "Grain Shipments" : "Embarques de Grãos"}</h2>
              <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
                {grainShipments.length} {lang === "en" ? "shipments" : "embarques"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                    {(lang === "en"
                      ? ["Contract", "Culture", "Tons", "Origin → Destination", "Vessel", "Departure", "CAR", "Status"]
                      : ["Contrato", "Cultura", "Toneladas", "Origem → Destino", "Navio", "Partida", "CAR", "Status"]
                    ).map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grainShipments.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                      {lang === "en" ? "No grain shipments available." : "Nenhum embarque de grãos disponível."}
                    </td></tr>
                  ) : grainShipments.map((sh, idx) => {
                    const farmId  = sh.field_id ? fieldFarmMap.get(sh.field_id) : null;
                    const hasCar  = farmId ? (farmCarMap.get(farmId) ?? false) : false;
                    const cultureLabel = lang === "en" ? (CULTURE_LABEL_EN[sh.culture] ?? sh.culture) : (CULTURE_LABEL_PT[sh.culture] ?? sh.culture);
                    const statusLabel  = lang === "en" ? (GRAIN_STATUS_EN[sh.status] ?? sh.status) : (GRAIN_STATUS_PT[sh.status] ?? sh.status);
                    return (
                      <tr key={sh.id} className={`transition-colors hover:bg-[var(--surface-soft)] ${idx < grainShipments.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                          {sh.contract_number ?? sh.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{cultureLabel}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                          {Number(sh.quantity_tons).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                          {sh.origin_port ?? "—"} → {sh.destination_port ?? sh.destination_country ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{sh.vessel_name ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(sh.departure_date, locale)}</td>
                        <td className="px-4 py-3">
                          {hasCar ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              ✓ CAR
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${GRAIN_STATUS_CLS[sh.status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Grain tracking timelines — active shipments only */}
          {activeGrainShipments.length > 0 && (
            <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
              <div className="border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
                <h2 className="font-semibold text-white">
                  {lang === "en" ? "Grain Shipment Tracking" : "Rastreio de Embarques de Grãos"}
                </h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {activeGrainShipments.map(sh => {
                  const currentStage   = grainStageMap.get(sh.id) ?? null;
                  const stageIdx       = currentStage ? GRAIN_STAGES.findIndex(s => s.key === currentStage) : -1;
                  const confirmedTons  = grainConfirmedMap.get(sh.id) ?? null;
                  const cultureLabel   = lang === "en" ? (CULTURE_LABEL_EN[sh.culture] ?? sh.culture) : (CULTURE_LABEL_PT[sh.culture] ?? sh.culture);
                  const farmId         = sh.field_id ? fieldFarmMap.get(sh.field_id) : null;
                  const hasCar         = farmId ? (farmCarMap.get(farmId) ?? false) : false;

                  return (
                    <div key={sh.id} className="p-6 lg:p-8">
                      {/* Header */}
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                            {sh.contract_number ?? sh.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{cultureLabel} · {sh.destination_port ?? sh.destination_country ?? "—"}</span>
                          {hasCar && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              ✓ {lang === "en" ? "CAR Certified" : "CAR Certificado"}
                            </span>
                          )}
                        </div>
                        {confirmedTons != null && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            <span className="text-base font-bold text-emerald-600">
                              {Number(confirmedTons).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} t
                            </span>{" "}
                            {lang === "en" ? "confirmed" : "confirmadas"}
                          </span>
                        )}
                      </div>

                      {/* Horizontal 7-stage timeline */}
                      <div className="flex items-start">
                        {GRAIN_STAGES.map((stage, i) => {
                          const isDone    = stageIdx >= 0 && i <= stageIdx;
                          const isCurrent = i === stageIdx + 1;
                          const isLast    = i === GRAIN_STAGES.length - 1;
                          return (
                            <div key={stage.key} className="relative flex flex-1 flex-col items-center">
                              {!isLast && (
                                <div className="absolute top-[11px] left-1/2 h-0.5 w-full z-0"
                                  style={isDone
                                    ? { background: "#22c55e" }
                                    : { backgroundImage: "repeating-linear-gradient(90deg,#d1d5db 0,#d1d5db 5px,transparent 5px,transparent 10px)" }
                                  }
                                />
                              )}
                              <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                isDone    ? "border-emerald-500 bg-emerald-500"
                                : isCurrent ? "border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                                : "border-[var(--border)] bg-white"
                              }`}>
                                {isDone    && <span className="text-[10px] font-black text-white">✓</span>}
                                {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                              </div>
                              <p className={`mt-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.07em] max-w-[64px] ${
                                isDone ? "text-emerald-600" : isCurrent ? "text-blue-600" : "text-[var(--text-muted)]"
                              }`}>
                                {lang === "en" ? stage.en : stage.pt}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border)] pt-6 pb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">{t.footer}</p>
        <p className="font-mono text-xs text-[var(--text-muted)]">{utcTime}</p>
      </footer>

    </main>
  );
}
