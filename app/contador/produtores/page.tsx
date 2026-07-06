/**
 * Contador — Produtores (catálogo).
 *
 * Lista completa de produtores vinculados ao escritório contábil, com
 * NF-e pendentes, FUNRURAL do mês e link para o dossiê fiscal individual.
 * Mesma fonte de dados do Portfólio (/contador), em formato de catálogo
 * navegável — item de sidebar referenciava esta rota como stub.
 */

import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { requirePersona, CONTADOR_ROUTES } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { Search, Users, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

type ProducerRow = {
  client_id: string;
  name: string;
  email: string | null;
  pending_review: number;
  funrural_due: number;
};

export default async function ContadorProdutoresPage() {
  const ctx = await requirePersona(CONTADOR_ROUTES);
  const db = createSupabaseServiceClient();

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

  let producers: { id: string; name: string; email: string | null }[] = [];
  if (producerIds.length > 0) {
    const { data } = await db
      .from("clients")
      .select("id, name, email")
      .in("id", producerIds);
    producers = data ?? [];
  }

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

  const rows: ProducerRow[] = producers
    .map((p) => ({
      client_id: p.id,
      name: p.name,
      email: p.email,
      pending_review: pendingByClient.get(p.id) ?? 0,
      funrural_due: funruralByClient.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.pending_review - a.pending_review);

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PersonaShell ctx={ctx}>
      <div className="mx-auto max-w-7xl px-8 py-10">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
            Produtores · Catálogo
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Produtores vinculados ao escritório
          </h1>
          <p className="mt-3 max-w-2xl text-white/65">
            {rows.length} produtor{rows.length !== 1 ? "es" : ""} na carteira.
            Cada dossiê traz NF-e classificadas, FUNRURAL projetado e exportação LCDPR.
          </p>
        </header>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-2.5 max-w-md backdrop-blur">
          <Search size={14} className="text-white/45" />
          <input
            placeholder="Buscar produtor (em breve)"
            disabled
            className="flex-1 bg-transparent text-sm text-white/75 outline-none placeholder-white/35"
          />
        </div>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-white/8 bg-white/5 p-12 text-center backdrop-blur">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75">
              <Users size={22} />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Nenhum produtor vinculado ainda
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Convide produtores rurais que você atende. Quando aceitarem o convite,
              eles aparecerão aqui com NF-e, plano de contas e obrigações já organizados.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-white/8 bg-white/4 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/3">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/55">
                    <th className="px-6 py-3">Produtor</th>
                    <th className="px-6 py-3">E-mail</th>
                    <th className="px-6 py-3 text-right">NF-e pendentes</th>
                    <th className="px-6 py-3 text-right">FUNRURAL (mês)</th>
                    <th className="px-6 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.client_id}
                      className="border-t border-white/6 transition hover:bg-white/4"
                    >
                      <td className="px-6 py-3.5 font-medium text-white">{r.name}</td>
                      <td className="px-6 py-3.5 text-white/60">{r.email ?? "—"}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-white/85">
                        {r.pending_review}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-white/85">
                        {r.funrural_due > 0 ? fmt(r.funrural_due) : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/contador/produtores/${r.client_id}`}
                          className="inline-flex items-center gap-1 text-sm hover:underline"
                          style={{ color: "var(--persona-accent)" }}
                        >
                          Dossiê
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PersonaShell>
  );
}
