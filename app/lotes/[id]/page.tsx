"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { use } from "react";
import { calculateAgraasScore, calculateAgeInMonths, calculateDailyGain } from "@/lib/agraas-analytics";

type LotRow = {
  id: string; name: string; description: string | null;
  objective: string | null; start_date: string | null;
  target_weight: number | null; status: string | null; property_id: string | null;
};
type AnimalInLot = {
  id: string; internal_code: string | null; nickname: string | null;
  sex: string | null; breed: string | null; birth_date: string | null;
  blood_type: string | null; sire_animal_id: string | null; dam_animal_id: string | null;
  assignment_id: string;
};
type SearchAnimal = { id: string; internal_code: string | null; nickname: string | null };
type WeightRow = { animal_id: string; weight: number; weighing_date: string | null };

export default function LoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lot, setLot] = useState<LotRow | null>(null);
  const [animals, setAnimals] = useState<AnimalInLot[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchAnimal[]>([]);
  const [adding, setAdding] = useState(false);

  async function loadData() {
    const [{ data: lotData }, { data: assignData }, { data: wData }] = await Promise.all([
      supabase.from("lots").select("id, name, description, objective, start_date, target_weight, status, property_id").eq("id", id).single(),
      supabase.from("animal_lot_assignments")
        .select("id, animal_id, animals(id, internal_code, nickname, sex, breed, birth_date, blood_type, sire_animal_id, dam_animal_id)")
        .eq("lot_id", id).is("exit_date", null),
      supabase.from("weights").select("animal_id, weight, weighing_date").order("weighing_date", { ascending: false }),
    ]);
    setLot((lotData as LotRow) ?? null);
    const animalList: AnimalInLot[] = ((assignData ?? []) as any[])
      .filter((a: any) => a.animals)
      .map((a: any) => ({
        ...(a.animals as AnimalInLot),
        assignment_id: a.id,
      }));
    setAnimals(animalList);
    setWeights((wData as WeightRow[]) ?? []);
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

  const stats = useMemo(() => {
    const weightByAnimal = new Map<string, WeightRow[]>();
    for (const w of weights) {
      const list = weightByAnimal.get(w.animal_id) ?? [];
      list.push(w);
      weightByAnimal.set(w.animal_id, list);
    }
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
      const score = calculateAgraasScore({
        lastWeight: last, ageMonths: calculateAgeInMonths(animal.birth_date),
        sanitaryScore: 60, operationalScore: 60, continuityScore: 60,
        hasBloodType: Boolean(animal.blood_type),
        hasGenealogy: Boolean(animal.sire_animal_id || animal.dam_animal_id),
      });
      totalScore += score;
    }
    const avgGmd = gmdCount > 0 ? (totalGmd / gmdCount).toFixed(3) : null;
    const avgScore = animals.length > 0 ? Math.round(totalScore / animals.length) : null;
    const avgWeight = avgWeights.length > 0 ? avgWeights.reduce((s, w) => s + w, 0) / avgWeights.length : 0;

    let previsaoSaida: string | null = null;
    if (lot?.target_weight && avgGmd && Number(avgGmd) > 0 && avgWeight < lot.target_weight) {
      const dias = Math.round((lot.target_weight - avgWeight) / Number(avgGmd));
      const d = new Date();
      d.setDate(d.getDate() + dias);
      previsaoSaida = d.toLocaleDateString("pt-BR");
    }
    return { avgGmd, avgScore, atMeta, previsaoSaida };
  }, [animals, weights, lot]);

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
              Nenhum animal neste lote. Use a busca acima para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr><th>Animal</th><th>Sexo</th><th>Raça</th><th>Passaporte</th><th>Remover</th></tr>
                </thead>
                <tbody>
                  {animals.map(a => (
                    <tr key={a.id}>
                      <td className="font-medium text-[var(--text-primary)]">{a.nickname ?? a.internal_code ?? a.id.slice(0, 8)}</td>
                      <td>{a.sex === "Male" ? "Macho" : a.sex === "Female" ? "Fêmea" : "—"}</td>
                      <td>{a.breed ?? "—"}</td>
                      <td><Link href={`/animais/${a.id}`} className="text-sm font-medium text-[var(--primary-hover)] hover:underline">Ver →</Link></td>
                      <td><button type="button" onClick={() => removeAnimal(a.assignment_id)} className="text-sm text-[var(--danger)] hover:underline">Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{sub}</p>
    </div>
  );
}
