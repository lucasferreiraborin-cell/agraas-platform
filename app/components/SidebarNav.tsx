"use client";

import { useState } from "react";
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
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  sub?: true;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// PINNED — visão executiva (sempre visível, 7 itens essenciais)
//
// Curadoria para investidores/parceiros institucionais: cada item resolve uma
// dor direta da tese "Rastreio + Gestão Eficiente". Itens secundários ficam
// dentro do bloco "Avançado" colapsado (default fechado para reduzir
// cognitive load na primeira impressão).
// ─────────────────────────────────────────────────────────────────────────────
const PINNED: NavItem[] = [
  { href: "/painel",       label: "Painel",       icon: Home },
  { href: "/inteligencia", label: "Inteligência", icon: Brain },
  { href: "/animais",      label: "Animais",      icon: Beef },
  { href: "/lotes",        label: "Lotes",        icon: Package },
  { href: "/fiscal",       label: "Fiscal",       icon: Receipt },
  { href: "/financeiro",   label: "Financeiro",   icon: DollarSign },
  { href: "/alertas",      label: "Alertas",      icon: Bell },
];

// ─────────────────────────────────────────────────────────────────────────────
// AVANÇADO — tudo o resto, agrupado, colapsado por default
// Mantém todos os módulos acessíveis sem poluir a primeira impressão.
// ─────────────────────────────────────────────────────────────────────────────
const ADVANCED_GROUPS: NavGroup[] = [
  {
    label: "Rebanho & Sanidade",
    items: [
      { href: "/pesagens",                label: "Pesagens",                icon: Scale },
      { href: "/pesagens/historico",      label: "Histórico Pesagens",      icon: Scale, sub: true },
      { href: "/reprodutivo",             label: "Reprodutivo",             icon: HeartPulse },
      { href: "/aplicacoes",              label: "Aplicações",              icon: Syringe },
      { href: "/aplicacoes/historico",    label: "Histórico Aplicações",    icon: Syringe, sub: true },
      { href: "/calendario-sanitario",    label: "Calendário Sanitário",    icon: Activity },
      { href: "/estoque",                 label: "Estoque",                 icon: Warehouse },
      { href: "/estoque/dashboard",       label: "Dashboard Sanitário",     icon: Warehouse, sub: true },
      { href: "/estoque/historico",       label: "Histórico Estoque",       icon: Warehouse, sub: true },
      { href: "/eventos",                 label: "Eventos",                 icon: Activity },
      { href: "/movimentacoes",           label: "Movimentações",           icon: ArrowLeftRight },
      { href: "/movimentacoes/historico", label: "Histórico Movimentações", icon: ArrowLeftRight, sub: true },
      { href: "/metas",                   label: "Metas de Peso",           icon: TrendingUp },
      { href: "/auditoria",               label: "Auditoria",               icon: ClipboardCheck },
    ],
  },
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
      { href: "/market",       label: "Cotação",      icon: TrendingUp },
    ],
  },
  {
    label: "Gestão & Cadeia",
    items: [
      { href: "/scores",           label: "Scores",             icon: BarChart2 },
      { href: "/custos",           label: "Custos",             icon: DollarSign },
      { href: "/custos/historico", label: "Histórico Custos",   icon: DollarSign, sub: true },
      { href: "/custo-producao",   label: "Custo de Produção",  icon: DollarSign, sub: true },
      { href: "/fiscal/relatorio", label: "Relatório Fiscal",   icon: FileSpreadsheet, sub: true },
      { href: "/producao",         label: "Produção",           icon: BarChart3 },
      { href: "/relatorios",       label: "Relatórios",         icon: FileText },
      { href: "/certificacoes",    label: "Certificações",      icon: BadgeCheck },
      { href: "/cadeia",           label: "Cadeia",             icon: Link2 },
      { href: "/historico",        label: "Histórico",          icon: Clock },
    ],
  },
  {
    label: "Configuração",
    items: [
      { href: "/propriedades", label: "Propriedades",     icon: MapPin },
      { href: "/migrar-dados", label: "Importar animais", icon: FileUp },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Auto-abre "Avançado" se o usuário está numa rota dentro dele.
  // Não usar useEffect para evitar flicker — só renderiza condicionalmente.
  const onAdvancedRoute = ADVANCED_GROUPS.some((g) =>
    g.items.some((item) => isActive(item.href)),
  );
  const showAdvanced = advancedOpen || onAdvancedRoute;

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      {/* ── PINNED (sempre visível, 7 itens) ────────────────────────────── */}
      <div className="space-y-0.5">
        {PINNED.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      {/* ── AVANÇADO (colapsável) ──────────────────────────────────────── */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="group flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45 transition hover:bg-white/5 hover:text-white/70"
        >
          <span>Avançado</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-3 border-l border-white/[0.06] pl-2">
            {ADVANCED_GROUPS.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-white/30">
                    {group.label}
                  </p>
                )}
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} active={isActive(item.href)} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de link — compact para itens dentro do "Avançado"
// ─────────────────────────────────────────────────────────────────────────────
function NavLink({
  item,
  active,
  compact = false,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;

  if (item.sub || compact) {
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[13px] transition duration-150 ${
          active
            ? "bg-white/10 text-white"
            : "text-white/55 hover:bg-white/5 hover:text-white/85"
        }`}
      >
        <Icon size={14} className="shrink-0 opacity-60" />
        <span>{item.label}</span>
        {active && (
          <span className="ml-auto h-1 w-1 rounded-full bg-[var(--sidebar-accent)] shadow-[0_0_5px_rgba(61,165,76,0.9)]" />
        )}
      </Link>
    );
  }

  return (
    <Link
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
}
