"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evt = {
  id: string;
  event_type: string;
  event_date: string;
  notes: string | null;
  animal_id: string | null;
};
type Animal = { id: string; internal_code: string; nickname: string | null };

const TYPE_LABEL: Record<string,string> = {
  pesagem: "Pesagem", vacinacao: "Vacinação", medicamento: "Medicamento",
  parto: "Parto", manejo: "Manejo", diagnostico: "Diagnóstico",
  venda: "Venda", transferencia: "Transferência", entrada: "Entrada", saida: "Saída",
};
const TYPE_COLOR: Record<string,string> = {
  pesagem: "bg-blue-100 text-blue-700 border-blue-200",
  vacinacao: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medicamento: "bg-purple-100 text-purple-700 border-purple-200",
  parto: "bg-pink-100 text-pink-700 border-pink-200",
  manejo: "bg-amber-100 text-amber-700 border-amber-200",
  diagnostico: "bg-red-100 text-red-700 border-red-200",
  venda: "bg-indigo-100 text-indigo-700 border-indigo-200",
  transferencia: "bg-cyan-100 text-cyan-700 border-cyan-200",
  entrada: "bg-teal-100 text-teal-700 border-teal-200",
  saida: "bg-orange-100 text-orange-700 border-orange-200",
};

const PAGE_SIZE = 20;

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HistoricoPage() {
  const [visible, setVisible] = useState<Evt[]>([]);
  const [animals, setAnimals] = useState<Map<string, Animal>>(new Map());
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<"7"|"30"|"90"|"all">("30");
  const [typeF,   setTypeF]   = useState<string>("all");
  const [page,    setPage]    = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const cutoff = period === "all" ? null : new Date(Date.now() - Number(period) * 86400000).toISOString();

      let q = supabase
        .from("events")
        .select("id, event_type, event_date, notes, animal_id", { count: "exact" })
        .order("event_date", { ascending: false })
        .range(from, to);
      if (cutoff) q = q.gte("event_date", cutoff);
      if (typeF !== "all") q = q.eq("event_type", typeF);

      const [{ data: evts, count }, { data: ants }, { data: typesData }, { data: statsData }] = await Promise.all([
        q,
        supabase.from("animals").select("id, internal_code, nickname"),
        supabase.from("events").select("event_type").limit(200),
        supabase.from("events").select("event_date").order("event_date", { ascending: false }).limit(1),
      ]);

      setVisible((evts ?? []) as Evt[]);
      setTotalCount(count ?? 0);
      const m = new Map<string, Animal>();
      for (const a of (ants ?? []) as Animal[]) m.set(a.id, a);
      setAnimals(m);
      setTotalEvents(count ?? 0);
      setLastDate((statsData?.[0] as any)?.event_date ?? null);
      const allTypes = Array.from(new Set((typesData ?? []).map((e: any) => e.event_type))).sort() as string[];
      setTypes(allTypes);
      setLoading(false);
    }
    load();
  }, [period, typeF, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const uniqueAnimals = new Set(visible.filter(e => e.animal_id).map(e => e.animal_id)).size;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <h1 className="ag-page-title">Histórico de Eventos</h1>
        <p className="ag-section-subtitle mt-1">Rastreabilidade completa de todos os eventos do rebanho</p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">Total de eventos</p>
            <p className="ag-kpi-value text-[var(--primary)]">{loading ? "—" : totalEvents}</p>
            <p className="sub">registrados</p>
          </div>
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">Animais envolvidos</p>
            <p className="ag-kpi-value text-blue-600">{loading ? "—" : uniqueAnimals}</p>
            <p className="sub">únicos</p>
          </div>
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">Último evento</p>
            <p className="ag-kpi-value text-emerald-600 text-xl">{loading || !lastDate ? "—" : fmtDate(lastDate)}</p>
            <p className="sub">data mais recente</p>
          </div>
        </div>
      </section>

      <section className="ag-card-strong p-8 space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 rounded-xl border border-[var(--border)] p-1 bg-[var(--surface-soft)]">
            {(["7","30","90","all"] as const).map(p => (
              <button key={p} onClick={() => { setPeriod(p); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${ period === p ? "bg-white shadow text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]" }`}>
                {p === "all" ? "Todos" : `${p}d`}
              </button>
            ))}
          </div>
          <select value={typeF} onChange={e => { setTypeF(e.target.value); setPage(0); }}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-white text-[var(--text-primary)]">
            <option value="all">Todos os tipos</option>
            {types.map(t => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
          </select>
          <span className="text-sm text-[var(--text-muted)] ml-auto">{loading ? "…" : `${totalCount} eventos encontrados`}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Data</th><th>Animal</th><th>Tipo</th><th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="text-center py-12 text-[var(--text-muted)]">Carregando...</td></tr>
              )}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-[var(--text-muted)]">Nenhum evento encontrado</td></tr>
              )}
              {visible.map(e => {
                const animal = e.animal_id ? animals.get(e.animal_id) : null;
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-[var(--text-secondary)]">{fmtDate(e.event_date)}</td>
                    <td>
                      {animal ? (
                        <span className="font-medium text-[var(--text-primary)]">
                          {animal.internal_code}{animal.nickname ? ` · ${animal.nickname}` : ""}
                        </span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${TYPE_COLOR[e.event_type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {TYPE_LABEL[e.event_type] ?? e.event_type}
                      </span>
                    </td>
                    <td className="text-[var(--text-secondary)] text-sm max-w-xs truncate">{e.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}
              className="ag-button-secondary disabled:opacity-40">Anterior</button>
            <span className="text-sm text-[var(--text-muted)]">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}
              className="ag-button-secondary disabled:opacity-40">Próximo</button>
          </div>
        )}
      </section>
    </main>
  );
}