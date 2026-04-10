"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Scale as ScaleIcon, TrendingUp as TrendingUpIcon, Weight as WeightIcon, Activity as ActivityIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
};

export default function PesagensPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [weight, setWeight] = useState("");
  const [weighingDate, setWeighingDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"individual" | "lote">("individual");
  const [batchRows, setBatchRows] = useState<{ animalId: string; weight: string; selected: boolean }[]>([]);
  const [batchDate, setBatchDate] = useState(todayInputValue());
  const [batchSaving, setBatchSaving] = useState(false);

  useEffect(() => {
    async function loadAnimals() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data, error } = await supabase
          .from("animals")
          .select("id, internal_code, agraas_id")
          .eq("status", "Ativo")
          .order("internal_code", { ascending: true });

        if (error) {
          console.error("Erro ao buscar animais:", error);
          setLoadError("Não foi possível carregar os animais.");
          setAnimals([]);
          return;
        }

        const loaded = (data ?? []) as AnimalRow[];
        setAnimals(loaded);
        setBatchRows(loaded.map(a => ({ animalId: a.id, weight: "", selected: false })));
      } catch (err) {
        console.error("Falha inesperada ao buscar animais:", err);
        setLoadError("Erro inesperado ao carregar os animais.");
        setAnimals([]);
      } finally {
        setLoading(false);
      }
    }

    loadAnimals();
  }, []);

  async function createWeight() {
    if (!animalId || !weight || !weighingDate) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    const numericWeight = Number(weight);

    if (Number.isNaN(numericWeight) || numericWeight <= 0) {
      alert("Informe um peso válido.");
      return;
    }

    setSaving(true);

    try {
      const { error: weightError } = await supabase.from("weights").insert([
        {
          animal_id: animalId,
          weight: numericWeight,
          weighing_date: weighingDate,
          notes: notes || null,
        },
      ]);

      if (weightError) {
        console.error("Erro detalhado ao registrar pesagem:", weightError);
        alert(`Erro ao registrar pesagem: ${JSON.stringify(weightError)}`);
        return;
      }

      const { error: eventError } = await supabase.from("events").insert([
        {
          animal_id: animalId,
          source: "farm",
          event_type: "weighing",
          notes: `Pesagem registrada: ${numericWeight} kg`,
          event_date: weighingDate,
        },
      ]);

      if (eventError) {
        console.error("Erro ao registrar evento da pesagem:", eventError);
        alert(`Pesagem salva, mas o evento falhou: ${JSON.stringify(eventError)}`);
      } else {
        alert("Pesagem registrada com sucesso.");
      }

      setAnimalId("");
      setWeight("");
      setWeighingDate(todayInputValue());
      setNotes("");
    } catch (err) {
      console.error("Erro inesperado ao registrar pesagem:", err);
      alert("Erro inesperado ao registrar a pesagem.");
    } finally {
      setSaving(false);
    }
  }

  async function createBatchWeights() {
    const toSave = batchRows.filter(r => r.selected && r.weight && Number(r.weight) > 0);
    if (toSave.length === 0) { alert("Selecione ao menos 1 animal e informe o peso."); return; }
    if (!batchDate) { alert("Informe a data da pesagem."); return; }

    setBatchSaving(true);
    let saved = 0;
    for (const row of toSave) {
      const w = Number(row.weight);
      const { error } = await supabase.from("weights").insert([{ animal_id: row.animalId, weight: w, weighing_date: batchDate }]);
      if (!error) {
        await supabase.from("events").insert([{ animal_id: row.animalId, source: "farm", event_type: "weighing", notes: `Pesagem em lote: ${w} kg`, event_date: batchDate }]);
        saved++;
      }
    }
    alert(`${saved} pesagem${saved > 1 ? "ns" : ""} registrada${saved > 1 ? "s" : ""}.`);
    setBatchRows(prev => prev.map(r => ({ ...r, weight: "", selected: false })));
    setBatchSaving(false);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Pesagem animal</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Registro de pesagens
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Registre o peso dos animais para acompanhar evolução, desempenho
              e integrar a informação ao passaporte do rebanho.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesagens/historico" className="ag-button-secondary">
                Ver histórico
              </Link>

              <Link href="/animais" className="ag-button-secondary">
                Ver animais
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <PesagemHeroMetrics animalsCount={animals.length} />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("individual")} className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === "individual" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)]"}`}>
          Individual
        </button>
        <button onClick={() => setTab("lote")} className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === "lote" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)]"}`}>
          Pesagem em Lote
        </button>
      </div>

      {/* Batch weighing */}
      {tab === "lote" && !loading && !loadError && (
        <section className="ag-card p-8">
          <h2 className="ag-section-title">Pesagem em lote</h2>
          <p className="ag-section-subtitle">Selecione os animais e informe o peso de cada um.</p>

          <div className="mt-4 mb-4">
            <label className="text-sm font-medium text-[var(--text-primary)]">Data da pesagem</label>
            <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)}
              className="ml-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm" />
            <button onClick={() => setBatchRows(prev => prev.map(r => ({ ...r, selected: true })))}
              className="ml-3 text-sm font-medium text-[var(--primary)] hover:underline">Selecionar todos</button>
            <button onClick={() => setBatchRows(prev => prev.map(r => ({ ...r, selected: false })))}
              className="ml-3 text-sm font-medium text-[var(--text-muted)] hover:underline">Limpar</button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--surface-soft)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)]">Animal</th>
                  <th className="w-32 px-3 py-2 text-left font-semibold text-[var(--text-muted)]">Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, i) => {
                  const animal = animals.find(a => a.id === row.animalId);
                  return (
                    <tr key={row.animalId} className={`border-b border-[var(--border)] ${row.selected ? "bg-[var(--primary-soft)]" : ""}`}>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={row.selected}
                          onChange={e => setBatchRows(prev => prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))}
                          className="h-4 w-4 rounded accent-[var(--primary)]" />
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                        {animal?.internal_code ?? row.animalId.slice(0, 8)}
                        {animal?.agraas_id ? <span className="ml-2 text-xs text-[var(--text-muted)]">{animal.agraas_id}</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" placeholder="kg" value={row.weight}
                          onChange={e => setBatchRows(prev => prev.map((r, j) => j === i ? { ...r, weight: e.target.value, selected: e.target.value ? true : r.selected } : r))}
                          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">{batchRows.filter(r => r.selected && r.weight).length} animais selecionados</span>
            <button onClick={createBatchWeights} disabled={batchSaving} className="ag-button-primary disabled:opacity-70">
              {batchSaving ? "Salvando..." : "Registrar pesagens em lote"}
            </button>
          </div>
        </section>
      )}

      {tab === "individual" && (
      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Nova pesagem</h2>
            <p className="ag-section-subtitle">
              Preencha os dados abaixo para registrar o peso do animal.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">Fluxo produtivo</div>
        </div>

        {loading && (
          <div className="mt-8 rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
            Carregando base animal...
          </div>
        )}

        {!loading && loadError && (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div className="mt-8 grid gap-5">
            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Animal
              </div>

              <select
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              >
                <option value="">Selecione um animal</option>
                {animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.internal_code ?? animal.id}
                    {animal.agraas_id ? ` • ${animal.agraas_id}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Peso (kg)
              </div>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex.: 420"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Data da pesagem
              </div>
              <input
                type="date"
                value={weighingDate}
                onChange={(e) => setWeighingDate(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Observações
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Detalhes adicionais"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <button
              onClick={createWeight}
              disabled={saving}
              className="ag-button-primary mt-2 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Registrar pesagem"}
            </button>
          </div>
        )}
      </section>
      )}

      {/* GMD Section */}
      {!loading && animals.length > 0 && (
        <GmdSection animals={animals} />
      )}
    </main>
  );
}

function GmdSection({ animals }: { animals: AnimalRow[] }) {
  const [period, setPeriod] = useState(90);
  const [gmdData, setGmdData] = useState<{ code: string; gmd: number }[]>([]);
  const [loadingGmd, setLoadingGmd] = useState(false);
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

  useEffect(() => {
    async function calc() {
      setLoadingGmd(true);
      const cutoff = new Date(Date.now() - period * 86400000).toISOString().split("T")[0];
      const { data: weights } = await sb.from("weights")
        .select("animal_id, weight, weighing_date")
        .gte("weighing_date", cutoff)
        .order("weighing_date", { ascending: false });

      const byAnimal = new Map<string, { weight: number; date: string }[]>();
      for (const w of (weights ?? [])) {
        const arr = byAnimal.get(w.animal_id) ?? [];
        arr.push({ weight: w.weight, date: w.weighing_date });
        byAnimal.set(w.animal_id, arr);
      }

      const results: { code: string; gmd: number }[] = [];
      for (const a of animals) {
        const ws = byAnimal.get(a.id);
        if (!ws || ws.length < 2) continue;
        const sorted = ws.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        const days = (new Date(sorted[0].date).getTime() - new Date(sorted[sorted.length - 1].date).getTime()) / 86400000;
        if (days > 0) {
          results.push({ code: a.internal_code ?? a.id.slice(0, 8), gmd: Math.round(((sorted[0].weight - sorted[sorted.length - 1].weight) / days) * 1000) });
        }
      }
      setGmdData(results.sort((a, b) => b.gmd - a.gmd));
      setLoadingGmd(false);
    }
    calc();
  }, [period, animals]);

  const avgGmd = gmdData.length > 0 ? Math.round(gmdData.reduce((s, r) => s + r.gmd, 0) / gmdData.length) : null;

  return (
    <section className="ag-card p-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="ag-section-title">Ganho Médio Diário (GMD)</h2>
          <p className="ag-section-subtitle">Performance de ganho de peso por animal no período.</p>
        </div>
        <div className="flex gap-2">
          {[30, 60, 90, 180].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${period === d ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {avgGmd != null && (
        <div className="mb-4 rounded-2xl bg-[var(--primary-soft)] px-5 py-3">
          <span className="text-sm text-[var(--text-muted)]">GMD médio do rebanho:</span>
          <span className="ml-2 text-xl font-bold text-[var(--primary)]">{avgGmd} g/dia</span>
        </div>
      )}

      {loadingGmd ? (
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
      ) : gmdData.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Sem dados suficientes para o período selecionado (mínimo 2 pesagens por animal).</p>
      ) : (
        <div className="space-y-2">
          {gmdData.map(r => (
            <div key={r.code} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">{r.code}</span>
              <span className={`text-sm font-bold ${r.gmd > 0 ? "text-emerald-600" : r.gmd < 0 ? "text-red-500" : "text-[var(--text-muted)]"}`}>
                {r.gmd > 0 ? "+" : ""}{r.gmd} g/dia
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PesagemHeroMetrics({ animalsCount }: { animalsCount: number }) {
  const [stats, setStats] = useState<{ gmd: number | null; lastWeight: number | null; lastCode: string | null }>({ gmd: null, lastWeight: null, lastCode: null });

  useEffect(() => {
    async function load() {
      const { data: weights } = await supabase.from("weights")
        .select("animal_id, weight, weighing_date")
        .order("weighing_date", { ascending: false })
        .limit(200);

      if (!weights || weights.length === 0) return;

      const byAnimal = new Map<string, { weight: number; date: string }[]>();
      for (const w of weights) {
        const arr = byAnimal.get(w.animal_id) ?? [];
        arr.push({ weight: w.weight, date: w.weighing_date });
        byAnimal.set(w.animal_id, arr);
      }

      const gmds: number[] = [];
      for (const [, ws] of byAnimal) {
        if (ws.length >= 2) {
          const sorted = ws.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const days = (new Date(sorted[0].date).getTime() - new Date(sorted[1].date).getTime()) / 86400000;
          if (days > 0) gmds.push(((sorted[0].weight - sorted[1].weight) / days) * 1000);
        }
      }
      const avgGmd = gmds.length > 0 ? Math.round(gmds.reduce((s, v) => s + v, 0) / gmds.length) : null;

      const latest = weights[0];
      const { data: animal } = await supabase.from("animals").select("internal_code").eq("id", latest.animal_id).single();

      setStats({ gmd: avgGmd, lastWeight: latest.weight, lastCode: animal?.internal_code ?? null });
    }
    load();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="Animais" value={animalsCount} subtitle="ativos disponíveis para pesagem" Icon={ScaleIcon} bg="bg-[var(--primary-soft)]" cl="text-[var(--primary)]" />
      <MetricCard label="GMD médio" value={stats.gmd != null ? `${stats.gmd} g/dia` : "—"} subtitle="ganho médio diário do rebanho" Icon={TrendingUpIcon} bg="bg-emerald-50" cl="text-emerald-600" />
      <MetricCard label="Último peso" value={stats.lastWeight != null ? `${stats.lastWeight} kg` : "—"} subtitle={stats.lastCode ? `${stats.lastCode} — registro mais recente` : "evolução histórica"} Icon={WeightIcon} bg="bg-blue-50" cl="text-blue-600" />
      <MetricCard label="Timeline" value="Ativa" subtitle="pesagens entram no passaporte" Icon={ActivityIcon} bg="bg-amber-50" cl="text-amber-600" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  Icon,
  bg,
  cl,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  Icon: LucideIcon;
  bg: string;
  cl: string;
}) {
  return (
    <div className="ag-kpi-card">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={17} className={cl} />
      </div>
      <p className="mt-3 ag-kpi-label">{label}</p>
      <p className="ag-kpi-value">{value}</p>
      <p className="sub">{subtitle}</p>
    </div>
  );
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}