import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import {
  Syringe, Scale, Package, Layers, ShoppingCart,
  Calendar, ArrowLeftRight, Box, BarChart3, ChevronRight,
} from "lucide-react";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { PageHeader } from "@/app/components/ui/PageHeader";

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
    { count: eventos30d },
  ] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", d30),
    supabase.from("weights").select("id", { count: "exact", head: true }).gte("weighing_date", d30),
    supabase.from("applications").select("id", { count: "exact", head: true }).gt("withdrawal_date", today),
    supabase.from("lots").select("id", { count: "exact", head: true }).neq("status", "encerrado"),
    supabase.from("events").select("id", { count: "exact", head: true }).gte("event_date", d30),
  ]);

  const kpis = [
    { label: "Aplicações (30d)", value: aplicacoes30d ?? 0, sub: "medicamentos e vacinas", href: null as string | null },
    { label: "Pesagens (30d)",   value: pesagens30d ?? 0,   sub: "registros de peso",      href: null },
    { label: "Em carência",      value: carenciaAtiva ?? 0, sub: "animais com restrição",  href: null },
    { label: "Lotes ativos",     value: lotesAtivos ?? 0,   sub: "em andamento",           href: "/lotes" },
    { label: "Eventos (30d)",    value: eventos30d ?? 0,    sub: "registros operacionais", href: "/eventos" },
  ];

  const modules = [
    { href: "/aplicacoes",    label: "Aplicações",      sub: "Medicamentos e vacinas",   icon: Syringe,        badge: aplicacoes30d ?? 0, badgeSub: "nos últimos 30d" },
    { href: "/pesagens",      label: "Pesagens",         sub: "Controle de peso",         icon: Scale,          badge: pesagens30d ?? 0,   badgeSub: "nos últimos 30d" },
    { href: "/eventos",       label: "Eventos",          sub: "Timeline operacional",     icon: Calendar,       badge: eventos30d ?? 0,    badgeSub: "nos últimos 30d" },
    { href: "/movimentacoes", label: "Movimentações",    sub: "Transferências e saídas",  icon: ArrowLeftRight, badge: null,               badgeSub: "" },
    { href: "/insumos",       label: "Insumos",          sub: "Estoque e financeiro",     icon: Box,            badge: null,               badgeSub: "" },
    { href: "/producao",      label: "Produção",         sub: "Indicadores zootécnicos",  icon: BarChart3,      badge: null,               badgeSub: "" },
    { href: "/estoque",       label: "Estoque",          sub: "Produtos e validades",     icon: Package,        badge: null,               badgeSub: "" },
    { href: "/lotes",         label: "Lotes",            sub: "Manejo de grupos",         icon: Layers,         badge: lotesAtivos ?? 0,   badgeSub: "lotes ativos" },
    { href: "/vendas",        label: "Vendas",           sub: "Registro de transações",   icon: ShoppingCart,   badge: null,               badgeSub: "" },
  ];

  return (
    <main className="space-y-8">
      <PageHeader
        title="Operações"
        description="Visão geral das operações do rebanho"
      />

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(k => {
          const card = <KpiCard label={k.label} value={k.value} sub={k.sub} />;
          return k.href ? (
            <Link key={k.label} href={k.href} className="block transition hover:-translate-y-0.5 hover:shadow-md">
              {card}
            </Link>
          ) : (
            <div key={k.label}>{card}</div>
          );
        })}
      </section>

      <section className="ag-card-strong p-8 space-y-4">
        <h2 className="ag-section-title">Módulos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {modules.map(m => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--primary-hover)] hover:bg-[var(--primary-soft)] hover:shadow-lg hover:-translate-y-0.5 transition-all space-y-2">
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
                <ChevronRight
                  size={16}
                  className="absolute bottom-4 right-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}