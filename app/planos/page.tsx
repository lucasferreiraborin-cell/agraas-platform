"use client";

import { useState } from "react";
import { Check, Star, Zap, Crown, Leaf } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  monthlyPrice: number | null; // null = sob consulta
  icon: typeof Leaf;
  color: string;
  bg: string;
  border: string;
  popular?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 299,
    icon: Leaf,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    features: [
      "Até 500 animais",
      "Passaporte digital",
      "Score Agraas",
      "Pesagens e aplicações",
      "1 propriedade",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 699,
    icon: Zap,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    popular: true,
    features: [
      "Até 2.000 animais",
      "Tudo do Starter",
      "Calendário sanitário",
      "Metas de peso + GMD",
      "Relatório PDF",
      "Custo de produção",
      "3 propriedades",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 1499,
    icon: Crown,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    features: [
      "Animais ilimitados",
      "Tudo do Pro",
      "Portal PIF (comprador)",
      "Exportação + rastreio",
      "IA preditiva",
      "Fornecedores + NF-e",
      "Propriedades ilimitadas",
      "Suporte prioritário",
    ],
  },
  {
    id: "pilot",
    name: "Pilot",
    monthlyPrice: null,
    icon: Star,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    features: [
      "Tudo do Enterprise",
      "Onboarding dedicado",
      "Importação assistida",
      "Período de avaliação",
      "Sem cobrança inicial",
    ],
  },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PlanosPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"mensal" | "anual">("mensal");

  async function handleSubscribe(planId: string) {
    if (planId === "pilot") {
      window.location.href = "mailto:contato@agraas.com.br?subject=Interesse no plano Pilot";
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/configuracoes/assinatura?success=1`,
          cancelUrl: `${window.location.origin}/planos`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erro ao iniciar pagamento.");
      }
    } catch {
      alert("Erro de conexão.");
    }
    setLoading(null);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8 text-center">
        <div className="ag-badge ag-badge-green mx-auto">Planos Agraas</div>
        <h1 className="ag-page-title mt-4">Escolha o plano ideal para sua operação</h1>
        <p className="mt-3 text-base text-[var(--text-secondary)] max-w-xl mx-auto">
          Rastreabilidade, inteligência e conformidade para fazendas de todos os tamanhos.
        </p>

        {/* Toggle Mensal/Anual */}
        <div className="mt-6 inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1">
          <button
            type="button"
            onClick={() => setBilling("mensal")}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition ${
              billing === "mensal" ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBilling("anual")}
            className={`relative px-5 py-2 text-sm font-semibold rounded-xl transition ${
              billing === "anual" ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            Anual
            <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
              −20%
            </span>
          </button>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isAnual = billing === "anual" && plan.monthlyPrice != null;
          const discounted = plan.monthlyPrice != null ? Math.round(plan.monthlyPrice * 0.8) : null;
          return (
            <div key={plan.id} className={`ag-card relative flex flex-col p-6 ${plan.popular ? "ring-2 ring-[var(--primary)]" : ""}`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-4 py-1 text-xs font-bold text-white">
                  Mais popular
                </span>
              )}
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${plan.bg}`}>
                <Icon size={24} className={plan.color} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
              <div className="mt-2 min-h-[68px]">
                {plan.monthlyPrice == null ? (
                  <>
                    <span className="text-3xl font-bold text-[var(--text-primary)]">Sob consulta</span>
                  </>
                ) : isAnual ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-[var(--text-muted)] line-through">{fmtBRL(plan.monthlyPrice)}</span>
                      <span className="text-3xl font-bold text-[var(--text-primary)]">{fmtBRL(discounted!)}</span>
                      <span className="text-sm text-[var(--text-muted)]">/mês</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-emerald-600">cobrado anualmente · economize 20%</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-[var(--text-primary)]">{fmtBRL(plan.monthlyPrice)}</span>
                    <span className="text-sm text-[var(--text-muted)]">/mês</span>
                  </>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60 ${
                  plan.popular
                    ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                    : "border border-[var(--border)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                {loading === plan.id ? "Redirecionando..." : plan.id === "pilot" ? "Fale conosco" : "Assinar"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
