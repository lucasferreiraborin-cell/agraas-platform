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
import { funruralValue } from "@/lib/funrural";
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
  number: string | null;
  series: string | null;
  access_key: string | null;
  issuer_name: string | null;
  issuer_cnpj: string | null;
  recipient_name: string | null;
  issued_at: string | null;
  gross_value: number | null;
  direction: string | null;
  status: string | null;
  source: string | null;
  funrural_value: number | null;
  review_notes: string | null;
};

// Itens vêm da tabela `fiscal_invoice_items` (não de um items_json inexistente).
type InvoiceItemRow = {
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  ncm: string | null;
  cfop: string | null;
};

// Partida dobrada: UM valor (`amount`) + duas contas (débito/crédito).
// Não existem debit_amount/credit_amount/account_code/account_name/entry_type.
type AccountingEntry = {
  id: string;
  entry_date: string | null;
  description: string | null;
  amount: number | null;
  source_type: string | null;
};

export default async function NotaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Busca a nota. Colunas reais: `number`, `issued_at`, `gross_value`,
  // `review_notes` (motivo de revisão/rejeição). Itens são carregados à parte.
  const { data: raw, error } = await supabase
    .from("fiscal_invoices")
    .select(
      "id, number, series, access_key, issuer_name, issuer_cnpj, recipient_name, issued_at, gross_value, direction, status, source, funrural_value, review_notes",
    )
    .eq("id", id)
    .single();

  if (error || !raw) notFound();
  const nota = raw as FiscalInvoice;

  // Alíquota FUNRURAL parametrizada do cliente logado — só usada quando a nota
  // não tem funrural_value gravado (fallback de exibição). RLS já garante que
  // a nota pertence a este cliente. Cliente sem os campos cai no fallback PF.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: funruralClient } = user
    ? await supabase
        .from("clients")
        .select("funrural_rate, tax_regime")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  // Lançamentos contábeis relacionados (defensivo). Partida dobrada:
  // `amount` único + contas de débito/crédito. Filtra por source_id = id da nota.
  let entries: AccountingEntry[] = [];
  {
    const { data, error: entriesErr } = await supabase
      .from("accounting_entries")
      .select("id, entry_date, description, amount, source_type")
      .eq("source_id", id)
      .order("entry_date", { ascending: false });
    if (entriesErr)
      console.error("[controladoria/notas/:id] accounting_entries:", entriesErr);
    entries = (data ?? []) as AccountingEntry[];
  }

  // Itens da nota vêm de `fiscal_invoice_items` (FK fiscal_invoice_id).
  let items: InvoiceItemRow[] = [];
  {
    const { data, error: itemsErr } = await supabase
      .from("fiscal_invoice_items")
      .select("description, quantity, unit, unit_price, total_price, ncm, cfop")
      .eq("fiscal_invoice_id", id)
      .order("sequence", { ascending: true });
    if (itemsErr)
      console.error("[controladoria/notas/:id] fiscal_invoice_items:", itemsErr);
    items = (data ?? []) as InvoiceItemRow[];
  }

  const funrural =
    nota.funrural_value ??
    (nota.direction === "saida" && nota.gross_value
      ? funruralValue(Number(nota.gross_value), funruralClient)
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
        badge={`Controladoria · NF-e ${nota.number ?? id.slice(0, 8)}`}
        title={`Nota ${nota.number ?? "—"}${nota.series ? ` · Série ${nota.series}` : ""}`}
        description="Confira os dados extraídos e os lançamentos contábeis gerados. Aprove ou rejeite para finalizar."
        actions={<NotaReviewActions notaId={id} currentStatus={nota.status} />}
      />

      {/* Status Banner — motivo de rejeição vem de `review_notes`. */}
      {nota.status === "rejected" && nota.review_notes && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Nota rejeitada</p>
            <p className="mt-1 text-sm text-red-700">{nota.review_notes}</p>
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
            <DataItem label="Número" value={nota.number ?? "—"} />
            <DataItem label="Série" value={nota.series ?? "—"} />
            <DataItem label="Emissão" value={formatDate(nota.issued_at)} />
            <DataItem
              label="Direção"
              value={nota.direction === "entrada" ? "Entrada" : nota.direction === "saida" ? "Saída" : "—"}
            />
            <DataItem
              label="Valor total"
              value={
                nota.gross_value == null
                  ? "—"
                  : `R$ ${Number(nota.gross_value).toLocaleString("pt-BR", {
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
                          {item.total_price == null
                            ? "—"
                            : `R$ ${Number(item.total_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
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
              {/* Partida dobrada: cada lançamento tem UM valor (`amount`) que
                  débita uma conta e credita outra. Colapsamos as antigas colunas
                  Débito/Crédito num único "Valor" para refletir o schema real. */}
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Histórico</th>
                    <th>Origem</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="text-sm">{formatDate(e.entry_date)}</td>
                      <td
                        className="max-w-[220px] truncate text-sm text-[var(--text-secondary)]"
                        title={e.description ?? ""}
                      >
                        {e.description ?? "—"}
                      </td>
                      <td className="text-sm text-[var(--text-muted)]">
                        {sourceTypeLabel(e.source_type)}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {e.amount == null || e.amount === 0
                          ? "—"
                          : `R$ ${Number(e.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total dos lançamentos (soma dos amounts) */}
          {entries.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-end gap-4">
              <div className="text-sm text-[var(--text-muted)]">
                Total lançado:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  R${" "}
                  {entries
                    .reduce((s, e) => s + Number(e.amount ?? 0), 0)
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

// Origem do lançamento contábil (accounting_entries.source_type).
function sourceTypeLabel(sourceType: string | null | undefined): string {
  const map: Record<string, string> = {
    sale: "Venda",
    purchase: "Compra",
    invoice: "NF-e",
    fiscal_invoice: "NF-e",
    application: "Aplicação",
    adjustment: "Ajuste",
    manual: "Manual",
  };
  if (!sourceType) return "—";
  return map[sourceType] ?? sourceType;
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
