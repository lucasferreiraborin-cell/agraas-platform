"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { calculateAgraasScore, calculateAgeInMonths } from "@/lib/agraas-analytics";

const KG_POR_ARROBA = 15;

type AnimalRow = {
  id: string;
  internal_code: string | null;
  nickname: string | null;
  agraas_id: string | null;
  birth_date: string | null;
  breed: string | null;
  status: string | null;
  blood_type: string | null;
  sire_animal_id: string | null;
  dam_animal_id: string | null;
};

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
};

type ApplicationRow = { animal_id: string; withdrawal_date?: string | null };
type EventRow = { animal_id: string | null };

type DashboardRow = {
  id: string;
  code: string;
  score: number;
  lastWeight: number | null;
  lastWeighDate: string | null;
  arrobas: number | null;
  estimatedValue: number | null;
};

export default function DashboardPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cotacao, setCotacao] = useState(330);
  const [cotacaoMeta, setCotacaoMeta] = useState<{ fonte: string; updated_at: string | null }>({ fonte: "cache", updated_at: null });
  const [isAdmin, setIsAdmin] = useState(false);
  const [cotacaoInput, setCotacaoInput] = useState("");
  const [updatingCotacao, setUpdatingCotacao] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [
        { data: animalsData },
        { data: weightsData },
        { data: applicationsData },
        { data: eventsData },
        cotacaoRes,
        { data: { user } },
      ] = await Promise.all([
        supabase.from("animals").select(
          "id, internal_code, nickname, agraas_id, birth_date, breed, status, blood_type, sire_animal_id, dam_animal_id"
        ).order("internal_code"),
        supabase.from("weights").select("id, animal_id, weight, weighing_date")
          .order("weighing_date", { ascending: false }),
        supabase.from("applications").select("animal_id, withdrawal_date"),
        supabase.from("events").select("animal_id"),
        fetch("/api/cotacao").then(r => r.json()).catch(() => ({ cotacao: 330, fonte: "fallback", updated_at: null })),
        supabase.auth.getUser(),
      ]);
      setAnimals((animalsData as AnimalRow[]) ?? []);
      setWeights((weightsData as WeightRow[]) ?? []);
      setApplications((applicationsData as ApplicationRow[]) ?? []);
      setEvents((eventsData as EventRow[]) ?? []);
      setCotacao(cotacaoRes.cotacao ?? 330);
      setCotacaoMeta({ fonte: cotacaoRes.fonte ?? "cache", updated_at: cotacaoRes.updated_at ?? null });

      if (user) {
        const { data: c } = await supabase.from("clients").select("role").eq("auth_user_id", user.id).single();
        setIsAdmin(c?.role === "admin");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function atualizarCotacao() {
    const value = parseFloat(cotacaoInput);
    if (!value || value < 100) return;
    setUpdatingCotacao(true);
    const res = await fetch("/api/cotacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotacao: value }),
    });
    const data = await res.json();
    setCotacao(data.cotacao ?? value);
    setCotacaoMeta({ fonte: data.fonte ?? "manual", updated_at: data.updated_at ?? null });
    setCotacaoInput("");
    setUpdatingCotacao(false);
  }

  // Tela de boas-vindas
  if (!loading && animals.length === 0) {
    return (
      <main className="space-y-8">
        <div className="ag-card-strong overflow-hidden">
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-4xl shadow-[var(--shadow-soft)]">🏡</div>
            <div className="ag-badge ag-badge-green mt-8">Bem-vindo à Agraas</div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] lg:text-4xl">Sua operação começa aqui</h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-[var(--text-secondary)]">
              Cadastre sua primeira fazenda para ativar o dashboard com animais, scores, pesagens e rastreabilidade completa.
            </p>
            <div className="mt-8">
              <Link href="/propriedades/novo" className="ag-button-primary">Cadastrar minha primeira fazenda</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <DashboardContent animals={animals} weights={weights} applications={applications} events={events} loading={loading}
    cotacao={cotacao} cotacaoMeta={cotacaoMeta} isAdmin={isAdmin}
    cotacaoInput={cotacaoInput} setCotacaoInput={setCotacaoInput}
    updatingCotacao={updatingCotacao} onAtualizarCotacao={atualizarCotacao} />;
}

