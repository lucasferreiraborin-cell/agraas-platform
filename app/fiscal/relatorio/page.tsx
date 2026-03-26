"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Note = { id: string; numero_nota: string; emitente_nome: string; data_emissao: string; valor_total: number; status: string };
type Alert = { note_id: string; tipo: string; severidade: string; descricao: string; resolvido: boolean };

function riskColor(notes: Note[], alertsByNote: Map<string, Alert[]>) {
  let hasCritical = false, hasWarning = false;
  for (const n of notes) {
    const a = alertsByNote.get(n.id) ?? [];
    if (a.some(x => x.severidade === "critico" && !x.resolvido)) hasCritical = true;
    else if (a.some(x => x.severidade === "aviso"   && !x.resolvido)) hasWarning  = true;
  }
  if (hasCritical) return { label: "Alto", color: "text-red-600",   bg: "bg-red-50 border-red-200" };
  if (hasWarning)  return { label: "Médio", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  return               { label: "Baixo",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
}

export default function FiscalRelatorioPage() {
  const [notes, setNotes]   = useState<Note[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mes, setMes]       = useState("");
  const [ano, setAno]       = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: n }, { data: a }] = await Promise.all([
        supabase.from("fiscal_notes").select("id, numero_nota, emitente_nome, data_emissao, valor_total, status").order("data_emissao", { ascending: false }),
        supabase.from("fiscal_alerts").select("note_id, tipo, severidade, descricao, resolvido"),
      ]);
      setNotes(n ?? []);
      setAlerts(a ?? []);
      setLoading(false);
    })();
  }, []);

  const alertsByNote = new Map<string, Alert[]>();
  for (const a of alerts) {
    const list = alertsByNote.get(a.note_id) ?? [];
    list.push(a);
    alertsByNote.set(a.note_id, list);
  }

  const filtered = notes.filter(n => {
    if (!n.data_emissao) return true;
    const d = new Date(n.data_emissao);
    if (ano && d.getFullYear().toString() !== ano) return false;
    if (mes && String(d.getMonth() + 1).padStart(2, "0") !== mes) return false;
    return true;
  });

  const valorPeriodo = filtered.reduce((s, n) => s + Number(n.valor_total ?? 0), 0);

  // Top 5 alert types
  const tipoCount = new Map<string, number>();
  for (const a of alerts) tipoCount.set(a.tipo, (tipoCount.get(a.tipo) ?? 0) + 1);
  const top5 = Array.from(tipoCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const risk = riskColor(filtered, alertsByNote);

  function exportCsv() {
    const rows = [["Número", "Emitente", "Data", "Valor", "Status", "Alertas", "Alertas Críticos"]];
    for (const n of filtered) {
      const noteAlerts = alertsByNote.get(n.id) ?? [];
      rows.push([
        n.numero_nota, n.emitente_nome ?? "", n.data_emissao ?? "", String(n.valor_total ?? 0),
        n.status, String(noteAlerts.length), String(noteAlerts.filter(a => a.severidade === "critico").length),
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "relatorio-fiscal.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/fiscal" className="text-sm text-[var(--primary)] hover:underline">← Fiscal</Link>
          <h1 className="ag-section-title mt-2">Relatório Fiscal</h1>
          <p className="ag-section-subtitle">Consolidado para o contador</p>
        </div>
        <button onClick={exportCsv} className="ag-button-secondary text-sm">Exportar CSV</button>
      </div>

      {/* Filtros */}
      <div className="ag-card flex flex-wrap gap-4">
        <div>
          <label className="ag-kpi-label block mb-1">Mês</label>
          <select value={mes} onChange={e => setMes(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]">
            <option value="">Todos</option>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <option key={m} value={String(m).padStart(2,"0")}>
                {new Date(2000,m-1).toLocaleString("pt-BR",{month:"long"})}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="ag-kpi-label block mb-1">Ano</label>
          <select value={ano} onChange={e => setAno(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]">
            {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs + Risco */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="ag-card"><p className="ag-kpi-label">Notas no período</p><p className="ag-kpi-value">{filtered.length}</p></div>
        <div className="ag-card"><p className="ag-kpi-label">Valor total</p><p className="ag-kpi-value text-xl">R${valorPeriodo.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p></div>
        <div className="ag-card"><p className="ag-kpi-label">Com alertas</p><p className="ag-kpi-value">{filtered.filter(n=>(alertsByNote.get(n.id)?.length??0)>0).length}</p></div>
        <div className={`ag-card border ${risk.bg}`}>
          <p className="ag-kpi-label">Risco fiscal</p>
          <p className={`ag-kpi-value ${risk.color}`}>{risk.label}</p>
        </div>
      </div>

      {/* Top alertas */}
      {top5.length > 0 && (
        <div className="ag-card-strong space-y-3">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Top 5 tipos de alerta</h2>
          <div className="space-y-2">
            {top5.map(([tipo, count]) => (
              <div key={tipo} className="flex items-center gap-3">
                <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.round((count / (top5[0][1] || 1)) * 180)}px`, minWidth: "8px" }} />
                <span className="text-sm text-[var(--text-secondary)]">{tipo}</span>
                <span className="ml-auto text-sm font-medium text-[var(--text-primary)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="ag-card-strong space-y-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Notas do período</h2>
        {loading ? <p className="text-sm text-[var(--text-muted)]">Carregando…</p> : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhuma nota no período selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead><tr><th>Número</th><th>Emitente</th><th>Data</th><th>Valor</th><th>Status</th><th>Alertas</th><th></th></tr></thead>
              <tbody>
                {filtered.map(n => {
                  const noteAlerts = alertsByNote.get(n.id) ?? [];
                  const critical = noteAlerts.filter(a => a.severidade === "critico").length;
                  return (
                    <tr key={n.id}>
                      <td className="font-medium">{n.numero_nota}</td>
                      <td>{n.emitente_nome ?? "—"}</td>
                      <td>{n.data_emissao ? new Date(n.data_emissao).toLocaleDateString("pt-BR") : "—"}</td>
                      <td>R${Number(n.valor_total??0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                      <td><span className={`ag-badge ${n.status==="validada"?"ag-badge-green":n.status==="erro"?"bg-red-50 text-red-700 border border-red-200":""}`}>{n.status}</span></td>
                      <td>
                        {noteAlerts.length === 0 ? <span className="ag-badge ag-badge-green">OK</span> : (
                          <span className={`ag-badge ${critical>0?"bg-red-50 text-red-700 border border-red-200":"bg-amber-50 text-amber-700 border border-amber-200"}`}>
                            {noteAlerts.length} alerta{noteAlerts.length>1?"s":""}
                          </span>
                        )}
                      </td>
                      <td><Link href={`/fiscal/${n.id}`} className="text-xs font-medium text-[var(--primary)] hover:underline">Ver</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
