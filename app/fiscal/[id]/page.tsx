import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
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

  const severidadeBadge = (s: string) => {
    if (s === "critico") return "rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200";
    if (s === "aviso")   return "rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200";
    return "rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200";
  };
  const severidadeLabel = (s: string) => s === "critico" ? "Crítico" : s === "aviso" ? "Aviso" : "Info";

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/fiscal" className="text-sm text-[var(--primary)] hover:underline">← Fiscal</Link>
          <h1 className="ag-section-title mt-2">NF-e nº {note.numero_nota}</h1>
          <p className="ag-section-subtitle">Série {note.serie} • {note.emitente_nome}</p>
        </div>
        <FiscalNoteActions noteId={id} status={note.status} />
      </div>

      {/* Dados da nota */}
      <div className="ag-card-strong grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><p className="ag-kpi-label">Emitente CNPJ</p><p className="ag-kpi-value text-base">{note.emitente_cnpj ?? "—"}</p></div>
        <div><p className="ag-kpi-label">Data emissão</p><p className="ag-kpi-value text-base">{note.data_emissao ? new Date(note.data_emissao).toLocaleDateString("pt-BR") : "—"}</p></div>
        <div><p className="ag-kpi-label">Valor total</p><p className="ag-kpi-value text-base">R${Number(note.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        <div><p className="ag-kpi-label">Status</p><p className="ag-kpi-value text-base capitalize">{note.status}</p></div>
      </div>

      {/* Itens */}
      <div className="ag-card-strong space-y-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Itens da nota ({items?.length ?? 0})</h2>
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Descrição</th><th>NCM</th><th>CFOP</th>
                <th>Qtd</th><th>Un</th><th>Vl. Unit.</th><th>Vl. Total</th>
                <th>ICMS %</th><th>ICMS R$</th><th>IPI R$</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map(item => (
                <tr key={item.id}>
                  <td>{item.descricao ?? "—"}</td>
                  <td className="font-mono text-xs">{item.ncm ?? "—"}</td>
                  <td className="font-mono text-xs">{item.cfop ?? "—"}</td>
                  <td>{Number(item.quantidade ?? 0).toLocaleString("pt-BR")}</td>
                  <td>{item.unidade ?? "—"}</td>
                  <td>R${Number(item.valor_unitario ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td>R${Number(item.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td>{item.icms_aliquota ?? "—"}%</td>
                  <td>{item.icms_valor ? `R$${Number(item.icms_valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                  <td>{item.ipi_valor ? `R$${Number(item.ipi_valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas */}
      {(alerts?.length ?? 0) > 0 && (
        <div className="ag-card-strong space-y-3">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Alertas ({alerts!.length})</h2>
          <div className="space-y-2">
            {alerts!.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                <span className={severidadeBadge(alert.severidade)}>{severidadeLabel(alert.severidade)}</span>
                <p className="text-sm text-[var(--text-secondary)]">{alert.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
