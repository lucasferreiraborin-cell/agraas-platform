import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import FiscalUpload from "@/app/components/FiscalUpload";

export default async function FiscalPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: notes },
    { data: alertsData },
  ] = await Promise.all([
    supabase.from("fiscal_notes").select("id, numero_nota, serie, emitente_nome, data_emissao, valor_total, status, created_at").order("created_at", { ascending: false }),
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

  const statusBadge = (s: string) => {
    if (s === "validada") return "ag-badge ag-badge-green";
    if (s === "erro")     return "ag-badge" + " bg-red-50 text-red-700 border border-red-200";
    return "ag-badge";
  };
  const statusLabel = (s: string) => s === "validada" ? "Validada" : s === "erro" ? "Erro" : "Pendente";

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ag-section-title">Módulo Fiscal</h1>
          <p className="ag-section-subtitle">Importação e validação de NF-e</p>
        </div>
        <Link href="/fiscal/relatorio" className="ag-button-secondary text-sm">
          Relatório Fiscal
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Notas importadas", value: totalNotas },
          { label: "Com alerta", value: notasAlerta },
          { label: "Validadas", value: notasValidada },
          { label: "Valor total", value: `R$\u00a0${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
        ].map(kpi => (
          <div key={kpi.label} className="ag-card">
            <p className="ag-kpi-label">{kpi.label}</p>
            <p className="ag-kpi-value">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Upload */}
      <div className="ag-card-strong space-y-3">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Importar NF-e</h2>
        <FiscalUpload />
      </div>

      {/* Tabela de notas */}
      <div className="ag-card-strong space-y-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Notas fiscais</h2>
        {noteList.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhuma nota importada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Emitente</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Alertas</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {noteList.map(note => (
                  <tr key={note.id}>
                    <td className="font-medium">{note.numero_nota}{note.serie ? `-${note.serie}` : ""}</td>
                    <td>{note.emitente_nome ?? "—"}</td>
                    <td>{note.data_emissao ? new Date(note.data_emissao).toLocaleDateString("pt-BR") : "—"}</td>
                    <td>R${Number(note.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td>
                      {(alertsByNote.get(note.id) ?? 0) > 0 ? (
                        <span className="ag-badge bg-amber-50 text-amber-700 border border-amber-200">
                          {alertsByNote.get(note.id)} alerta{(alertsByNote.get(note.id) ?? 0) > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="ag-badge ag-badge-green">OK</span>
                      )}
                    </td>
                    <td><span className={statusBadge(note.status)}>{statusLabel(note.status)}</span></td>
                    <td>
                      <Link href={`/fiscal/${note.id}`} className="text-xs font-medium text-[var(--primary)] hover:underline">
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
