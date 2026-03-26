import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { FileText, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import FiscalUpload from "@/app/components/FiscalUpload";

export default async function FiscalPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: notes },
    { data: alertsData },
  ] = await Promise.all([
    supabase
      .from("fiscal_notes")
      .select("id, numero_nota, serie, emitente_nome, data_emissao, valor_total, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("fiscal_alerts").select("note_id, severidade").eq("resolvido", false),
  ]);

  const noteList = notes ?? [];
  const alertsByNote = new Map<string, number>();
  for (const a of alertsData ?? []) {
    alertsByNote.set(a.note_id, (alertsByNote.get(a.note_id) ?? 0) + 1);
  }

  const totalNotas    = noteList.length;
  const notasAlerta   = noteList.filter(n => (alertsByNote.get(n.id) ?? 0) > 0).length;
  const notasValidada = noteList.filter(n => n.status === "validada").length;
  const valorTotal    = noteList.reduce((s, n) => s + Number(n.valor_total ?? 0), 0);

  const statusCls = (s: string) => {
    if (s === "validada") return "ag-badge ag-badge-green";
    if (s === "erro")     return "ag-badge bg-red-50 text-red-700 border border-red-200";
    return "ag-badge bg-amber-50 text-amber-700 border border-amber-200";
  };
  const statusLabel = (s: string) =>
    s === "validada" ? "Validada" : s === "erro" ? "Erro" : "Pendente";

  const kpis = [
    {
      label: "Notas importadas",
      value: totalNotas,
      sub: "total no período",
      icon: FileText,
      iconColor: "text-[var(--primary)]",
      iconBg:    "bg-[var(--primary-soft)]",
    },
    {
      label: "Com alerta",
      value: notasAlerta,
      sub: notasAlerta === 0 ? "nenhum alerta ativo" : "requerem atenção",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      iconBg:    "bg-amber-50",
    },
    {
      label: "Validadas",
      value: notasValidada,
      sub: "aplicadas ao estoque",
      icon: CheckCircle,
      iconColor: "text-emerald-600",
      iconBg:    "bg-emerald-50",
    },
    {
      label: "Valor total",
      value: `R$\u00a0${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      sub: "soma de todas as notas",
      icon: DollarSign,
      iconColor: "text-blue-600",
      iconBg:    "bg-blue-50",
    },
  ];

  return (
    <main className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Left */}
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.15)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Módulo Fiscal</span>
            <h1 className="ag-page-title">
              Gestão fiscal de NF-e
            </h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Importe XMLs de notas fiscais, valide NCMs e CFOPs automaticamente,
              analise riscos com IA e aplique compras ao estoque de insumos.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/fiscal/relatorio" className="ag-button-secondary">
                Relatório Fiscal
              </Link>
              <Link href="/insumos" className="ag-button-secondary">
                Ver estoque
              </Link>
            </div>
          </div>

          {/* Right — hero panel */}
          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              {kpis.map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="ag-kpi-card">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                      <Icon size={18} className={kpi.iconColor} />
                    </div>
                    <p className="mt-3 ag-kpi-label">{kpi.label}</p>
                    <p className="ag-kpi-value">{kpi.value}</p>
                    <p className="sub">{kpi.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Upload ───────────────────────────────────────────────────────── */}
      <section className="ag-card-strong space-y-4 p-8">
        <div>
          <h2 className="ag-section-title">Importar NF-e</h2>
          <p className="ag-section-subtitle">Arraste o arquivo XML ou clique para selecionar</p>
        </div>
        <FiscalUpload />
      </section>

      {/* ── Tabela de notas ──────────────────────────────────────────────── */}
      <section className="ag-card-strong space-y-4 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Notas fiscais</h2>
            <p className="ag-section-subtitle">{totalNotas} nota{totalNotas !== 1 ? "s" : ""} importada{totalNotas !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {noteList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-14 text-center">
            <FileText size={32} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Nenhuma nota importada ainda</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Use o campo acima para importar o XML de uma NF-e</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Número / Série</th>
                  <th className="text-left">Emitente</th>
                  <th className="text-left">Data emissão</th>
                  <th className="text-right">Valor total</th>
                  <th className="text-center">Alertas</th>
                  <th className="text-center">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {noteList.map(note => {
                  const count = alertsByNote.get(note.id) ?? 0;
                  return (
                    <tr key={note.id}>
                      <td className="font-medium tabular-nums">
                        {note.numero_nota}
                        {note.serie ? <span className="text-[var(--text-muted)]">-{note.serie}</span> : ""}
                      </td>
                      <td className="max-w-[200px] truncate">{note.emitente_nome ?? "—"}</td>
                      <td className="tabular-nums">
                        {note.data_emissao
                          ? new Date(note.data_emissao).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="text-right tabular-nums font-medium">
                        R${Number(note.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center">
                        {count > 0 ? (
                          <span className="ag-badge bg-amber-50 text-amber-700 border border-amber-200">
                            {count} alerta{count > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="ag-badge ag-badge-green">OK</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={statusCls(note.status)}>{statusLabel(note.status)}</span>
                      </td>
                      <td>
                        <Link
                          href={`/fiscal/${note.id}`}
                          className="text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                          Ver detalhes →
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
