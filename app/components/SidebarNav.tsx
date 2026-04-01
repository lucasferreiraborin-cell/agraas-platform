"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Brain,
  Beef,
  MapPin,
  Package,
  BarChart2,
  TrendingUp,
  Plane,
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
  Rabbit,
  Bird,
  Wheat,
  Layers,
  Ship,
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

const menuGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/",              label: "Painel",             icon: Home },
      { href: "/dashboard",    label: "Dashboard Executivo", icon: LayoutDashboard },
      { href: "/inteligencia", label: "Inteligência",        icon: Brain },
    ],
  },
  {
    label: "Rebanho",
    items: [
      { href: "/animais",      label: "Animais",      icon: Beef },
      { href: "/propriedades", label: "Propriedades", icon: MapPin },
      { href: "/lotes",        label: "Lotes",        icon: Package },
      { href: "/reprodutivo",  label: "Reprodutivo",  icon: HeartPulse },
      { href: "/scores",       label: "Scores",       icon: BarChart2 },
    ],
  },
  {
    label: "Exportação",
    items: [
      { href: "/exportacao", label: "Central de Exportação", icon: Plane, highlight: true },
      { href: "/tracking",   label: "Rastreio",              icon: Truck, highlight: true },
    ],
  },
  {
    label: "Operações",
    items: [
      { href: "/aplicacoes",              label: "Aplicações",              icon: Syringe },
      { href: "/aplicacoes/historico",    label: "Histórico Aplicações",    icon: Syringe,        sub: true },
      { href: "/pesagens",                label: "Pesagens",                icon: Scale },
      { href: "/pesagens/historico",      label: "Histórico Pesagens",      icon: Scale,          sub: true },
      { href: "/estoque",                 label: "Estoque",                 icon: Warehouse },
      { href: "/estoque/dashboard",       label: "Dashboard Sanitário",     icon: Warehouse,      sub: true },
      { href: "/estoque/historico",       label: "Histórico Estoque",       icon: Warehouse,      sub: true },
      { href: "/producao",                label: "Produção",                icon: BarChart3 },
      { href: "/insumos",                 label: "Insumos",                 icon: Boxes },
      { href: "/eventos",                 label: "Eventos",                 icon: Activity },
      { href: "/movimentacoes",           label: "Movimentações",           icon: ArrowLeftRight },
      { href: "/movimentacoes/historico", label: "Histórico Movimentações", icon: ArrowLeftRight, sub: true },
      { href: "/operacoes",               label: "Operações",               icon: LayoutGrid },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/custos",           label: "Custos",           icon: DollarSign },
      { href: "/custos/historico", label: "Histórico Custos", icon: DollarSign,      sub: true },
      { href: "/vendas",           label: "Vendas",           icon: ArrowUpRight },
      { href: "/abates",           label: "Abates",           icon: Scissors },
      { href: "/fiscal",           label: "Fiscal",           icon: Receipt },
      { href: "/fiscal/relatorio", label: "Relatório Fiscal", icon: FileSpreadsheet, sub: true },
    ],
  },
  {
    label: "Pecuária Expandida",
    items: [
      { href: "/ovinos",           label: "Ovinos & Caprinos", icon: Rabbit   },
      { href: "/ovinos/dashboard", label: "Dashboard Ovinos",  icon: BarChart2, sub: true },
      { href: "/aves",             label: "Aves & Frangos",    icon: Bird      },
      { href: "/aves/dashboard",   label: "Dashboard Aves",    icon: BarChart2, sub: true },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { href: "/migrar-dados", label: "Migrar meus dados", icon: FileUp },
    ],
  },
  {
    label: "Agricultura",
    items: [
      { href: "/agricultura",          label: "Dashboard",  icon: Wheat },
      { href: "/agricultura/fazendas", label: "Fazendas",   icon: Wheat,     sub: true },
      { href: "/agricultura/talhoes",  label: "Talhões",    icon: Layers,    sub: true },
      { href: "/agricultura/armazens", label: "Armazéns",   icon: Warehouse, sub: true },
      { href: "/agricultura/embarques",label: "Embarques",  icon: Ship,      sub: true },
      { href: "/agricultura/insumos",  label: "Insumos",    icon: Boxes,     sub: true },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { href: "/market",        label: "Market",        icon: TrendingUp },
      { href: "/relatorios",    label: "Relatórios",    icon: FileText },
      { href: "/auditoria",     label: "Auditoria",     icon: ClipboardCheck },
      { href: "/alertas",       label: "Alertas",       icon: Bell },
      { href: "/certificacoes", label: "Certificações", icon: BadgeCheck },
      { href: "/historico",     label: "Histórico",     icon: Clock },
      { href: "/cadeia",        label: "Cadeia",        icon: Link2 },
    ],
  },
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
                      <span className="ml-auto h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_5px_rgba(110,231,183,0.9)]" />
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
                        ? "bg-emerald-500/18 text-emerald-300 ring-1 ring-emerald-500/25"
                        : "text-emerald-400/75 hover:bg-emerald-500/10 hover:text-emerald-300"
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200 ${
                        active
                          ? "border-emerald-500/40 bg-emerald-500/22 text-emerald-300 ring-1 ring-emerald-500/20"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/16"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span>{item.label}</span>
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.9)]" />
                    ) : (
                      <span className="ml-auto rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400/70">
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
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.9)]" />
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
