"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { FileText, DollarSign, AlertTriangle, ShieldCheck, Download, TrendingUp } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Note  = { id: string; numero_nota: string; emitente_nome: string; data_emissao: string; valor_total: number; status: string };
type Alert = { note_id: string; tipo: string; severidade: string; descricao: string; resolvido: boolean };

function calcRisk(notes: Note[], alertsByNote: Map<string, Alert[]>) {
  let hasCritical = false, hasWarning = false;
  for (const n of notes) {
    const a = alertsByNote.get(n.id) ?? [];
    if (a.some(x => x.severidade === "critico" && !x.resolvido)) { hasCritical = true; break; }
    if (a.some(x => x.severidade === "aviso"   && !x.resolvido))   hasWarning  = true;
  }
  if (hasCritical) return { label: "Alto risco",   icon: "🔴", cls: "bg-red-50 text-red-700 border-red-200",     dot: "bg-red-500"     };
  if (hasWarning)  return { label: "Risco médio",  icon: "🟡", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500"   };
  return               { label: "Baixo risco",  icon: "🟢", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function FiscalRelatorioPage() {
  const [notes,   setNotes]   = useState<Note[]>([]);
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [mes,     setMes]     = useState("");
  const [ano,     setAno]     = useState(new Date().getFullYear().toString());
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
    if (!n.data_emissao) return !mes;
    const d = new Date(n.data_emissao);
    if (ano && d.getFullYear().toString() !== ano) return false;
    if (mes && String(d.getMonth() + 1).padStart(2, "0") !== mes) return false;
    return true;
  });

  const valorPeriodo  = filtered.reduce((s, n) => s + Number(n.valor_total ?? 0), 0);
  const comAlerta     = filtered.filter(n => (alertsByNote.get(n.id)?.length ?? 0) > 0).length;
  const validadas     = filtered.filter(n => n.status === "validada").length;
  const risk          = calcRisk(filtered, alertsByNote);

  const tipoCount = new Map<string, number>();
  for (const a of alerts) tipoCount.set(a.tipo, (tipoCount.get(a.tipo) ?? 0) + 1);
  const top5 = Array.from(tipoCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  function exportCsv() {
    const rows = [["Número","Emitente","Data","Valor","Status","Alertas","Críticos"]];
    for (const n of filtered) {
      const na = alertsByNote.get(n.id) ?? [];
      rows.push([n.numero_nota, n.emitente_nome ?? "", n.data_emissao ?? "", String(n.valor_total ?? 0),
        n.status, String(na.length), String(na.filter(a => a.severidade === "critico").length)]);
    }
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `relatorio-fiscal-${ano}${mes ? "-" + mes : ""}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const statusCls = (s: string) =>
    s === "validada" ? "ag-badge ag-badge-green" :
    s === "erro"     ? "ag-badge bg-red-50 text-red-700 border border-red-200" :
                       "ag-badge bg-amber-50 text-amber-700 border border-amber-200";

  const kpis = [
    { label: "Notas no período", value: filtered.length,  sub: "total filtrado",           icon: FileText,    iconBg: "bg-[var(--primary-soft)]",  iconCl: "text-[var(--primary)]" },
    { label: "Valor total",      value: `R$\u00a0${valorPeriodo.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, sub: "soma das notas", icon: DollarSign,  iconBg: "bg-blue-50",  iconCl: "text-blue-600" },
    { label: "Com alertas",      value: comAlerta,         sub: comAlerta === 0 ? "sem pendências" : "requerem atenção", icon: AlertTriangle, iconBg: "bg-amber-50",  iconCl: "text-amber-600" },
    { label: "Validadas",        value: validadas,         sub: "aplicadas ao estoque",    icon: ShieldCheck, iconBg: "bg-emerald-50", iconCl: "text-emerald-600" },
  ];

  return (
    <main className="space-y-8">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Left */}
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <Link href="/fiscal" className="text-sm text-[var(--primary)] hover:underline">← Fiscal</Link>
            <h1 className="ag-page-title">Relatório Fiscal</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Consolidado para o contador — todas as NF-e do período com alertas, valores e status de validação.
            </p>

            {/* Filtros inline */}
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Mês</label>
                <select
                  value={mes}
                  onChange={e => setMes(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                >
                  <option value="">Todos</option>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Ano</label>
                <select
                  value={ano}
                  onChange={e => setAno(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                >
                  {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={exportCsv} className="ag-button-secondary flex items-center gap-2">
                <Download size={14} />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Right — KPIs + risco */}
          <div className="ag-hero-panel">
            <div className="grid gap-3 sm:grid-cols-2">
              {kpis.map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="ag-kpi-card">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                      <Icon size={17} className={kpi.iconCl} />
                    </div>
                    <p className="mt-3 ag-kpi-label">{kpi.label}</p>
                    <p className="ag-kpi-value">{kpi.value}</p>
                    <p className="sub">{kpi.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Indicador de risco — badge grande */}
            <div className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 ${risk.cls}`}>
              <span className="text-lg">{risk.icon}</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">Risco fiscal</p>
                <p className="text-base font-bold leading-tight">{risk.label}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top alertas ───────────────────────────────────────────────────── */}
      {top5.length > 0 && (
        <section className="ag-card-strong p-8 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--primary)]" />
            <h2 className="ag-section-title">Alertas mais frequentes</h2>
          </div>
          <div className="space-y-3">
            {top5.map(([tipo, count]) => {
              const pct = Math.round((count / (top5[0][1] || 1)) * 100);
              return (
                <div key={tipo} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-xs text-[var(--text-muted)] truncate">{tipo.replace(/_/g, " ")}</div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--border)]">
                    <div className="h-2 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm font-semibold text-[var(--text-primary)]">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tabela ────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="ag-section-title">Notas do período</h2>
          <span className="ag-badge">{filtered.length} nota{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-[var(--text-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-12 text-center">
            <FileText size={28} className="text-[var(--text-muted)] mb-2" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Nenhuma nota no período selecionado</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Ajuste os filtros de mês e ano</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Número</th>
                  <th className="text-left">Emitente</th>
                  <th className="text-left">Data</th>
                  <th className="text-right">Valor</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Alertas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => {
                  const na       = alertsByNote.get(n.id) ?? [];
                  const critical = na.filter(a => a.severidade === "critico").length;
                  return (
                    <tr key={n.id} className="group">
                      <td className="font-medium tabular-nums">{n.numero_nota}</td>
                      <td className="max-w-[180px] truncate">{n.emitente_nome ?? "—"}</td>
                      <td className="tabular-nums text-[var(--text-secondary)]">
                        {n.data_emissao ? new Date(n.data_emissao).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="text-right tabular-nums font-medium">
                        R${Number(n.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center">
                        <span className={statusCls(n.status)}>
                          {n.status === "validada" ? "Validada" : n.status === "erro" ? "Erro" : "Pendente"}
                        </span>
                      </td>
                      <td className="text-center">
                        {na.length === 0 ? (
                          <span className="ag-badge ag-badge-green">OK</span>
                        ) : (
                          <span className={`ag-badge ${critical > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                            {na.length} alerta{na.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td>
                        <Link href={`/fiscal/${n.id}`} className="text-xs font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition hover:underline">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
