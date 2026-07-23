/**
 * Controladoria — Estoque.
 *
 * Lista stock_batches com produto, quantidade, custo unitário e validade.
 * Destaque FEFO: lotes vencendo em até 30 dias.
 * Movimentações últimas 30d (stock_movements).
 *
 * Server Component. Defensivo: tabelas podem não existir.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { EmptyState } from "@/app/components/ui/EmptyState";
import Link from "next/link";
import { Boxes, AlertTriangle, Package, ArrowRightLeft } from "lucide-react";

export const dynamic = "force-dynamic";

// Nome/unidade do produto vêm de join em `products` via `product_id`.
type ProductJoin = { name: string | null; unit: string | null };

// stock_batches NÃO tem product_name/unit/status; validade é `expiration_date`.
type StockBatch = {
  id: string;
  batch_number: string | null;
  quantity: number | null;
  unit_cost: number | null;
  expiration_date: string | null;
  document_source: string | null;
  created_at: string | null;
  products: ProductJoin | ProductJoin[] | null;
};

// stock_movements: data é `created_at`; sem product_name/unit/notes.
// Origem do movimento em `reference_table`; produto via join.
type StockMovement = {
  id: string;
  created_at: string | null;
  movement_type: string | null;
  quantity: number | null;
  reference_table: string | null;
  products: ProductJoin | ProductJoin[] | null;
};

// Normaliza join to-one do Supabase (pode vir objeto, array ou null).
function firstJoin<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "movimentos" ? "movimentos" : "lotes";

  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const todayIso = today.toISOString().split("T")[0];
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30Iso = in30Days.toISOString().split("T")[0];

  // Lotes de estoque. Produto (nome/unidade) via join em `products`.
  let batches: StockBatch[] = [];
  {
    const { data, error } = await supabase
      .from("stock_batches")
      .select(
        "id, batch_number, quantity, unit_cost, expiration_date, document_source, created_at, products(name, unit)",
      )
      .order("expiration_date", { ascending: true })
      .limit(200);
    if (error) console.error("[controladoria/estoque] stock_batches:", error);
    batches = (data ?? []) as StockBatch[];
  }

  // KPIs — validade = `expiration_date`.
  const totalLotes = batches.length;
  const vencendoEm30 = batches.filter(
    (b) =>
      b.expiration_date &&
      b.expiration_date >= todayIso &&
      b.expiration_date <= in30Iso,
  ).length;
  const vencidos = batches.filter(
    (b) => b.expiration_date && b.expiration_date < todayIso,
  ).length;
  const valorTotalEstoque = batches.reduce(
    (s, b) => s + Number(b.quantity ?? 0) * Number(b.unit_cost ?? 0),
    0,
  );

  // Movimentações últimas 30d — data = `created_at`, produto via join.
  let movements: StockMovement[] = [];
  if (tab === "movimentos") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const isoCutoff = cutoff.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("stock_movements")
      .select(
        "id, created_at, movement_type, quantity, reference_table, products(name, unit)",
      )
      .gte("created_at", isoCutoff)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) console.error("[controladoria/estoque] stock_movements:", error);
    movements = (data ?? []) as StockMovement[];
  }

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Controladoria · Estoque"
        title="Estoque de insumos"
        description="Controle de lotes com custo unitário, validade FEFO e movimentações automáticas via NF-e."
      />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Lotes em estoque"
          value={totalLotes === 0 ? "—" : totalLotes.toLocaleString("pt-BR")}
          sub={totalLotes === 0 ? "Nenhum lote cadastrado" : "Total ativo"}
          icon={Package}
        />
        <KpiCard
          label="Valor total"
          value={valorTotalEstoque === 0 ? "—" : fmt(valorTotalEstoque)}
          sub="Qtd × custo unitário"
          icon={Boxes}
        />
        <KpiCard
          label="Vencendo em 30 dias"
          value={vencendoEm30 === 0 ? "—" : vencendoEm30.toLocaleString("pt-BR")}
          sub={vencendoEm30 > 0 ? "Atenção — priorizar consumo (FEFO)" : "Nenhum lote crítico"}
          icon={AlertTriangle}
          tone={vencendoEm30 > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Lotes vencidos"
          value={vencidos === 0 ? "—" : vencidos.toLocaleString("pt-BR")}
          sub={vencidos > 0 ? "Requer descarte ou regularização" : "Nenhum vencido"}
          icon={AlertTriangle}
          tone={vencidos > 0 ? "danger" : "default"}
        />
      </section>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-[var(--border)]">
        {[
          { value: "lotes", label: "Lotes" },
          { value: "movimentos", label: "Movimentações" },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/controladoria/estoque${t.value !== "lotes" ? `?tab=${t.value}` : ""}`}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.value
                ? "border-b-2 border-[var(--primary)] text-[var(--primary-hover)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "lotes" ? (
        <section className="ag-card overflow-hidden">
          {batches.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Boxes}
                title="Estoque vazio"
                text="Lotes entram automaticamente quando uma NF-e de entrada é aprovada. Você também pode cadastrar manualmente."
              />
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">Custo unit.</th>
                  <th>Validade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const isExpiring =
                    b.expiration_date &&
                    b.expiration_date >= todayIso &&
                    b.expiration_date <= in30Iso;
                  const isExpired = b.expiration_date && b.expiration_date < todayIso;
                  const prod = firstJoin(b.products);
                  const batchStatus = isExpired
                    ? "expired"
                    : isExpiring
                    ? "expiring"
                    : "available";
                  return (
                    <tr
                      key={b.id}
                      className={
                        isExpired
                          ? "bg-red-50/60"
                          : isExpiring
                          ? "bg-amber-50/50"
                          : ""
                      }
                    >
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {(isExpired || isExpiring) && (
                            <AlertTriangle
                              size={13}
                              className={
                                isExpired ? "text-red-500" : "text-amber-500"
                              }
                            />
                          )}
                          {prod?.name ?? b.document_source ?? "—"}
                        </div>
                      </td>
                      <td className="font-mono text-sm text-[var(--text-muted)]">
                        {b.batch_number ?? "—"}
                      </td>
                      <td className="text-right tabular-nums">
                        {b.quantity?.toLocaleString("pt-BR") ?? "—"}
                        {prod?.unit && (
                          <span className="ml-1 text-xs text-[var(--text-muted)]">
                            {prod.unit}
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {b.unit_cost == null
                          ? "—"
                          : `R$ ${Number(b.unit_cost).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}`}
                      </td>
                      <td>
                        {b.expiration_date ? (
                          <span
                            className={
                              isExpired
                                ? "text-red-700 font-semibold"
                                : isExpiring
                                ? "text-amber-700 font-semibold"
                                : "text-[var(--text-secondary)]"
                            }
                          >
                            {new Date(b.expiration_date).toLocaleDateString("pt-BR")}
                            {isExpired && (
                              <span className="ml-1 text-xs">(vencido)</span>
                            )}
                            {isExpiring && !isExpired && (
                              <span className="ml-1 text-xs">(vence em breve)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td>
                        <BatchStatusChip status={batchStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="ag-card overflow-hidden">
          {movements.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={ArrowRightLeft}
                title="Sem movimentações nos últimos 30 dias"
                text="As movimentações aparecem aqui quando NF-e são processadas ou aplicações sanitárias são registradas."
              />
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Produto</th>
                  <th className="text-right">Qtd</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const prod = firstJoin(m.products);
                  return (
                  <tr key={m.id}>
                    <td className="text-sm">{formatDate(m.created_at)}</td>
                    <td>
                      <MovementTypeChip type={m.movement_type} />
                    </td>
                    <td className="font-medium">{prod?.name ?? "—"}</td>
                    <td className="text-right tabular-nums">
                      {m.quantity?.toLocaleString("pt-BR") ?? "—"}
                      {prod?.unit && (
                        <span className="ml-1 text-xs text-[var(--text-muted)]">
                          {prod.unit}
                        </span>
                      )}
                    </td>
                    <td
                      className="max-w-[200px] truncate text-sm text-[var(--text-secondary)]"
                      title={m.reference_table ?? ""}
                    >
                      {m.reference_table ?? "—"}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
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

function BatchStatusChip({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm text-[var(--text-muted)]">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    available: {
      label: "Disponível",
      cls: "bg-[var(--primary-soft)] text-[var(--primary-hover)] border-[var(--primary)]/20",
    },
    expiring: {
      label: "Vence em breve",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    depleted: {
      label: "Esgotado",
      cls: "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)]",
    },
    expired: {
      label: "Vencido",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
    quarantine: {
      label: "Quarentena",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
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

function MovementTypeChip({ type }: { type: string | null | undefined }) {
  if (!type) return <span className="text-sm text-[var(--text-muted)]">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    entry: {
      label: "Entrada",
      cls: "bg-[var(--primary-soft)] text-[var(--primary-hover)] border-[var(--primary)]/20",
    },
    exit: {
      label: "Saída",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    adjustment: {
      label: "Ajuste",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
    loss: {
      label: "Perda",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
  };
  const cfg = map[type] ?? {
    label: type,
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
