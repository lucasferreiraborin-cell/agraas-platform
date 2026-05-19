"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Brain,
  Beef,
  MapPin,
  Package,
  BarChart2,
  TrendingUp,
  Truck,
  Syringe,
  Scale,
  Warehouse,
  Activity,
  ArrowLeftRight,
  LayoutGrid,
  DollarSign,
  ArrowUpRight,
  Scissors,
  FileText,
  Bell,
  BadgeCheck,
  Clock,
  Link2,
  HeartPulse,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Receipt,
  FileSpreadsheet,
  FileUp,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  sub?: true;
  highlight?: true;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

// Sidebar reorganizada 19/05/2026 — 9 grupos → 6 grupos + pinned top.
// Mental model: Visão → Rebanho → Saúde → Vender → Dinheiro → Análise → Plataforma.
// Decisão estratégica (plano unificado Claude/ChatGPT pós-Agrishow):
// reduzir cognitive load, alinhar com fluxo do produtor real (dia, semana, mês, ano).
const menuGroups: NavGroup[] = [
  // ── PINNED: visão executiva sempre acessível ──────────────────────────────
  {
    label: null,
    items: [
      { href: "/painel",       label: "Painel",       icon: Home },
      { href: "/inteligencia", label: "Inteligência", icon: Brain },
      { href: "/alertas",      label: "Alertas",      icon: Bell },
    ],
  },

  // ── 1. REBANHO: o ativo digital (animais, lotes, peso, score) ─────────────
  {
    label: "Rebanho",
    items: [
      { href: "/animais",                 label: "Animais",                 icon: Beef },
      { href: "/lotes",                   label: "Lotes",                   icon: Package },
      { href: "/eventos",                 label: "Eventos",                 icon: Activity },
      { href: "/movimentacoes",           label: "Movimentações",           icon: ArrowLeftRight },
      { href: "/movimentacoes/historico", label: "Histórico Movimentações", icon: ArrowLeftRight, sub: true },
      { href: "/pesagens",                label: "Pesagens",                icon: Scale },
      { href: "/pesagens/historico",      label: "Histórico Pesagens",      icon: Scale, sub: true },
      { href: "/metas",                   label: "Metas de Peso",           icon: TrendingUp },
      { href: "/scores",                  label: "Scores",                  icon: BarChart2 },
    ],
  },

  // ── 2. MANEJO & SANIDADE: saúde, reprodução, estoque sanitário ────────────
  {
    label: "Manejo & Sanidade",
    items: [
      { href: "/reprodutivo",          label: "Reprodutivo",          icon: HeartPulse },
      { href: "/aplicacoes",           label: "Aplicações",           icon: Syringe },
      { href: "/aplicacoes/historico", label: "Histórico Aplicações", icon: Syringe, sub: true },
      { href: "/calendario-sanitario", label: "Calendário Sanitário", icon: Activity },
      { href: "/estoque/dashboard",    label: "Dashboard Sanitário",  icon: Warehouse },
      { href: "/estoque",              label: "Estoque",              icon: Warehouse },
      { href: "/estoque/historico",    label: "Histórico Estoque",    icon: Warehouse, sub: true },
    ],
  },

  // ── 3. COMERCIAL: vender, comprar, parceiros, marketplace ─────────────────
  {
    label: "Comercial",
    items: [
      { href: "/vendas",       label: "Vendas",       icon: ArrowUpRight },
      { href: "/abates",       label: "Abates",       icon: Scissors },
      { href: "/compradores",  label: "Compradores",  icon: ArrowUpRight },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/produtos",     label: "Produtos",     icon: Package },
      { href: "/insumos",      label: "Insumos",      icon: Boxes },
      { href: "/operacoes",    label: "Operações",    icon: LayoutGrid },
      { href: "/marketplace",  label: "Marketplace",  icon: ShoppingBag },
      { href: "/market",       label: "Market",       icon: TrendingUp },
    ],
  },

  // ── 4. FINANCEIRO & FISCAL: dinheiro e compliance tributário ──────────────
  {
    label: "Financeiro & Fiscal",
    items: [
      { href: "/financeiro",       label: "Painel Financeiro", icon: DollarSign },
      { href: "/custos",           label: "Custos",            icon: DollarSign },
      { href: "/custos/historico", label: "Histórico Custos",  icon: DollarSign,      sub: true },
      { href: "/custo-producao",   label: "Custo de Produção", icon: DollarSign,      sub: true },
      { href: "/fiscal",           label: "Fiscal",            icon: Receipt },
      { href: "/fiscal/relatorio", label: "Relatório Fiscal",  icon: FileSpreadsheet, sub: true },
    ],
  },

  // ── 5. INTELIGÊNCIA & AUDITORIA: relatórios, cadeia, certificações ────────
  {
    label: "Inteligência & Auditoria",
    items: [
      { href: "/producao",      label: "Produção",      icon: BarChart3 },
      { href: "/relatorios",    label: "Relatórios",    icon: FileText },
      { href: "/auditoria",     label: "Auditoria",     icon: ClipboardCheck },
      { href: "/certificacoes", label: "Certificações", icon: BadgeCheck },
      { href: "/cadeia",        label: "Cadeia",        icon: Link2 },
      { href: "/historico",     label: "Histórico",     icon: Clock },
    ],
  },

  // ── 6. PLATAFORMA: cadastros estruturais, importação, assinatura ──────────
  {
    label: "Plataforma",
    items: [
      { href: "/propriedades",             label: "Propriedades",     icon: MapPin },
      { href: "/migrar-dados",             label: "Importar animais", icon: FileUp },
      { href: "/planos",                   label: "Planos",           icon: BadgeCheck },
      { href: "/configuracoes/assinatura", label: "Assinatura",       icon: BadgeCheck, sub: true },
    ],
  },

  // ⏸️ Exportação pausada — rotas /exportacao e /tracking via deep-link.
  // ⏸️ Pecuária Expandida (ovinos/caprinos/aves) — rotas redirecionam para /em-breve.
  // ⏸️ Agricultura — rota redireciona para /em-breve. Tabelas e seeds intactos.
];

