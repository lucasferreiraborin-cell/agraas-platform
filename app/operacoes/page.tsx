import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Syringe, Scale, FlaskConical, Package, Layers, ShoppingCart } from "lucide-react";

export default async function OperacoesPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const today = now.toISOString().split("T")[0];

  const [
    { count: aplicacoes30d },
    { count: pesagens30d },
    { count: carenciaAtiva },
    { count: lotesAtivos },
  ] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", d30),
    supabase.from("weights").select("id", { count: "exact", head: true }).gte("weighing_date", d30),
    supabase.from("applications").select("id", { count: "exact", head: true }).gt("withdrawal_date", today),
    supabase.from("lots").select("id", { count: "exact", head: true }).neq("status", "encerrado"),
  ]);

  const kpis = [
    { label: "Aplicações (30d)", value: aplicacoes30d ?? 0, sub: "medicamentos e vacinas", color: "text-purple-600" },
    { label: "Pesagens (30d)",   value: pesagens30d ?? 0,   sub: "registros de peso",     color: "text-blue-600" },
    { label: "Em carência",      value: carenciaAtiva ?? 0, sub: "animais com restrição",  color: "text-red-600" },
    { label: "Lotes ativos",     value: lotesAtivos ?? 0,   sub: "em andamento",           color: "text-emerald-600" },
  ];

  const modules = [
    { href: "/aplicacoes",    label: "Aplicações",      sub: "Medicamentos e vacinas",   icon: Syringe,     badge: aplicacoes30d ?? 0, badgeSub: "nos últimos 30d" },
    { href: "/pesagens",      label: "Pesagens",         sub: "Controle de peso",         icon: Scale,       badge: pesagens30d ?? 0,   badgeSub: "nos últimos 30d" },
    { href: "/estoque",       label: "Estoque",          sub: "Produtos e validades",     icon: Package,     badge: null, badgeSub: "" },
    { href: "/lotes",         label: "Lotes",            sub: "Manejo de grupos",         icon: Layers,      badge: lotesAtivos ?? 0,   badgeSub: "lotes ativos" },
    { href: "/vendas",        label: "Vendas",           sub: "Registro de transações",   icon: ShoppingCart,badge: null, badgeSub: "" },
    { href: "/laboratorio",   label: "Laboratório",      sub: "Exames e resultados",      icon: FlaskConical,badge: null, badgeSub: "" },
  ];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <h1 className="ag-page-title">Operações</h1>
        <p className="ag-section-subtitle mt-1">Visão geral das operações do rebanho</p>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="ag-kpi-card">
              <p className="ag-kpi-label">{k.label}</p>
              <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
              <p className="sub">{k.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ag-card-strong p-8 space-y-4">
        <h2 className="ag-section-title">Módulos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {modules.map(m => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)] transition space-y-2">
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] group-hover:bg-white transition">
                    <Icon size={18} className="text-[var(--primary)]" />
                  </div>
                  {m.badge !== null && m.badge > 0 && (
                    <span className="opacity-0 group-hover:opacity-100 transition rounded-full bg-[var(--primary)] text-white text-[10px] font-bold px-2 py-0.5">
                      {m.badge} {m.badgeSub}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">{m.label}</p>
                <p className="text-sm text-[var(--text-muted)]">{m.sub}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}