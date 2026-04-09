import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreditCard, Shield, ArrowUpRight } from "lucide-react";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter", pro: "Pro", enterprise: "Enterprise", pilot: "Pilot",
};
const PLAN_PRICE: Record<string, string> = {
  starter: "R$ 299/mês", pro: "R$ 699/mês", enterprise: "R$ 1.499/mês", pilot: "Isento",
};
const PLAN_CLS: Record<string, string> = {
  starter: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pro: "bg-blue-50 text-blue-700 border-blue-200",
  enterprise: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pilot: "bg-amber-50 text-amber-700 border-amber-200",
};

type SubEvent = {
  id: string;
  event_type: string;
  plan: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
};

const EVENT_LABEL: Record<string, string> = {
  created: "Assinatura criada",
  updated: "Plano atualizado",
  cancelled: "Assinatura cancelada",
  payment_success: "Pagamento confirmado",
  payment_failed: "Pagamento falhou",
};

export default async function AssinaturaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: client } = user
    ? await supabase.from("clients").select("id, name, plan, plan_started_at, billing_exempt, billing_email, stripe_customer_id").eq("auth_user_id", user.id).single()
    : { data: null };

  const { data: eventsData } = client
    ? await supabase.from("subscription_events").select("id, event_type, plan, amount, currency, created_at").eq("client_id", client.id).order("created_at", { ascending: false }).limit(20)
    : { data: null };

  const events = (eventsData ?? []) as SubEvent[];
  const plan = client?.plan ?? "starter";
  const exempt = client?.billing_exempt ?? false;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <CreditCard size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Assinatura</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{client?.name ?? "—"}</p>
            </div>
          </div>
          {!exempt && (
            <Link href="/planos" className="ag-button-primary flex items-center gap-2">
              <ArrowUpRight size={16} /> Upgrade
            </Link>
          )}
        </div>
      </section>

      {/* Plano atual */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="ag-kpi-card p-5">
          <p className="ag-kpi-label">Plano atual</p>
          <div className="mt-2">
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${PLAN_CLS[plan] ?? PLAN_CLS.starter}`}>
              {PLAN_LABEL[plan] ?? plan}
            </span>
          </div>
        </div>
        <div className="ag-kpi-card p-5">
          <p className="ag-kpi-label">Valor</p>
          <p className="ag-kpi-value text-xl">{PLAN_PRICE[plan] ?? "—"}</p>
        </div>
        <div className="ag-kpi-card p-5">
          <p className="ag-kpi-label">Desde</p>
          <p className="ag-kpi-value text-xl">
            {client?.plan_started_at ? new Date(client.plan_started_at).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
      </section>

      {exempt && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Shield size={20} className="shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Plano Pilot — isento de cobrança</p>
            <p className="text-xs text-amber-600">Sua operação está em período de avaliação sem custo.</p>
          </div>
        </div>
      )}

      {/* Histórico */}
      <section className="ag-card p-8">
        <h2 className="ag-section-title mb-4">Histórico de pagamentos</h2>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhum evento de pagamento registrado.</p>
        ) : (
          <div className="space-y-3">
            {events.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{EVENT_LABEL[e.event_type] ?? e.event_type}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {e.plan ? ` · ${PLAN_LABEL[e.plan] ?? e.plan}` : ""}
                  </p>
                </div>
                {e.amount != null && (
                  <span className={`text-sm font-bold ${e.event_type === "payment_failed" ? "text-red-500" : "text-emerald-600"}`}>
                    R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