export default function SidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      {menuGroups.map((group, gi) => (
        <div key={gi}>
          {/* Separador + rótulo de grupo */}
          {gi > 0 && (
            <div className="mx-1 mb-1 mt-4">
              <div className="border-t border-white/[0.07]" />
              {group.label && (
                <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
                  {group.label}
                </p>
              )}
            </div>
          )}

          {/* Itens do grupo */}
          <div className="mt-1 space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              /* ── Sub-item ── */
              if (item.sub) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-xl py-2 pl-[52px] pr-4 text-[13px] transition duration-150 ${
                      active
                        ? "text-white"
                        : "text-white/45 hover:text-white/75"
                    }`}
                  >
                    <Icon size={12} className="shrink-0 opacity-50" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1 w-1 rounded-full bg-[var(--sidebar-accent)] shadow-[0_0_5px_rgba(61,165,76,0.9)]" />
                    )}
                  </Link>
                );
              }

              /* ── Item de destaque (grupo Exportação) ── */
              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium transition duration-200 ${
                      active
                        ? "bg-[var(--sidebar-accent-bg)] text-white ring-1 ring-[var(--sidebar-accent-border)]"
                        : "text-white/75 hover:bg-[rgba(61,165,76,0.12)] hover:text-white"
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200 ${
                        active
                          ? "border-[var(--sidebar-accent-border)] bg-[rgba(61,165,76,0.22)] text-white ring-1 ring-[var(--sidebar-accent-border)]"
                          : "border-[rgba(61,165,76,0.22)] bg-[rgba(61,165,76,0.10)] text-white/85 group-hover:bg-[rgba(61,165,76,0.18)]"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span>{item.label}</span>
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--sidebar-accent)] shadow-[0_0_6px_rgba(61,165,76,0.9)]" />
                    ) : (
                      <span className="ml-auto rounded-full border border-[var(--sidebar-accent-border)] bg-[rgba(61,165,76,0.12)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/80">
                        PIF
                      </span>
                    )}
                  </Link>
                );
              }

              /* ── Item primário padrão ── */
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium transition duration-200 ${
                    active
                      ? "bg-white/16 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200 ${
                      active
                        ? "border-white/22 bg-white/20 text-white ring-1 ring-white/14"
                        : "border-white/8 bg-white/7 text-white/80 group-hover:bg-white/12 group-hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--sidebar-accent)] shadow-[0_0_6px_rgba(61,165,76,0.9)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
