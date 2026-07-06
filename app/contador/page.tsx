/**
 * Contador — Portfólio.
 *
 * Pivot 19/06/2026: persona Contador é o canal #1 da Agraas (modelo Omie,
 * 27k escritórios contábeis). Esta é a tela-âncora: visão geral dos
 * produtores que o escritório atende, com status de NF-e pendentes,
 * FUNRURAL devido e alertas críticos.
 *
 * Guard atual: aceita admin para demo + contador quando a role existir no
 * banco (sprint paralelo backend está criando a migration). Quando rolar,
 * trocar `requirePersona(CONTADOR_ROUTES)` segue funcionando — a constante
 * já inclui 'contador' e 'admin'.
 *
 * Schema esperado (migration 128, em construção):
 *   partners_accountants(accountant_client_id, producer_client_id, status,
 *                       linked_at)
 *   fiscal_invoices(client_id, status, total_amount, emission_date,
 *                  direction)
 */

import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { requirePersona, CONTADOR_ROUTES } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import {
  Users,
  FileWarning,
  AlertOctagon,
  Landmark,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ProducerRow = {
  client_id: string;
  name: string;
  pending_review: number;
  funrural_due: number;
  alerts: number;
};

export default async function ContadorPage() {
  const ctx = await requirePersona(CONTADOR_ROUTES);
  const db = createSupabaseServiceClient();

  // ── Vínculos contador → produtores ───────────────────────────────────────
  // Tabela ainda em construção (migration 128). Guard defensivo.
  let producerIds: string[] = [];
  try {
    const { data } = await db
      .from("partners_accountants")
      .select("producer_client_id, status")
      .eq("accountant_client_id", ctx.clientId)
      .eq("status", "active");
    producerIds = (data ?? []).map((r) => r.producer_client_id);
  } catch {
    producerIds = [];
  }

  // ── Dados dos produtores ─────────────────────────────────────────────────
  let producers: { id: string; name: string }[] = [];
  if (producerIds.length > 0) {
    const { data } = await db
      .from("clients")
      .select("id, name")
      .in("id", producerIds);
    producers = data ?? [];
  }

  // ── Notas pendentes por produtor ─────────────────────────────────────────
  const pendingByClient = new Map<string, number>();
  const funruralByClient = new Map<string, number>();

  if (producerIds.length > 0) {
    try {
      const { data: pending } = await db
        .from("fiscal_invoices")
        .select("client_id, id")
        .in("client_id", producerIds)
        .eq("status", "pending_review");
      for (const row of pending ?? []) {
        pendingByClient.set(
          row.client_id,
          (pendingByClient.get(row.client_id) ?? 0) + 1,
        );
      }

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartIso = monthStart.toISOString().split("T")[0];

      const { data: outbound } = await db
        .from("fiscal_invoices")
        .select("client_id, total_amount")
        .in("client_id", producerIds)
        .eq("direction", "outbound")
        .gte("emission_date", monthStartIso);
      for (const row of outbound ?? []) {
        funruralByClient.set(
          row.client_id,
          (funruralByClient.get(row.client_id) ?? 0) +
            Number(row.total_amount ?? 0) * 0.015,
        );
      }
    } catch {
      /* schema ainda não existe */
    }
  }

  const rows: ProducerRow[] = producers.map((p) => ({
    client_id: p.id,
    name: p.name,
    pending_review: pendingByClient.get(p.id) ?? 0,
    funrural_due: funruralByClient.get(p.id) ?? 0,
    alerts: pendingByClient.get(p.id) ?? 0,
  }));
  rows.sort((a, b) => b.alerts - a.alerts);

  const totalProdutores = rows.length;
  const totalPendentes = rows.reduce((s, r) => s + r.pending_review, 0);
  const totalCriticos = rows.filter((r) => r.alerts >= 5).length;
  const totalFunrural = rows.reduce((s, r) => s + r.funrural_due, 0);

  return (
    <PersonaShell ctx={ctx}>
      <div className="mx-auto max-w-7xl px-8 py-10">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
            Portfólio · Escritório contábil
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
            {totalProdutores === 0
              ? `Bem-vindo, ${ctx.clientName}`
              : `${totalProdutores} produtor${totalProdutores > 1 ? "es" : ""} sob sua carteira`}
          </h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Operação contábil, fiscal e tributária dos produtores rurais
            vinculados ao seu escritório. Cada conta abaixo já vem com NF-e
            classificadas e FUNRURAL projetado.
          </p>
        </header>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {totalProdutores === 0 ? (
          <div className="rounded-3xl border border-white/8 bg-white/5 p-12 text-center backdrop-blur">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75">
              <Users size={22} />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Nenhum produtor vinculado ainda
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Convide produtores rurais que você atende. Quando aceitarem o
              convite, eles aparecerão aqui com NF-e, plano de contas e
              obrigações já organizados.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <a
                href="mailto:contato@agraas.com.br?subject=Convite%20de%20produtor%20—%20Agraas"
                className="rounded-xl px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: "var(--persona-accent)",
                  color: "var(--persona-accent-text)",
                }}
              >
                Convidar produtor
              </a>
              <Link
                href="/contador/produtores"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/8"
              >
                Ver lista
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── KPIs ──────────────────────────────────────────────── */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
              <DarkKpi label="Produtores ativos" value={totalProdutores} icon={Users} />
              <DarkKpi
                label="NF-e pendentes"
                value={totalPendentes}
                icon={FileWarning}
                accent
              />
              <DarkKpi
                label="Contas críticas (≥5 alertas)"
                value={totalCriticos}
                icon={AlertOctagon}
                accent={totalCriticos > 0}
              />
              <DarkKpi
                label="FUNRURAL devido (mês)"
                value={`R$ ${totalFunrural.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                icon={Landmark}
              />
            </div>

            {/* ── Tabela ────────────────────────────────────────────── */}
            <section className="overflow-hidden rounded-3xl border border-white/8 bg-white/4 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/55">
                    Portfólio
                  </div>
                  <h2 className="mt-0.5 text-lg font-semibold text-white">
                    Produtores vinculados
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/3">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/55">
                      <th className="px-6 py-3">Produtor</th>
                      <th className="px-6 py-3 text-right">NF-e pendentes</th>
                      <th className="px-6 py-3 text-right">FUNRURAL (mês)</th>
                      <th className="px-6 py-3 text-right">Alertas</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.client_id}
                        className="border-t border-white/6 transition hover:bg-white/4"
                      >
                        <td className="px-6 py-3.5 font-medium text-white">
                          {r.name}
                        </td>
                        <td className="px-6 py-3.5 text-right tabular-nums text-white/85">
                          {r.pending_review}
                        </td>
                        <td className="px-6 py-3.5 text-right tabular-nums text-white/85">
                          R$ {r.funrural_due.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {r.alerts === 0 ? (
                            <span className="text-xs text-white/45">Sem alertas</span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--persona-accent) 18%, transparent)",
                                color: "var(--persona-accent)",
                              }}
                            >
                              {r.alerts} alerta{r.alerts > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/contador/produtores/${r.client_id}`}
                            className="inline-flex items-center gap-1 text-sm hover:underline"
                            style={{ color: "var(--persona-accent)" }}
                          >
                            Abrir
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </PersonaShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function DarkKpi({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/55">
        <Icon size={12} />
        {label}
      </div>
      <div
        className="mt-2 text-3xl font-semibold tracking-[-0.02em]"
        style={{
          color: accent ? "var(--persona-accent)" : "#ffffff",
        }}
      >
        {value}
      </div>
    </div>
  );
}
