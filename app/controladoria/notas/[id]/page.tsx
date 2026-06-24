/**
 * Controladoria — Revisão de NF-e.
 *
 * Layout dois painéis:
 *  - Esquerda: dados da nota extraídos (chave, emissor, valor, FUNRURAL, itens)
 *  - Direita: lançamentos contábeis gerados (accounting_entries com source_id)
 *
 * Server Component. Ações (aprovar/rejeitar) via botões server action / form.
 * Tabelas defensivas: sem erro se accounting_entries ainda não existir.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
  XCircle,
  BookOpen,
  FileText,
} from "lucide-react";
import NotaReviewActions from "@/app/components/controladoria/NotaReviewActions";

export const dynamic = "force-dynamic";

type FiscalInvoice = {
  id: string;
  invoice_number: string | null;
  series: string | null;
  access_key: string | null;
  issuer_name: string | null;
  issuer_cnpj: string | null;
  recipient_name: string | null;
  emission_date: string | null;
  total_amount: number | null;
  direction: string | null;
  status: string | null;
  source: string | null;
  items_json: unknown;
  funrural_value: number | null;
  rejection_reason: string | null;
};

type AccountingEntry = {
  id: string;
  entry_date: string | null;
  description: string | null;
  account_code: string | null;
  account_name: string | null;
  debit_amount: number | null;
  credit_amount: number | null;
  entry_type: string | null;
};

export default async function NotaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Busca a nota
  const { data: raw, error } = await supabase
    .from("fiscal_invoices")
    .select(
      "id, invoice_number, series, access_key, issuer_name, issuer_cnpj, recipient_name, emission_date, total_amount, direction, status, source, items_json, funrural_value, rejection_reason",
    )
    .eq("id", id)
    .single();

  if (error || !raw) notFound();
  const nota = raw as FiscalInvoice;

  // Lançamentos contábeis relacionados (defensivo)
  let entries: AccountingEntry[] = [];
  try {
    const { data } = await supabase
      .from("accounting_entries")
      .select(
        "id, entry_date, description, account_code, account_name, debit_amount, credit_amount, entry_type",
      )
      .eq("source_id", id)
      .order("entry_date", { ascending: false });
    entries = (data ?? []) as AccountingEntry[];
  } catch {
    entries = [];
  }

  // Itens da nota (JSON)
  type InvoiceItem = {
    description?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
    ncm?: string;
    cfop?: string;
  };
  const items: InvoiceItem[] =
    Array.isArray(nota.items_json) ? (nota.items_json as InvoiceItem[]) : [];

  const funrural =
    nota.funrural_value ??
    (nota.direction === "outbound" && nota.total_amount
      ? Number(nota.total_amount) * 0.015
      : null);

  return (
    <main className="space-y-8">
      <div>
        <Link
          href="/controladoria/notas"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary-hover)]"
        >
          <ArrowLeft size={14} />
          Voltar para Notas
        </Link>
      </div>

      <PageHeader
        badge={`Controladoria · NF-e ${nota.invoice_number ?? id.slice(0, 8)}`}
        title={`Nota ${nota.invoice_number ?? "—"}${nota.series ? ` · Série ${nota.series}` : ""}`}
        description="Confira os dados extraídos e os lançamentos contábeis gerados. Aprove ou rejeite para finalizar."
        actions={<NotaReviewActions notaId={id} currentStatus={nota.status} />}
      />

      {/* Status Banner */}
      {nota.status === "rejected" && nota.rejection_reason && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Nota rejeitada</p>
            <p className="mt-1 text-sm text-red-700">{nota.rejection_reason}</p>
          </div>
        </div>
      )}
      {nota.status === "reviewed" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
          <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-800">
            Nota revisada e aprovada
          </p>
        </div>
      )}

      {/* Layout dois painéis */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Painel esquerdo — Dados da nota */}
        <section className="ag-card-strong p-8 space-y-6">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Receipt size={17} className="text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="ag-section-title">Dados da nota</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {sourceLabel(nota.source)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DataItem label="Número" value={nota.invoice_number ?? "—"} />
            <DataItem label="Série" value={nota.series ?? "—"} />
            <DataItem label="Emissão" value={formatDate(nota.emission_date)} />
            <DataItem
              label="Direção"
              value={nota.direction === "inbound" ? "Entrada" : nota.direction === "outbound" ? "Saída" : "—"}
            />
            <DataItem
              label="Valor total"
              value={
                nota.total_amount == null
                  ? "—"
                  : `R$ ${Number(nota.total_amount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
              }
            />
            <DataItem
              label="FUNRURAL estimado"
              value={
                funrural == null
                  ? "—"
                  : `R$ ${funrural.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
              }
            />
          </div>

          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <DataItem label="Emitente" value={nota.issuer_name ?? "—"} />
            <DataItem label="CNPJ emitente" value={nota.issuer_cnpj ?? "—"} />
            <DataItem label="Destinatário" value={nota.recipient_name ?? "—"} />
            {nota.access_key && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Chave de acesso</p>
                <p className="text-[11px] font-mono break-all text-[var(--text-secondary)] rounded bg-[var(--surface-soft)] px-2 py-1.5">
                  {nota.access_key}
                </p>
              </div>
            )}
          </div>

          {/* Itens da nota */}
          {items.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">
                Itens ({items.length})
              </p>
              <div className="overflow-x-auto">
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th className="text-right">Qtd</th>
                      <th className="text-right">Valor unit.</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="max-w-[200px] truncate" title={item.description ?? ""}>
                          {item.description ?? "—"}
                        </td>
                        <td className="text-right tabular-nums">
                          {item.quantity?.toLocaleString("pt-BR") ?? "—"}
                        </td>
                        <td className="text-right tabular-nums">
                          {item.unit_price == null
                            ? "—"
                            : `R$ ${Number(item.unit_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {item.total == null
                            ? "—"
                            : `R$ ${Number(item.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Painel direito — Lançamentos contábeis */}
        <section className="ag-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                <BookOpen size={17} className="text-[var(--primary)]" />
              </div>
              <div>
                <h2 className="ag-section-title">Lançamentos contábeis</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Gerados automaticamente pela IA fiscal
                </p>
              </div>
            </div>
            {entries.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--primary-hover)]">
                {entries.length} lançamento{entries.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {entries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum lançamento gerado"
              text="Os lançamentos contábeis aparecem aqui após o processamento fiscal da nota."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Conta</th>
                    <th>Descrição</th>
                    <th className="text-right">Débito</th>
                    <th className="text-right">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="text-sm">{formatDate(e.entry_date)}</td>
                      <td>
                        {e.account_code && (
                          <span className="text-xs font-mono text-[var(--text-muted)] mr-1">
                            {e.account_code}
                          </span>
                        )}
                        <span className="text-sm">{e.account_name ?? "—"}</span>
                      </td>
                      <td
                        className="max-w-[180px] truncate text-sm text-[var(--text-secondary)]"
                        title={e.description ?? ""}
                      >
                        {e.description ?? "—"}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {e.debit_amount == null || e.debit_amount === 0
                          ? "—"
                          : `R$ ${Number(e.debit_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {e.credit_amount == null || e.credit_amount === 0
                          ? "—"
                          : `R$ ${Number(e.credit_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totais de débito/crédito */}
          {entries.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between gap-4">
              <div className="text-sm text-[var(--text-muted)]">
                Total déb:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  R${" "}
                  {entries
                    .reduce((s, e) => s + Number(e.debit_amount ?? 0), 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Total créd:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  R${" "}
                  {entries
                    .reduce((s, e) => s + Number(e.credit_amount ?? 0), 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function sourceLabel(source: string | null | undefined): string {
  const map: Record<string, string> = {
    xml: "Importado via XML",
    pdf: "Importado via PDF",
    audio: "Ditado por voz",
    csv: "Importado via planilha",
    sefaz: "Sincronizado SEFAZ",
    manual: "Entrada manual",
  };
  if (!source) return "Origem não informada";
  return map[source] ?? source;
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