function DashboardContent({
  animals, weights, applications, events, loading,
  cotacao, cotacaoMeta, isAdmin, cotacaoInput, setCotacaoInput, updatingCotacao, onAtualizarCotacao,
}: {
  animals: AnimalRow[];
  weights: WeightRow[];
  applications: ApplicationRow[];
  events: EventRow[];
  loading: boolean;
  cotacao: number;
  cotacaoMeta: { fonte: string; updated_at: string | null };
  isAdmin: boolean;
  cotacaoInput: string;
  setCotacaoInput: (v: string) => void;
  updatingCotacao: boolean;
  onAtualizarCotacao: () => void;
}) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Índices por animal
  const weightsByAnimal = useMemo(() => {
    const map = new Map<string, WeightRow[]>();
    for (const w of weights) {
      const list = map.get(w.animal_id) ?? [];
      list.push(w);
      map.set(w.animal_id, list);
    }
    return map;
  }, [weights]);

  const appCountByAnimal = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applications) map.set(a.animal_id, (map.get(a.animal_id) ?? 0) + 1);
    return map;
  }, [applications]);

  const eventCountByAnimal = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.animal_id) map.set(e.animal_id, (map.get(e.animal_id) ?? 0) + 1);
    }
    return map;
  }, [events]);

  // Calcular rows do dashboard
  const rows: DashboardRow[] = useMemo(() => animals.map(animal => {
    const animalWeights = weightsByAnimal.get(animal.id) ?? [];
    const lastWeight = animalWeights[0] ? Number(animalWeights[0].weight) : null;
    const lastWeighDate = animalWeights[0]?.weighing_date ?? null;
    const ageMonths = calculateAgeInMonths(animal.birth_date);
    const sanitaryScore = Math.min(100, 50 + (appCountByAnimal.get(animal.id) ?? 0) * 8);
    const operationalScore = Math.min(100, 45 + (eventCountByAnimal.get(animal.id) ?? 0) * 2);
    const continuityScore = Math.min(100,
      40 + Math.min(30, animalWeights.length * 8)
        + (animal.birth_date ? 15 : 0)
        + (animal.agraas_id ? 15 : 0)
    );
    const score = calculateAgraasScore({
      lastWeight, ageMonths, sanitaryScore, operationalScore, continuityScore,
      hasBloodType: Boolean(animal.blood_type),
      hasGenealogy: Boolean(animal.sire_animal_id || animal.dam_animal_id),
    });
    const arrobas = lastWeight ? lastWeight / KG_POR_ARROBA : null;
    const estimatedValue = arrobas ? arrobas * cotacao : null;
    return {
      id: animal.id,
      code: animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8),
      score,
      lastWeight,
      lastWeighDate,
      arrobas,
      estimatedValue,
    };
  }), [animals, weightsByAnimal, appCountByAnimal, eventCountByAnimal]);

  // KPIs
  const totalAnimais = rows.length;
  const scoresMedio = totalAnimais > 0 ? Math.round(rows.reduce((s, r) => s + r.score, 0) / totalAnimais) : 0;
  const valorRebanho = rows.reduce((s, r) => s + (r.estimatedValue ?? 0), 0);
  const arroba_rebanho = rows.reduce((s, r) => s + (r.arrobas ?? 0), 0);

  // Animais sem pesagem há >30 dias
  const animaisSemPesagem = rows.filter(r => {
    if (!r.lastWeighDate) return true;
    return new Date(r.lastWeighDate) < thirtyDaysAgo;
  });

  // Top 5 por score
  const top5 = [...rows].sort((a, b) => b.score - a.score).slice(0, 5);

  // Gráfico score evolução (últimos 90 dias com base em pesagens)
  const chartData = useMemo(() => {
    const points: { date: Date; score: number }[] = [];
    for (const w of weights) {
      if (!w.weighing_date) continue;
      const d = new Date(w.weighing_date);
      if (d < ninetyDaysAgo) continue;
      const animal = animals.find(a => a.id === w.animal_id);
      if (!animal) continue;
      const animalWeights = weightsByAnimal.get(w.animal_id) ?? [];
      const appCount = appCountByAnimal.get(w.animal_id) ?? 0;
      const evtCount = eventCountByAnimal.get(w.animal_id) ?? 0;
      const ageMonths = calculateAgeInMonths(animal.birth_date);
      const score = calculateAgraasScore({
        lastWeight: Number(w.weight),
        ageMonths,
        sanitaryScore: Math.min(100, 50 + appCount * 8),
        operationalScore: Math.min(100, 45 + evtCount * 2),
        continuityScore: Math.min(100, 40 + Math.min(30, animalWeights.length * 8) + (animal.birth_date ? 15 : 0) + (animal.agraas_id ? 15 : 0)),
        hasBloodType: Boolean(animal.blood_type),
        hasGenealogy: Boolean(animal.sire_animal_id || animal.dam_animal_id),
      });
      points.push({ date: d, score });
    }
    return points.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [weights, animals, weightsByAnimal, appCountByAnimal, eventCountByAnimal, ninetyDaysAgo]);

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />
            <div className="ag-badge ag-badge-green">Dashboard executivo</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Visão da operação
            </h1>
            <p className="mt-5 max-w-2xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              KPIs em tempo real da sua fazenda — score médio do rebanho, valor estimado, alertas e performance produtiva.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <HeroKpi label="Animais" value={loading ? "—" : totalAnimais} sub="base total" />
              <HeroKpi label="Score médio" value={loading ? "—" : scoresMedio} sub="qualidade do rebanho" />
              <HeroKpi label="Em alerta" value={loading ? "—" : animaisSemPesagem.length} sub="sem pesagem >30 dias" danger />
              <HeroKpi label="@ no rebanho" value={loading ? "—" : Math.round(arroba_rebanho)} sub="arrobas estimadas" />
            </div>
          </div>
          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Valor estimado do rebanho</p>
            <p className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
              {loading ? "—" : `R$ ${Math.round(valorRebanho).toLocaleString("pt-BR")}`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                cotacaoMeta.fonte === "cepea"
                  ? "border-[rgba(93,156,68,0.30)] bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                  : "border-[rgba(217,163,67,0.30)] bg-[rgba(217,163,67,0.12)] text-[var(--warning)]"
              }`}>
                {cotacaoMeta.fonte === "cepea" ? "CEPEA ao vivo" : cotacaoMeta.fonte === "manual" ? "Atualizado manualmente" : "Cotação em cache"}
              </span>
              {cotacaoMeta.updated_at && (
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(cotacaoMeta.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">R$ {cotacao.toFixed(2)}/@ · {KG_POR_ARROBA} kg por arroba</p>

            {isAdmin && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="number"
                  value={cotacaoInput}
                  onChange={e => setCotacaoInput(e.target.value)}
                  placeholder="Nova cotação R$/@"
                  className="w-44 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#4A7C3A]"
                  min="100" max="1000" step="0.01"
                />
                <button type="button" onClick={onAtualizarCotacao}
                  disabled={updatingCotacao || !cotacaoInput}
                  className="rounded-xl bg-[var(--primary-hover)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B6B2E] disabled:opacity-50">
                  {updatingCotacao ? "Atualizando..." : "Atualizar"}
                </button>
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-sm font-medium text-[var(--text-primary)]">Fórmula de cálculo</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Peso atual ÷ {KG_POR_ARROBA} kg = arrobas × R$ {cotacao.toFixed(2)} = valor por animal. Total consolidado de toda a base.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gráfico de evolução do score */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Evolução do score — últimos 90 dias</h2>
            <p className="ag-section-subtitle">Score calculado por evento de pesagem registrado no período.</p>
          </div>
          <span className="ag-badge ag-badge-dark">{chartData.length} pontos</span>
        </div>
        <div className="mt-6">
          {loading ? (
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--surface-soft)]" />
          ) : chartData.length < 2 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Registre pesagens para visualizar a evolução do score ao longo do tempo.
            </div>
          ) : (
            <ScoreChart data={chartData} />
          )}
        </div>
      </section>

      {/* Top 5 e alertas lado a lado */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Top 5 por score */}
        <section className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Top 5 — maior score</h2>
              <p className="ag-section-subtitle">Melhores animais da operação.</p>
            </div>
            <span className="ag-badge ag-badge-green">Ranking</span>
          </div>
          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
              ))
            ) : top5.map((r, i) => (
              <Link key={r.id} href={`/animais/${r.id}`}
                className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:border-[rgba(93,156,68,0.25)] hover:bg-[var(--primary-soft)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold shadow-[var(--shadow-soft)] text-[var(--text-muted)]">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{r.code}</p>
                  {r.lastWeight && <p className="text-xs text-[var(--text-muted)]">{r.lastWeight} kg</p>}
                </div>
                <span className="text-lg font-semibold text-[var(--primary-hover)]">{r.score}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Alertas */}
        <section className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Alertas</h2>
              <p className="ag-section-subtitle">Animais sem pesagem há mais de 30 dias.</p>
            </div>
            {animaisSemPesagem.length > 0 && (
              <span className="inline-flex rounded-full bg-[rgba(214,69,69,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)]">
                {animaisSemPesagem.length} em alerta
              </span>
            )}
          </div>
          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
              ))
            ) : animaisSemPesagem.length === 0 ? (
              <div className="rounded-3xl bg-[var(--primary-soft)] p-6 text-sm font-medium text-[var(--primary-hover)]">
                ✓ Todos os animais foram pesados nos últimos 30 dias.
              </div>
            ) : animaisSemPesagem.slice(0, 8).map(r => (
              <Link key={r.id} href={`/animais/${r.id}`}
                className="flex items-center gap-4 rounded-2xl border border-[rgba(214,69,69,0.15)] bg-[rgba(214,69,69,0.04)] p-4 transition hover:bg-[rgba(214,69,69,0.08)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm shadow-[var(--shadow-soft)]">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{r.code}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {r.lastWeighDate
                      ? `Última pesagem: ${new Date(r.lastWeighDate).toLocaleDateString("pt-BR")}`
                      : "Nunca pesado"}
                  </p>
                </div>
                <span className="text-xs font-medium text-[var(--danger)]">Registrar →</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroKpi({ label, value, sub, danger }: { label: string; value: string | number; sub: string; danger?: boolean }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${danger && Number(value) > 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{sub}</p>
    </div>
  );
}

function ScoreChart({ data }: { data: { date: Date; score: number }[] }) {
  const W = 600; const H = 140; const PAD = 16;
  const minScore = Math.max(0, Math.min(...data.map(d => d.score)) - 10);
  const maxScore = Math.min(100, Math.max(...data.map(d => d.score)) + 10);
  const minTime = data[0].date.getTime();
  const maxTime = data[data.length - 1].date.getTime();
  const range = maxTime - minTime || 1;
  const scoreRange = maxScore - minScore || 1;

  const toX = (d: Date) => PAD + ((d.getTime() - minTime) / range) * (W - PAD * 2);
  const toY = (s: number) => H - PAD - ((s - minScore) / scoreRange) * (H - PAD * 2);

  const points = data.map(d => `${toX(d.date)},${toY(d.score)}`).join(" ");
  const areaPoints = `${toX(data[0].date)},${H - PAD} ${points} ${toX(data[data.length - 1].date)},${H - PAD}`;

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(93,156,68,0.25)" />
            <stop offset="100%" stopColor="rgba(93,156,68,0)" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#chartGrad)" />
        <polyline points={points} fill="none" stroke="#5d9c44" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={toX(d.date)} cy={toY(d.score)} r="4" fill="#5d9c44" stroke="white" strokeWidth="2" />
        ))}
        <text x={PAD} y={toY(maxScore) + 4} fontSize="11" fill="rgba(30,42,27,0.5)">{Math.round(maxScore)}</text>
        <text x={PAD} y={toY(minScore) - 4} fontSize="11" fill="rgba(30,42,27,0.5)">{Math.round(minScore)}</text>
      </svg>
    </div>
  );
}
