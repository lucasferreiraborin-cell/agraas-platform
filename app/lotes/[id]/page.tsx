"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { use } from "react";
import { calculateDailyGain } from "@/lib/agraas-analytics";
import ExportConformityReport from "@/app/components/ExportConformityReport";
import ExportRouteMap from "@/app/components/ExportRouteMap";
import TrackingTimeline from "@/app/components/TrackingTimeline";
import { FileText, Upload } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import DownloadLotPDFButton from "@/app/components/DownloadLotPDFButton";

const SCORE_MINIMO_EXPORT = 60;

type LotRow = {
  id: string; name: string; description: string | null;
  objective: string | null; start_date: string | null;
  target_weight: number | null; status: string | null; property_id: string | null;
  pais_destino: string | null; porto_embarque: string | null; data_embarque: string | null;
  certificacoes_exigidas: string[] | null; numero_contrato: string | null;
  client_id: string | null;
};
type AnimalInLot = {
  id: string; internal_code: string | null; nickname: string | null;
  sex: string | null; breed: string | null; birth_date: string | null;
  blood_type: string | null; sire_animal_id: string | null; dam_animal_id: string | null;
  assignment_id: string;
};
type SearchAnimal = { id: string; internal_code: string | null; nickname: string | null };
type WeightRow = { animal_id: string; weight: number; weighing_date: string | null };
type ApplicationRow = { animal_id: string; withdrawal_date: string | null; product_name: string | null };
type CertRow = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type PassportCacheRow = { animal_id: string; score_json: Record<string, unknown> | null };
type TrackingCheckpoint = {
  id: string; stage: string; timestamp: string;
  animals_confirmed: number | null; animals_lost: number;
  loss_cause: string | null; location_name: string | null;
  location_lat: number | null; location_lng: number | null;
  responsible_name: string | null; notes: string | null;
};

type Tab = "overview" | "animals" | "tracking" | "documents";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Visão Geral" },
  { key: "animals",    label: "Animais & Compliance" },
  { key: "tracking",   label: "Tracking" },
  { key: "documents",  label: "Documentos" },
];

