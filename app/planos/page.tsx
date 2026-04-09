"use client";

import { useState } from "react";
import { Check, Star, Zap, Crown, Leaf } from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 299",
    period: "/mês",
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
    price: "R$ 699",
    period: "/mês",
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
    price: "R$ 1.499",
    period: "/mês",
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
    price: "Sob consulta",
    period: "",
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

export default function PlanosPage() {
  const [loading, setLoading] = useState<string | null>(null);

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
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
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
              <div className="mt-2">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                <span className="text-sm text-[var(--text-muted)]">{plan.period}</span>
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
