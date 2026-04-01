import { createSupabaseServerClient } from "@/lib/supabase-server";
import FiscalUploadAgri from "@/app/components/FiscalUploadAgri";
import { Receipt } from "lucide-react";

type Note = {
  id: string;
  farm_id: string | null;
  numero_nota: string | null;
  emitente_cnpj: string | null;
  emitente_nome: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  status: string;
  created_at: string;
};
type Farm = { id: string; name: string };

const STATUS_BADGE: Record<string, string> = {
  pendente:  "bg-amber-100 text-amber-700 border-amber-200",
  validada:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  erro:      "bg-red-100 text-red-700 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", validada: "Validada", erro: "Erro",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function fmtBRL(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AgriculturaFiscalPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: notesData }, { data: farmsData }] = await Promise.all([
    supabase.from("crop_fiscal_notes")
      .select("id, farm_id, numero_nota, emitente_cnpj, emitente_nome, data_emissao, valor_total, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("farms_agriculture").select("id, name").order("name"),
  ]);

  const notes = (notesData ?? []) as Note[];
  const farms = (farmsData ?? []) as Farm[];
  const farmMap = new Map(farms.map(f => [f.id, f.name]));

  const total      = notes.length;
  const validadas  = notes.filter(n => n.status === "validada").length;
  const erros      = notes.filter(n => n.status === "erro").length;
  const valorTotal = notes.reduce((s, n) => s + (n.valor_total ?? 0), 0);

  const kpis = [
    { label: "Notas importadas", value: total,               sub: "total",            color: "text-[var(--text-primary)]" },
    { label: "Valor total",      value: fmtBRL(valorTotal),  sub: "soma das notas",   color: "text-blue-600" },
    { label: "Validadas",        value: validadas,            sub: "sem alertas",      color: "text-emerald-600" },
    { label: "Com erro",         value: erros,               sub: "requerem revisão", color: erros > 0 ? "text-red-600" : "text-[var(--text-primary)]" },
  ];

  return (
    <main className="space-y-8">
      {/* ── Hero ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] shrink-0">
              <Receipt size={22} className="text-[var(--primary)]" />
            </span>
            <div>
              <span className="ag-badge ag-badge-green">Agricultura</span>
              <h1 className="ag-page-title mt-2">Fiscal Agrícola</h1>
              <p className="mt-1 text-[var(--text-secondary)]">Notas fiscais eletrônicas de insumos e movimentações agrícolas</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="ag-kpi-card">
                <p className="ag-kpi-label">{k.label}</p>
                <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
                <p className="sub">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Upload ── */}
      <section className="ag-card-strong p-8">
        <h2 className="ag-section-title mb-4">Importar nota fiscal</h2>
        <FiscalUploadAgri farms={farms} />
      </section>

      {/* ── Listagem ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
          <h2 className="ag-section-title">Notas importadas</h2>
          <span className="ag-badge ag-badge-dark">{total} nota{total !== 1 ? "s" : ""}</span>
        </div>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Receipt size={32} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhuma nota fiscal importada ainda.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Use o painel acima para importar um .xml ou .pdf de NF-e.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Emitente</th>
                  <th>Fazenda</th>
                  <th>Data emissão</th>
                  <th>Valor total</th>
                  <th>Status</th>
                  <th>Importado em</th>
                </tr>
              </thead>
              <tbody>
                {notes.map(n => (
                  <tr key={n.id}>
                    <td className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {n.numero_nota ?? "—"}
                    </td>
                    <td>
                      {n.emitente_nome && (
                        <p className="font-medium text-[var(--text-primary)] text-sm">{n.emitente_nome}</p>
                      )}
                      {n.emitente_cnpj && (
                        <p className="text-xs font-mono text-[var(--text-muted)]">{n.emitente_cnpj}</p>
                      )}
                      {!n.emitente_nome && !n.emitente_cnpj && <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="text-sm text-[var(--text-secondary)]">
                      {n.farm_id ? (farmMap.get(n.farm_id) ?? "—") : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="whitespace-nowrap text-sm text-[var(--text-secondary)]">{fmtDate(n.data_emissao)}</td>
                    <td className="tabular-nums text-sm font-medium text-[var(--text-primary)]">{fmtBRL(n.valor_total)}</td>
                    <td>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[n.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {STATUS_LABEL[n.status] ?? n.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-[var(--text-muted)]">{fmtDate(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
