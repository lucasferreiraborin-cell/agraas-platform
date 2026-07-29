import Link from "next/link";
import { Truck, Plus, ArrowRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { KpiCard } from "@/app/components/ui/KpiCard";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Módulo GTA (Guia de Trânsito Animal)
//
// Lista as GTAs do cliente (RLS via cookies). DEFENSIVO: se a migration 157
// ainda não rodou, `supabase.from("gta")` devolve { data: null, error } — tratamos
// como lista vazia + console.error, mostrando o empty-state honesto do módulo.
// ─────────────────────────────────────────────────────────────────────────────

type GtaRow = {
  id: string;
  numero: string | null;
  serie: string | null;
  finalidade: string | null;
  origem_property_id: string | null;
  destino_nome: string | null;
  destino_uf: string | null;
  especie: string | null;
  quantidade: number | null;
  data_emissao: string | null;
  data_validade: string | null;
  status: string | null;
  lot_id: string | null;
};

type PropertyRow = { id: string; name: string; city: string | null; state: string | null };

const FINALIDADE_LABEL: Record<string, string> = {
  venda: "Venda",
  transferencia: "Transferência",
  abate: "Abate",
  exposicao: "Exposição",
  outro: "Outro",
};

const STATUS_LABEL: Record<string, string> = {
  emitida: "Emitida",
  em_transito: "Em trânsito",
  recebida: "Recebida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const STATUS_CLS: Record<string, string> = {
  emitida: "bg-[#DBEAFE] text-[#1E40AF] border-blue-200",
  em_transito: "bg-amber-50 text-amber-700 border-amber-200",
  recebida: "bg-[#DCFCE7] text-[#166534] border-emerald-200",
  vencida: "bg-red-50 text-red-700 border-red-200",
  cancelada: "bg-gray-100 text-gray-500 border-gray-200",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default async function GtaPage() {
  const supabase = await createSupabaseServerClient();

  // Query defensiva: se a tabela `gta` não existir (migration 157 pendente),
  // supabase-js retorna { data: null, error }. Logamos e seguimos com [].
  const { data: gtaData, error: gtaError } = await supabase
    .from("gta")
    .select(
      "id, numero, serie, finalidade, origem_property_id, destino_nome, destino_uf, especie, quantidade, data_emissao, data_validade, status, lot_id",
    )
    .order("data_emissao", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (gtaError) {
    // Esperado enquanto a migration 157 não roda em produção. Não quebra a página.
    console.error("[/gta] falha ao ler tabela gta (migration 157 pendente?):", gtaError.message);
  }

  const rows = (gtaData ?? []) as unknown as GtaRow[];

  // Propriedades para resolver o nome da origem (fetch separado — evita depender
  // do relationship detection do PostgREST e continua defensivo).
  const originIds = [...new Set(rows.map((r) => r.origem_property_id).filter(Boolean))] as string[];
  const propMap = new Map<string, PropertyRow>();
  if (originIds.length > 0) {
    const { data: propsData, error: propsError } = await supabase
      .from("properties")
      .select("id, name, city, state")
      .in("id", originIds);
    if (propsError) {
      console.error("[/gta] falha ao ler properties:", propsError.message);
    }
    for (const p of (propsData ?? []) as unknown as PropertyRow[]) propMap.set(p.id, p);
  }

  // ── KPIs (computados de forma honesta a partir das datas/status) ──────────────
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const total = rows.length;
  const emTransito = rows.filter((r) => r.status === "em_transito").length;

  const isTerminal = (s: string | null) => s === "recebida" || s === "cancelada";

  const vencendo30 = rows.filter((r) => {
    if (!r.data_validade || isTerminal(r.status) || r.status === "vencida") return false;
    const dv = new Date(r.data_validade);
    if (Number.isNaN(dv.getTime())) return false;
    return dv >= now && dv <= in30;
  }).length;

  const vencidas = rows.filter((r) => {
    if (r.status === "vencida") return true;
    if (isTerminal(r.status)) return false;
    if (!r.data_validade) return false;
    const dv = new Date(r.data_validade);
    if (Number.isNaN(dv.getTime())) return false;
    return dv < now;
  }).length;

  function originLabel(row: GtaRow): string {
    if (!row.origem_property_id) return "—";
    const p = propMap.get(row.origem_property_id);
    if (!p) return "Propriedade";
    const uf = p.state ? ` (${p.state})` : "";
    return `${p.name}${uf}`;
  }

  function destinationLabel(row: GtaRow): string {
    const nome = row.destino_nome?.trim();
    if (!nome) return "—";
    return row.destino_uf ? `${nome} (${row.destino_uf})` : nome;
  }

  return (
    <main className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Truck size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Guia de Trânsito Animal</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                {total} guia{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Link href="/gta/nova" className="ag-button-primary flex items-center gap-2">
            <Plus size={16} /> Registrar GTA
          </Link>
        </div>
      </section>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total de guias" value={total} sub="registradas na plataforma" />
        <KpiCard label="Em trânsito" value={emTransito} sub="animais em deslocamento" tone="warning" />
        <KpiCard label="Vencendo em 30d" value={vencendo30} sub="validade próxima do fim" tone="warning" />
        <KpiCard label="Vencidas" value={vencidas} sub="fora do prazo de validade" tone={vencidas > 0 ? "danger" : "default"} />
      </section>

      {/* ── Lista / Empty-state ───────────────────────────────────────────── */}
      {total === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon">
            <Truck size={24} />
          </div>
          <p className="ag-empty-state-title">Nenhuma GTA registrada</p>
          <p className="ag-empty-state-text">
            A Guia de Trânsito Animal é o documento oficial obrigatório para todo deslocamento de
            animais — venda, transferência entre propriedades, envio ao abate ou exposição. Este
            módulo registra o trânsito real (origem → destino, número, finalidade, datas e validade),
            indo além do selo de certificação. Registre a primeira guia para começar.
          </p>
          <Link href="/gta/nova" className="ag-button-primary mt-5 inline-flex items-center gap-2">
            <Plus size={16} /> Registrar GTA
          </Link>
        </div>
      ) : (
        <section className="ag-card overflow-x-auto p-0 pb-20">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Número</th>
                <th>Finalidade</th>
                <th>Origem → Destino</th>
                <th>Qtd.</th>
                <th>Emissão</th>
                <th>Validade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">
                    {r.numero ?? "—"}
                    {r.serie ? <span className="text-[var(--text-muted)]"> / {r.serie}</span> : null}
                  </td>
                  <td className="text-sm">
                    {r.finalidade ? FINALIDADE_LABEL[r.finalidade] ?? r.finalidade : "—"}
                  </td>
                  <td className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-primary)]">{originLabel(r)}</span>
                      <ArrowRight size={13} className="shrink-0 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-primary)]">{destinationLabel(r)}</span>
                    </div>
                  </td>
                  <td className="text-sm font-medium">{r.quantidade ?? "—"}</td>
                  <td className="text-sm">{fmtDate(r.data_emissao)}</td>
                  <td className="text-sm">{fmtDate(r.data_validade)}</td>
                  <td>
                    {r.status ? (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          STATUS_CLS[r.status] ?? STATUS_CLS.cancelada
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
