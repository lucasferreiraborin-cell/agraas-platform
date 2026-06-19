/**
 * Controladoria — Notas fiscais.
 *
 * Lista de NF-e processadas com filtros (status + direção) e botão "Subir
 * NF-e" que abre modal multi-modo (XML, PDF, áudio, CSV).
 *
 * Server Component (lista). Filtros via search params (?status=&direction=).
 * Modal de upload é client component.
 */

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";
import NotaUploadButton from "@/app/components/controladoria/NotaUploadButton";
import { FileText, ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

type FiscalInvoice = {
  id: string;
  invoice_number: string | null;
  series: string | null;
  issuer_name: string | null;
  emission_date: string | null;
  total_amount: number | null;
  direction: string | null;
  status: string | null;
};

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending_review", label: "Pendentes" },
  { value: "reviewed", label: "Revisadas" },
  { value: "rejected", label: "Rejeitadas" },
] as const;

const DIRECTION_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "inbound", label: "Entrada" },
  { value: "outbound", label: "Saída" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
type DirectionFilter = (typeof DIRECTION_FILTERS)[number]["value"];

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; direction?: string }>;
}) {
  const params = await searchParams;
  const status = (
    STATUS_FILTERS.some((f) => f.value === params.status) ? params.status : "all"
  ) as StatusFilter;
  const direction = (
    DIRECTION_FILTERS.some((f) => f.value === params.direction)
      ? params.direction
      : "all"
  ) as DirectionFilter;

  const supabase = await createSupabaseServerClient();

  let notes: FiscalInvoice[] | null = null;
  try {
    let q = supabase
      .from("fiscal_invoices")
      .select(
        "id, invoice_number, series, issuer_name, emission_date, total_amount, direction, status",
      )
      .order("emission_date", { ascending: false })
      .limit(200);

    if (status !== "all") q = q.eq("status", status);
    if (direction !== "all") q = q.eq("direction", direction);

    const { data } = await q;
    notes = (data ?? []) as FiscalInvoice[];
  } catch {
    notes = null;
  }

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Controladoria · Notas"
        title="Notas fiscais"
        description="NF-e importadas, classificadas e prontas para revisão humana. Use o botão Subir NF-e para enviar XML, PDF, ditado ou planilha CSV."
        actions={<NotaUploadButton />}
      />

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <section className="ag-card p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <FilterGroup
            label="Status"
            current={status}
            options={STATUS_FILTERS}
            paramKey="status"
            direction={direction}
          />
          <FilterGroup
            label="Direção"
            current={direction}
            options={DIRECTION_FILTERS}
            paramKey="direction"
            status={status}
          />
        </div>
      </section>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <section className="ag-card overflow-hidden">
        {notes === null ? (
          <div className="p-10">
            <EmptyState
              icon={FileText}
              title="Aguardando integração fiscal"
              text="O módulo fiscal está sendo provisionado. Quando a tabela de NF-e existir, suas notas aparecerão aqui."
            />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={FileText}
              title="Nenhuma NF-e neste filtro"
              text="Tente outro filtro ou suba uma nota para começar."
            />
          </div>
        ) : (
          <table className="ag-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Emitente</th>
                <th>Emissão</th>
                <th>Direção</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id}>
                  <td className="font-medium">
                    {n.invoice_number ?? "—"}
                    {n.series && (
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        ·{n.series}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[260px] truncate" title={n.issuer_name ?? ""}>
                    {n.issuer_name ?? "—"}
                  </td>
                  <td>{formatDate(n.emission_date)}</td>
                  <td>
                    <DirectionBadge direction={n.direction} />
                  </td>
                  <td className="text-right tabular-nums">
                    {n.total_amount == null
                      ? "—"
                      : `R$ ${Number(n.total_amount).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </td>
                  <td>
                    <StatusBadge status={n.status} />
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/controladoria/notas/${n.id}`}
                      className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                    >
                      Revisar
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    pending_review: {
      label: "Pendente",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    reviewed: {
      label: "Revisada",
      cls: "bg-[var(--primary-soft)] text-[var(--primary-hover)] border-[var(--primary)]/20",
    },
    rejected: {
      label: "Rejeitada",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
  };
  const cfg = map[status] ?? {
    label: status,
    cls: "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: string | null }) {
  if (direction === "inbound") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowDownToLine size={13} className="text-[var(--primary)]" />
        Entrada
      </span>
    );
  }
  if (direction === "outbound") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowUpFromLine size={13} className="text-amber-600" />
        Saída
      </span>
    );
  }
  return <span className="text-xs text-[var(--text-muted)]">—</span>;
}

function FilterGroup<T extends string>({
  label,
  current,
  options,
  paramKey,
  status,
  direction,
}: {
  label: string;
  current: T;
  options: readonly { value: T; label: string }[];
  paramKey: "status" | "direction";
  status?: StatusFilter;
  direction?: DirectionFilter;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const sp = new URLSearchParams();
          if (paramKey === "status") {
            if (opt.value !== "all") sp.set("status", opt.value);
            if (direction && direction !== "all") sp.set("direction", direction);
          } else {
            if (opt.value !== "all") sp.set("direction", opt.value);
            if (status && status !== "all") sp.set("status", status);
          }
          const href = `/controladoria/notas${sp.toString() ? `?${sp.toString()}` : ""}`;
          const active = current === opt.value;
          return (
            <Link
              key={opt.value}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                  : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)]/40"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
