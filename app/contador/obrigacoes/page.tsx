/**
 * Contador — Calendário fiscal consolidado.
 *
 * Obrigações: NFP-e diária, FUNRURAL mensal, ITR anual, DIRPF, DCTFWeb.
 * Para cada produtor vinculado mostra status (em dia / atrasado).
 *
 * Server Component.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { funruralValue, type FunruralClient } from "@/lib/funrural";
import { requirePersona, CONTADOR_ROUTES } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { CalendarClock, CheckCircle, AlertTriangle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

type ObligationType = {
  id: string;
  label: string;
  frequency: string;
  due: string;
  description: string;
};

// Obrigações fiscais do produtor rural — hard-coded com datas dinâmicas
function buildObligations(now: Date): ObligationType[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const nextMonthDay = (day: number): Date => {
    const dt = new Date(y, m, day);
    if (dt.getDate() < d) return new Date(y, m + 1, day);
    return dt;
  };

  return [
    {
      id: "nfp-e",
      label: "NFP-e — Nota Fiscal do Produtor Eletrônica",
      frequency: "Por operação",
      due: "Emissão obrigatória desde 05/01/2026 (IN RFB 2248/2025)",
      description:
        "Emitir NFP-e a cada venda ou transferência de produto rural. Multa por nota não emitida: 50% do valor.",
    },
    {
      id: "funrural-mes",
      label: "FUNRURAL — GPS rural",
      frequency: "Mensal",
      due: `Vence dia 20/${String(nextMonthDay(20).getMonth() + 1).padStart(2, "0")}/${nextMonthDay(20).getFullYear()}`,
      description:
        "Contribuição previdenciária rural sobre a receita bruta da comercialização (INSS + RAT + SENAR consolidados). Alíquotas LC 224/2025: PF 1,63% · PJ 2,23% · segurado especial 1,50%.",
    },
    {
      id: "dctf-web",
      label: "DCTFWeb — Débitos e Créditos Tributários Federais",
      frequency: "Mensal",
      due: `Vence dia 15/${String(nextMonthDay(15).getMonth() + 1).padStart(2, "0")}/${nextMonthDay(15).getFullYear()}`,
      description:
        "Obrigatória para produtores com folha de pagamento. Declaração de débitos previdenciários.",
    },
    {
      id: "dirpf",
      label: "DIRPF — Imposto de Renda Pessoa Física Rural",
      frequency: "Anual",
      due: `Vence 30/04/${y + (m >= 3 ? 1 : 0)}`,
      description:
        "Livro-caixa obrigatório para produtor rural PF. Receita bruta > R$ 142k ou opção pelo desconto simplificado.",
    },
    {
      id: "lcdpr",
      label: "LCDPR — Livro-Caixa Digital do Produtor Rural",
      frequency: "Mensal",
      due: `Entrega até o último dia útil de cada mês`,
      description:
        "Obrigatório para produtores com receita bruta > R$ 3,6M/ano. Transmissão via e-CAC.",
    },
    {
      id: "itr",
      label: "ITR — Imposto Territorial Rural",
      frequency: "Anual",
      due: `DITR: vence último dia útil de setembro/${y}`,
      description:
        "Declaração do ITR e pagamento em quota única até setembro. Imóveis rurais com qualquer área.",
    },
  ];
}

type ProducerStatus = {
  id: string;
  name: string;
  funrural_due: number;
  pending_nfe: number;
  status: "ok" | "warning" | "overdue";
};

export default async function ContadorObrigacoesPage() {
  const ctx = await requirePersona(CONTADOR_ROUTES);
  const db = createSupabaseServiceClient();

  // Produtores vinculados
  let producerIds: string[] = [];
  try {
    const { data, error } = await db
      .from("partners_accountants")
      .select("producer_client_id")
      .eq("contador_client_id", ctx.clientId)
      .eq("status", "active");
    if (error) console.error("[contador/obrigacoes] partners_accountants:", error.message);
    producerIds = (data ?? []).map((r) => r.producer_client_id);
  } catch {
    producerIds = [];
  }

  // Traz campos fiscais para aplicar a alíquota FUNRURAL por cliente
  // (regimes divergem na carteira — LC 224/2025).
  let producers: (FunruralClient & { id: string; name: string })[] = [];
  if (producerIds.length > 0) {
    const { data } = await db
      .from("clients")
      .select("id, name, funrural_rate, tax_regime")
      .in("id", producerIds);
    producers = data ?? [];
  }

  const funruralClientById = new Map<string, FunruralClient>(
    producers.map((p) => [
      p.id,
      { funrural_rate: p.funrural_rate, tax_regime: p.tax_regime },
    ]),
  );

  // Por produtor: FUNRURAL mês + NF-e pendentes
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().split("T")[0];

  const statsByProducer = new Map<string, { funrural: number; pending: number }>();

  if (producerIds.length > 0) {
    try {
      const { data: pendingInv, error: pendErr } = await db
        .from("fiscal_invoices")
        .select("client_id")
        .in("client_id", producerIds)
        .eq("status", "pending_review");
      if (pendErr) console.error("[contador/obrigacoes] fiscal_invoices pending:", pendErr.message);
      for (const r of pendingInv ?? []) {
        const prev = statsByProducer.get(r.client_id) ?? { funrural: 0, pending: 0 };
        statsByProducer.set(r.client_id, { ...prev, pending: prev.pending + 1 });
      }

      // FUNRURAL incide sobre a receita da comercialização → notas de 'saida'.
      const { data: outbound, error: outErr } = await db
        .from("fiscal_invoices")
        .select("client_id, gross_value")
        .in("client_id", producerIds)
        .eq("direction", "saida")
        .gte("issued_at", monthStartIso);
      if (outErr) console.error("[contador/obrigacoes] fiscal_invoices saida:", outErr.message);
      for (const r of outbound ?? []) {
        const prev = statsByProducer.get(r.client_id) ?? { funrural: 0, pending: 0 };
        statsByProducer.set(r.client_id, {
          ...prev,
          funrural:
            prev.funrural +
            funruralValue(
              Number(r.gross_value ?? 0),
              funruralClientById.get(r.client_id) ?? null,
            ),
        });
      }
    } catch {
      /* schema ainda não existe */
    }
  }

  const producerRows: ProducerStatus[] = producers.map((p) => {
    const stats = statsByProducer.get(p.id) ?? { funrural: 0, pending: 0 };
    return {
      id: p.id,
      name: p.name,
      funrural_due: stats.funrural,
      pending_nfe: stats.pending,
      status:
        stats.pending >= 5
          ? "overdue"
          : stats.pending > 0
          ? "warning"
          : "ok",
    };
  });

  const obligations = buildObligations(new Date());

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PersonaShell ctx={ctx}>
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* Header */}
        <header className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
            Calendário fiscal · Escritório contábil
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Obrigações fiscais</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Calendário tributário consolidado para todos os produtores rurais da sua carteira.
            NFP-e, FUNRURAL, DIRPF, ITR e LCDPR.
          </p>
        </header>

        {/* Obrigações gerais */}
        <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur mb-8 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/8">
            <CalendarClock size={16} className="text-white/55" />
            <h2 className="text-lg font-semibold text-white">Calendário geral</h2>
          </div>
          <div className="divide-y divide-white/6">
            {obligations.map((ob) => (
              <div key={ob.id} className="flex items-start gap-4 px-6 py-4">
                <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Clock size={14} className="text-white/65" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-white">{ob.label}</p>
                    <span className="shrink-0 rounded-full border border-white/12 bg-white/6 px-2.5 py-0.5 text-[11px] text-white/65">
                      {ob.frequency}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/55">{ob.description}</p>
                  <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--persona-accent)" }}>
                    {ob.due}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Status por produtor */}
        {producerRows.length > 0 && (
          <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8">
              <h2 className="text-lg font-semibold text-white">Status por produtor</h2>
              <p className="text-sm text-white/55 mt-0.5">
                Baseado em NF-e pendentes de revisão e FUNRURAL do mês corrente.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/3">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/55">
                    <th className="px-6 py-3">Produtor</th>
                    <th className="px-6 py-3 text-right">NF-e pendentes</th>
                    <th className="px-6 py-3 text-right">FUNRURAL (mês)</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {producerRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-white/6 hover:bg-white/3"
                    >
                      <td className="px-6 py-3.5 font-medium text-white">{r.name}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-white/85">
                        {r.pending_nfe}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-white/85">
                        {r.funrural_due > 0 ? fmt(r.funrural_due) : "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {producerRows.length === 0 && (
          <div className="rounded-3xl border border-white/8 bg-white/4 p-10 text-center">
            <CalendarClock size={24} className="mx-auto mb-3 text-white/35" />
            <p className="text-white/65">
              Nenhum produtor vinculado. Convide produtores rurais para ver o status das obrigações.
            </p>
          </div>
        )}
      </div>
    </PersonaShell>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "ok" | "warning" | "overdue" }) {
  const map = {
    ok: {
      label: "Em dia",
      icon: CheckCircle,
      color: "#10B981",
    },
    warning: {
      label: "Pendências",
      icon: AlertTriangle,
      color: "#F59E0B",
    },
    overdue: {
      label: "Atrasado",
      icon: AlertTriangle,
      color: "#EF4444",
    },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: cfg.color }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}
