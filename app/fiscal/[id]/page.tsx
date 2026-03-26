import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Building2, Calendar, DollarSign, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import FiscalNoteActions from "@/app/components/FiscalNoteActions";

type PageProps = { params: Promise<{ id: string }> };

export default async function FiscalNotePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: note },
    { data: items },
    { data: alerts },
  ] = await Promise.all([
    supabase.from("fiscal_notes").select("*").eq("id", id).single(),
    supabase.from("fiscal_note_items").select("*").eq("note_id", id).order("descricao"),
    supabase.from("fiscal_alerts").select("*").eq("note_id", id).order("severidade"),
  ]);

  if (!note) {
    return (
      <main className="space-y-4">
        <Link href="/fiscal" className="text-sm text-[var(--primary)] hover:underline">← Voltar</Link>
        <p className="text-[var(--text-secondary)]">Nota não encontrada.</p>
      </main>
    );
  }

  const statusConfig = {
    validada: { label: "Validada",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    erro:     { label: "Com erro",  cls: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500"     },
    pendente: { label: "Pendente",  cls: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500"   },
  }[note.status as "validada" | "erro" | "pendente"] ?? { label: note.status, cls: "ag-badge", dot: "bg-gray-400" };

  const kpis = [
    { label: "CNPJ emitente",  value: note.emitente_cnpj ?? "—",  icon: Building2,   iconBg: "bg-[var(--primary-soft)]", iconCl: "text-[var(--primary)]" },
    { label: "Data de emissão", value: note.data_emissao ? new Date(note.data_emissao).toLocaleDateString("pt-BR") : "—", icon: Calendar, iconBg: "bg-blue-50", iconCl: "text-blue-600" },
    { label: "Valor total",     value: `R$\u00a0${Number(note.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, iconBg: "bg-emerald-50", iconCl: "text-emerald-600" },
    { label: "Itens",           value: `${items?.length ?? 0} produto${(items?.length ?? 0) !== 1 ? "s" : ""}`, icon: ShieldCheck, iconBg: "bg-purple-50", iconCl: "text-purple-600" },
  ];

  const criticos = (alerts ?? []).filter(a => a.severidade === "critico").length;
  const avisos   = (alerts ?? []).filter(a => a.severidade === "aviso").length;

  return (
    <main className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Left */}
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <Link href="/fiscal" className="text-sm text-[var(--primary)] hover:underline">← Fiscal</Link>
            <h1 className="ag-page-title">NF-e nº {note.numero_nota}</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Série {note.serie}
              {note.emitente_nome ? <> &bull; {note.emitente_nome}</> : ""}
            </p>

            {/* Badge de status grande */}
            <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusConfig.cls}`}>
              <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
              {statusConfig.label}
            </div>

            {/* Resumo de alertas */}
            {(alerts?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {criticos > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
                    <AlertTriangle size={11} />{criticos} crítico{criticos > 1 ? "s" : ""}
                  </span>
                )}
                {avisos > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <Info size={11} />{avisos} aviso{avisos > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right — ações */}
          <div className="ag-hero-panel">
            <FiscalNoteActions
              noteId={id}
              status={note.status}
              items={(items ?? []).map(it => ({
                id:          it.id,
                descricao:   it.descricao,
                ncm:         it.ncm,
                unidade:     it.unidade,
                valor_total: it.valor_total,
                quantidade:  it.quantidade,
              }))}
            />
          </div>
        </div>
      </section>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="ag-kpi-card">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                  <Icon size={17} className={kpi.iconCl} />
                </div>
                <p className="mt-3 ag-kpi-label">{kpi.label}</p>
                <p className="ag-kpi-value truncate">{kpi.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Itens da nota ─────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <h2 className="ag-section-title">Itens da nota</h2>
          <span className="ag-badge">{items?.length ?? 0} produto{(items?.length ?? 0) !== 1 ? "s" : ""}</span>
        </div>

        {(items?.length ?? 0) === 0 ? (
          <div className="mx-8 mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhum item registrado nesta nota.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--primary)] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                  <th className="px-4 py-3 text-left font-semibold">NCM</th>
                  <th className="px-4 py-3 text-left font-semibold">CFOP</th>
                  <th className="px-4 py-3 text-right font-semibold">Qtd</th>
                  <th className="px-4 py-3 text-left font-semibold">Un</th>
                  <th className="px-4 py-3 text-right font-semibold">Vl. Unit.</th>
                  <th className="px-4 py-3 text-right font-semibold">Vl. Total</th>
                  <th className="px-4 py-3 text-right font-semibold">ICMS %</th>
                  <th className="px-4 py-3 text-right font-semibold">ICMS R$</th>
                  <th className="px-4 py-3 text-right font-semibold">IPI R$</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((item, i) => (
                  <tr key={item.id} className={`border-b border-[var(--border)] hover:bg-[var(--surface-soft)] transition ${i % 2 === 0 ? "" : "bg-[var(--surface-soft)]/40"}`}>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{item.descricao ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{item.ncm ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{item.cfop ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(item.quantidade ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.unidade ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">R${Number(item.valor_unitario ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">R${Number(item.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">{item.icms_aliquota ?? "—"}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.icms_valor ? `R$${Number(item.icms_valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.ipi_valor ? `R$${Number(item.ipi_valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Alertas ───────────────────────────────────────────────────────── */}
      {(alerts?.length ?? 0) > 0 && (
        <section className="ag-card-strong p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="ag-section-title">Alertas</h2>
            <span className="ag-badge">{alerts!.length} alerta{alerts!.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {alerts!.map(alert => {
              const isCrit  = alert.severidade === "critico";
              const isAviso = alert.severidade === "aviso";
              const cardCls = isCrit
                ? "border-red-200 bg-red-50"
                : isAviso
                  ? "border-amber-200 bg-amber-50"
                  : "border-blue-200 bg-blue-50";
              const badgeCls = isCrit
                ? "bg-red-100 text-red-700 border border-red-300"
                : isAviso
                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                  : "bg-blue-100 text-blue-700 border border-blue-300";
              const label = isCrit ? "Crítico" : isAviso ? "Aviso" : "Info";
              const Icon  = isCrit ? AlertTriangle : isAviso ? AlertTriangle : Info;
              return (
                <div key={alert.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cardCls}`}>
                  <div className={`mt-0.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${badgeCls}`}>
                    <Icon size={10} />
                    {label}
                  </div>
                  <p className="text-sm">{alert.descricao}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </main>
  );
}