export default function LoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lot, setLot] = useState<LotRow | null>(null);
  const [animals, setAnimals] = useState<AnimalInLot[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [certifications, setCertifications] = useState<CertRow[]>([]);
  const [passportScores, setPassportScores] = useState<PassportCacheRow[]>([]);
  const [trackingCheckpoints, setTrackingCheckpoints] = useState<TrackingCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchAnimal[]>([]);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Read initial tab from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tab = new URL(window.location.href).searchParams.get("tab") as Tab | null;
      if (tab && TABS.some(t => t.key === tab)) setActiveTab(tab);
    }
  }, []);

  async function loadData() {
    const [{ data: lotData }, { data: assignData }] = await Promise.all([
      supabase.from("lots")
        .select("id, name, description, objective, start_date, target_weight, status, property_id, pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, numero_contrato, client_id")
        .eq("id", id).single(),
      supabase.from("animal_lot_assignments")
        .select("id, animal_id")
        .eq("lot_id", id).is("exit_date", null),
    ]);
    const lotRow = (lotData as LotRow) ?? null;
    setLot(lotRow);

    const assignments = (assignData ?? []) as { id: string; animal_id: string }[];
    const animalIds = assignments.map((a) => a.animal_id);

    // Fetch tracking in parallel with animal data
    const trackingPromise = supabase
      .from("shipment_tracking")
      .select("id, stage, timestamp, animals_confirmed, animals_lost, loss_cause, location_name, location_lat, location_lng, responsible_name, notes")
      .eq("lot_id", id)
      .order("timestamp", { ascending: true });

    if (animalIds.length === 0) {
      const { data: tData } = await trackingPromise;
      setTrackingCheckpoints((tData ?? []) as TrackingCheckpoint[]);
      setLoading(false);
      return;
    }

    const [
      { data: animalsData },
      { data: wData },
      { data: appData },
      { data: certData },
      { data: cacheData },
      { data: tData },
    ] = await Promise.all([
      supabase.from("animals")
        .select("id, internal_code, nickname, sex, breed, birth_date, blood_type, sire_animal_id, dam_animal_id")
        .in("id", animalIds),
      supabase.from("weights")
        .select("animal_id, weight, weighing_date")
        .in("animal_id", animalIds)
        .order("weighing_date", { ascending: false }),
      supabase.from("applications")
        .select("animal_id, withdrawal_date, product_name")
        .in("animal_id", animalIds),
      supabase.from("animal_certifications")
        .select("animal_id, certification_name, status, expires_at")
        .in("animal_id", animalIds)
        .neq("status", "expired"),
      supabase.from("agraas_master_passport_cache")
        .select("animal_id, score_json")
        .in("animal_id", animalIds),
      trackingPromise,
    ]);

    const assignmentIdByAnimal = new Map(assignments.map((a) => [a.animal_id, a.id]));
    const animalList = ((animalsData ?? []) as Omit<AnimalInLot, "assignment_id">[]).map((a) => ({
      ...a,
      assignment_id: assignmentIdByAnimal.get(a.id) ?? "",
    }));

    setAnimals(animalList);
    setWeights((wData as WeightRow[]) ?? []);
    setApplications((appData as ApplicationRow[]) ?? []);
    setCertifications((certData as CertRow[]) ?? []);
    setPassportScores((cacheData as PassportCacheRow[]) ?? []);
    setTrackingCheckpoints((tData ?? []) as TrackingCheckpoint[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const existingIds = animals.map(a => a.id);
      const { data } = await supabase.from("animals").select("id, internal_code, nickname")
        .ilike("internal_code", `%${searchQuery}%`).limit(6);
      setSearchResults(((data ?? []) as SearchAnimal[]).filter(a => !existingIds.includes(a.id)));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, animals]);

  async function addAnimal(animalId: string) {
    setAdding(true);
    await supabase.from("animal_lot_assignments").insert({
      lot_id: id, animal_id: animalId,
      entry_date: new Date().toISOString().slice(0, 10),
    });
    await loadData();
    setSearchQuery(""); setSearchResults([]);
    setAdding(false);
  }

  async function removeAnimal(assignmentId: string) {
    await supabase.from("animal_lot_assignments")
      .update({ exit_date: new Date().toISOString().slice(0, 10) })
      .eq("id", assignmentId);
    setAnimals(prev => prev.filter(a => a.assignment_id !== assignmentId));
  }

  const isExportLot = lot?.objective === "Exportação";
  const today = new Date();

  const weightByAnimal = useMemo(() => {
    const map = new Map<string, WeightRow[]>();
    for (const w of weights) {
      const list = map.get(w.animal_id) ?? [];
      list.push(w);
      map.set(w.animal_id, list);
    }
    return map;
  }, [weights]);

  const activeCarenciasByAnimal = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of applications) {
      if (a.withdrawal_date && new Date(a.withdrawal_date) > today) {
        const list = map.get(a.animal_id) ?? [];
        list.push(a.product_name ?? "produto");
        map.set(a.animal_id, list);
      }
    }
    return map;
  }, [applications]);

  const certsByAnimal = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of certifications) {
      if (c.status === "active" && (!c.expires_at || new Date(c.expires_at) > today)) {
        const list = map.get(c.animal_id) ?? [];
        list.push(c.certification_name);
        map.set(c.animal_id, list);
      }
    }
    return map;
  }, [certifications]);

  const scoreByAnimal = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of passportScores) {
      const overall = (p.score_json as any)?.total_score;
      if (overall != null) map.set(p.animal_id, Number(overall));
    }
    return map;
  }, [passportScores]);

  const stats = useMemo(() => {
    let totalGmd = 0; let gmdCount = 0;
    let totalScore = 0; let atMeta = 0;
    const avgWeights: number[] = [];
    for (const animal of animals) {
      const aw = weightByAnimal.get(animal.id) ?? [];
      const last = aw[0] ? Number(aw[0].weight) : null;
      const prev = aw[1] ? Number(aw[1].weight) : null;
      const gmd = calculateDailyGain(last, prev, aw[0]?.weighing_date, aw[1]?.weighing_date);
      if (gmd !== null) { totalGmd += gmd; gmdCount++; }
      if (lot?.target_weight && last && last >= lot.target_weight) atMeta++;
      if (last) avgWeights.push(last);
      const score = scoreByAnimal.get(animal.id) ?? 0;
      totalScore += score;
    }
    const avgGmd = gmdCount > 0 ? (totalGmd / gmdCount).toFixed(3) : null;
    const avgScore = animals.length > 0 ? Math.round(totalScore / animals.length) : null;
    const avgWeight = avgWeights.length > 0 ? avgWeights.reduce((s, w) => s + w, 0) / avgWeights.length : 0;
    let previsaoSaida: string | null = null;
    if (lot?.target_weight && avgGmd && Number(avgGmd) > 0 && avgWeight < lot.target_weight) {
      const dias = Math.round((lot.target_weight - avgWeight) / Number(avgGmd));
      const d = new Date(); d.setDate(d.getDate() + dias);
      previsaoSaida = d.toLocaleDateString("pt-BR");
    }
    return { avgGmd, avgScore, atMeta, previsaoSaida };
  }, [animals, weightByAnimal, lot, scoreByAnimal]);

  const exportAptidao = useMemo(() => {
    if (!isExportLot) return null;
    const certRequired: string[] = lot?.certificacoes_exigidas ?? [];
    return animals.map(animal => {
      const aw = weightByAnimal.get(animal.id) ?? [];
      const last = aw[0] ? Number(aw[0].weight) : null;
      const score = scoreByAnimal.get(animal.id) ?? 0;
      const carencias = activeCarenciasByAnimal.get(animal.id) ?? [];
      const certs = certsByAnimal.get(animal.id) ?? [];
      const certsFaltando = certRequired.filter(c => !certs.includes(c));
      const pendencias: string[] = [];
      if (score < SCORE_MINIMO_EXPORT) pendencias.push(`Score ${score} < ${SCORE_MINIMO_EXPORT}`);
      if (carencias.length > 0) pendencias.push(`Carência: ${carencias.join(", ")}`);
      if (certsFaltando.length > 0) pendencias.push(`Cert faltando: ${certsFaltando.join(", ")}`);
      const status: "apto" | "pendencias" | "inapto" =
        pendencias.length === 0 ? "apto"
        : score < SCORE_MINIMO_EXPORT || carencias.length > 0 ? "inapto"
        : "pendencias";
      return { animal, score, last, carencias, certs, certsFaltando, pendencias, status };
    });
  }, [isExportLot, animals, weightByAnimal, activeCarenciasByAnimal, certsByAnimal, lot, scoreByAnimal]);

  const exportStats = useMemo(() => {
    if (!exportAptidao) return null;
    const aptos = exportAptidao.filter(a => a.status === "apto").length;
    const inaptos = exportAptidao.filter(a => a.status === "inapto").length;
    const pendencias = exportAptidao.filter(a => a.status === "pendencias").length;
    const pct = animals.length > 0 ? Math.round((aptos / animals.length) * 100) : 0;
    return { aptos, inaptos, pendencias, pct };
  }, [exportAptidao, animals]);

  const halalConformidade = useMemo(() => {
    if (!isExportLot || !lot?.certificacoes_exigidas?.includes("Halal") || !exportAptidao) return null;
    const comCert = exportAptidao.filter(a => a.certs.some(c => c.toLowerCase().includes("halal"))).length;
    const aptos = exportAptidao.filter(a => a.certs.some(c => c.toLowerCase().includes("halal")) && a.status === "apto").length;
    return comCert > 0 ? { comCert, aptos } : null;
  }, [isExportLot, lot, exportAptidao]);

  if (loading) return (
    <main className="space-y-8">
      {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-3xl bg-[var(--surface-soft)]" />)}
    </main>
  );

  if (!lot) return (
    <main className="space-y-4">
      <Link href="/lotes" className="text-sm text-[var(--primary-hover)] hover:underline">← Lotes</Link>
      <p className="text-[var(--text-secondary)]">Lote não encontrado.</p>
    </main>
  );

  return (
    <main className="space-y-8">
      <Link href="/lotes" className="text-sm font-medium text-[var(--primary-hover)] hover:underline">← Lotes</Link>

      {/* ── Hero — visual diferenciado para exportação ── */}
      {isExportLot ? (
        <section className="overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(135deg,#0f0f1a_0%,#1a1a2e_60%,#0d2137_100%)] shadow-2xl">
          <div className="p-8 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    🌍 Lote de Exportação
                  </span>
                  {lot.numero_contrato && (
                    <span className="rounded-full bg-white/8 border border-white/12 px-3 py-1.5 text-xs text-white/50">
                      {lot.numero_contrato}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">{lot.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/55">
                  {lot.pais_destino && <span>🏳️ {lot.pais_destino}</span>}
                  {lot.porto_embarque && <span>⚓ {lot.porto_embarque}</span>}
                  {lot.data_embarque && <span>📅 Embarque: {new Date(lot.data_embarque).toLocaleDateString("pt-BR")}</span>}
                  {lot.target_weight && <span>⚖ Meta: {lot.target_weight} kg</span>}
                </div>
                {lot.certificacoes_exigidas && lot.certificacoes_exigidas.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lot.certificacoes_exigidas.map(cert => (
                      <span key={cert} className={`rounded-full border px-3 py-1 text-xs font-semibold ${cert === "Halal" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-white/15 bg-white/8 text-white/60"}`}>
                        {cert === "Halal" ? "☪ Halal" : cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-3">
                {exportStats && (
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-center min-w-[140px]">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Conformidade</p>
                    <p className={`mt-2 text-5xl font-semibold tracking-tight ${exportStats.pct >= 80 ? "text-emerald-400" : exportStats.pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {exportStats.pct}%
                    </p>
                    <p className="mt-1 text-xs text-white/40">{exportStats.aptos}/{animals.length} aptos</p>
                  </div>
                )}
                <DownloadLotPDFButton lotId={id} lotName={lot.name} />
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ExportKPI label="Total no lote" value={animals.length} sub="animais" />
              <ExportKPI label="Aptos" value={exportStats?.aptos ?? "—"} sub="prontos para embarque" green />
              <ExportKPI label="Pendências" value={exportStats?.pendencias ?? "—"} sub="sanáveis" amber />
              <ExportKPI label="Inaptos" value={exportStats?.inaptos ?? "—"} sub="fora do critério" red />
            </div>
            {exportStats && animals.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-white/40">
                  <span>Conformidade do lote</span>
                  <span>{exportStats.aptos}/{animals.length} animais aptos</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${exportStats.pct}%` }} />
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="ag-card-strong overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">{lot.objective ?? "Lote"}</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{lot.name}</h1>
            {lot.start_date && (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Início: {new Date(lot.start_date).toLocaleDateString("pt-BR")}
                {lot.target_weight ? ` · Meta: ${lot.target_weight} kg` : ""}
              </p>
            )}
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <KPI label="Animais" value={animals.length} sub="no lote" />
              <KPI label="GMD médio" value={stats.avgGmd ? `${stats.avgGmd} kg/d` : "—"} sub="ganho diário médio" />
              <KPI label="Score médio" value={stats.avgScore ?? "—"} sub="qualidade do lote" />
              <KPI label="Previsão saída" value={stats.previsaoSaida ?? "—"} sub="estimativa pela meta" />
            </div>
          </div>
        </section>
      )}

      {/* ── Tabs ── */}
      <div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-[var(--border)]">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {tab.label}
              {tab.key === "tracking" && trackingCheckpoints.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {trackingCheckpoints.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Visão Geral ── */}
        {activeTab === "overview" && (
          <div className="mt-8 space-y-8">
            {halalConformidade && (
              <section className="ag-card flex items-center gap-6 p-6">
                <HalalBadgeSVG size={56} />
                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Halal Aptos</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-600">{halalConformidade.aptos}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Com Certificado</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{halalConformidade.comCert}</p>
                  </div>
                </div>
              </section>
            )}
            {isExportLot && exportAptidao && exportStats && (
              <ExportRouteMap
                lot={lot}
                exportAptidao={exportAptidao}
                exportStats={exportStats}
                totalAnimals={animals.length}
              />
            )}
            {isExportLot && (
              <section className="ag-card p-8">
                <ExportConformityReport lotId={id} lotName={lot.name} />
              </section>
            )}
            {/* Adicionar animal */}
            <section className="ag-card p-8">
              <h2 className="ag-section-title">Adicionar animal ao lote</h2>
              <div className="relative mt-5 max-w-md">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#4A7C3A]"
                  placeholder="Buscar por código interno..." />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-black/10 bg-white shadow-lg">
                    {searchResults.map(a => (
                      <button key={a.id} type="button" disabled={adding} onClick={() => addAnimal(a.id)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--primary-soft)]">
                        <span className="font-medium">{a.internal_code}</span>
                        {a.nickname && <span className="ml-2 text-[var(--text-muted)]">({a.nickname})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Animais & Compliance ── */}
        {activeTab === "animals" && (
          <div className="mt-8 space-y-8">
            {/* Tabela de aptidão — lotes de exportação */}
            {isExportLot && exportAptidao && (
              <section className="overflow-hidden rounded-3xl border border-[rgba(26,26,46,0.15)] bg-white">
                <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Status de aptidão por animal</h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Score mínimo: {SCORE_MINIMO_EXPORT} · Carências zeradas · Certificações exigidas</p>
                  </div>
                  <span className="ag-badge ag-badge-dark">{animals.length} animais</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {exportAptidao.map(({ animal, score, last, pendencias, status, certs }) => {
                    const cfg = STATUS_STYLES[status];
                    return (
                      <div key={animal.id} className={`flex items-start gap-4 px-8 py-5 ${cfg.bg}`}>
                        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8)}
                            </p>
                            <span className="text-xs text-[var(--text-muted)]">{animal.breed ?? "—"} · {sexLabel(animal.sex)}</span>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">Score {score}</span>
                            {last && <span className="text-xs text-[var(--text-muted)]">{last} kg</span>}
                            {certs.length > 0 && certs.map(c =>
                              c === "Halal"
                                ? <HalalBadgeSVG key={c} size={24} />
                                : <span key={c} className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">{c}</span>
                            )}
                          </div>
                          {pendencias.length > 0 && (
                            <p className="mt-1.5 text-xs text-amber-700">{pendencias.join(" · ")}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <Link href={`/animais/${animal.id}`} className="text-xs font-medium text-[var(--primary-hover)] hover:underline">
                            Passaporte →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tabela de animais */}
            <section className="ag-card p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="ag-section-title">Animais no lote</h2>
                  <p className="ag-section-subtitle">
                    {animals.length} animal{animals.length !== 1 ? "is" : ""}
                    {lot.target_weight && stats.atMeta > 0 ? ` · ${stats.atMeta} atingiram ${lot.target_weight} kg` : ""}
                  </p>
                </div>
                <span className="ag-badge ag-badge-dark">{animals.length}</span>
              </div>
              <div className="mt-6">
                {animals.length === 0 ? (
                  <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                    Nenhum animal neste lote.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ag-table">
                      <thead>
                        <tr>
                          <th>Animal</th><th>Score</th><th>Sexo</th><th>Raça</th>
                          {isExportLot && <th>Aptidão</th>}
                          <th>Passaporte</th><th>Remover</th>
                        </tr>
                      </thead>
                      <tbody>
                        {animals.map(a => {
                          const apt = exportAptidao?.find(e => e.animal.id === a.id);
                          const cfg = apt ? STATUS_STYLES[apt.status] : null;
                          return (
                            <tr key={a.id}>
                              <td className="font-medium text-[var(--text-primary)]">{a.nickname ?? a.internal_code ?? a.id.slice(0, 8)}</td>
                              <td className="font-semibold text-[var(--primary-hover)]">{scoreByAnimal.get(a.id) ?? "—"}</td>
                              <td>{sexLabel(a.sex)}</td>
                              <td>{a.breed ?? "—"}</td>
                              {isExportLot && cfg && (
                                <td>
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
                                </td>
                              )}
                              <td><Link href={`/animais/${a.id}`} className="text-sm font-medium text-[var(--primary-hover)] hover:underline">Ver →</Link></td>
                              <td><button type="button" onClick={() => removeAnimal(a.assignment_id)} className="text-sm text-[var(--danger)] hover:underline">Remover</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Tracking ── */}
        {activeTab === "tracking" && (
          <div className="mt-8">
            <section className="ag-card-strong p-8">
              <div className="mb-6">
                <h2 className="ag-section-title">Timeline de rastreio</h2>
                <p className="ag-section-subtitle">7 etapas fixas · Fazenda → Entrega no destino</p>
              </div>
              <TrackingTimeline
                lotId={id}
                clientId={lot.client_id ?? null}
                initialCheckpoints={trackingCheckpoints}
                hasHalal={lot.certificacoes_exigidas?.includes("Halal") ?? false}
              />
            </section>
          </div>
        )}

        {/* ── Tab: Documentos ── */}
        {activeTab === "documents" && (
          <div className="mt-8">
            <section className="ag-card-strong p-8 space-y-6">
              <div>
                <h2 className="ag-section-title">Documentos do lote</h2>
                <p className="ag-section-subtitle">GTA, certificados sanitários, manifesto de carga e demais anexos</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] py-14 text-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
                  <Upload size={20} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Upload de documentos</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Funcionalidade disponível em breve</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Documentos esperados</p>
                {["GTA — Guia de Trânsito Animal", "Certificado Sanitário Internacional", "Manifesto de Carga", "Certificado Halal", "Laudo de Pesagem"].map(doc => (
                  <div key={doc} className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
                    <FileText size={14} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-secondary)]">{doc}</span>
                    <span className="ml-auto rounded-full bg-[var(--surface-soft)] border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">Pendente</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

const STATUS_STYLES = {
  apto:      { label: "Apto ✓",       bg: "bg-emerald-50/60",  dot: "bg-emerald-400",  badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  pendencias:{ label: "Pendências ⚠", bg: "bg-amber-50/60",    dot: "bg-amber-400",    badge: "border-amber-200 bg-amber-50 text-amber-700" },
  inapto:    { label: "Inapto ✗",     bg: "bg-red-50/40",      dot: "bg-red-400",      badge: "border-red-200 bg-red-50 text-red-700" },
};

function KPI({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{sub}</p>
    </div>
  );
}

function sexLabel(sex: string | null): string {
  if (!sex) return "—";
  if (sex === "Male" || sex === "M") return "Macho";
  if (sex === "Female" || sex === "F") return "Fêmea";
  return sex;
}

function ExportKPI({ label, value, sub, green, amber, red }: { label: string; value: string | number; sub: string; green?: boolean; amber?: boolean; red?: boolean }) {
  const color = green ? "text-emerald-400" : amber ? "text-amber-400" : red ? "text-red-400" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-[-0.04em] ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-white/35">{sub}</p>
    </div>
  );
}
