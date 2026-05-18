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

const menuGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/painel",       label: "Painel",       icon: Home },
      { href: "/inteligencia", label: "Inteligência", icon: Brain },
    ],
  },
  {
    label: "Rebanho",
    items: [
      { href: "/animais",                 label: "Animais",                 icon: Beef },
      { href: "/lotes",                   label: "Lotes",                   icon: Package },
      { href: "/propriedades",            label: "Propriedades",            icon: MapPin },
      { href: "/movimentacoes",           label: "Movimentações",           icon: ArrowLeftRight },
      { href: "/movimentacoes/historico", label: "Histórico Movimentações", icon: ArrowLeftRight, sub: true },
    ],
  },
  {
    label: "Reprodução",
    items: [
      { href: "/reprodutivo", label: "Reprodutivo", icon: HeartPulse },
    ],
  },
  {
    label: "Sanidade",
    items: [
      { href: "/aplicacoes",           label: "Aplicações",           icon: Syringe },
      { href: "/aplicacoes/historico", label: "Histórico Aplicações", icon: Syringe,    sub: true },
      { href: "/estoque/dashboard",    label: "Dashboard Sanitário",  icon: Warehouse },
      { href: "/calendario-sanitario", label: "Calendário Sanitário", icon: Activity },
      { href: "/estoque",              label: "Estoque",              icon: Warehouse },
      { href: "/estoque/historico",    label: "Histórico Estoque",    icon: Warehouse,  sub: true },
    ],
  },
  {
    label: "Performance",
    items: [
      { href: "/pesagens",           label: "Pesagens",           icon: Scale },
      { href: "/pesagens/historico", label: "Histórico Pesagens", icon: Scale, sub: true },
      { href: "/metas",              label: "Metas de Peso",      icon: TrendingUp },
      { href: "/scores",             label: "Scores",             icon: BarChart2 },
      { href: "/eventos",            label: "Eventos",            icon: Activity },
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
    label: "Financeiro",
    items: [
      { href: "/financeiro",       label: "Painel Financeiro", icon: DollarSign, highlight: true },
      { href: "/custos",           label: "Custos",            icon: DollarSign },
      { href: "/custos/historico", label: "Histórico Custos",  icon: DollarSign,      sub: true },
      { href: "/custo-producao",   label: "Custo de Produção", icon: DollarSign,      sub: true },
      { href: "/vendas",           label: "Vendas",            icon: ArrowUpRight },
      { href: "/abates",           label: "Abates",            icon: Scissors },
      { href: "/fiscal",           label: "Fiscal",            icon: Receipt },
      { href: "/fiscal/relatorio", label: "Relatório Fiscal",  icon: FileSpreadsheet, sub: true },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/compradores",  label: "Compradores",  icon: ArrowUpRight },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/produtos",     label: "Produtos",     icon: Package },
      { href: "/insumos",      label: "Insumos",      icon: Boxes },
      { href: "/operacoes",    label: "Operações",    icon: LayoutGrid },
      { href: "/marketplace",  label: "Marketplace",  icon: ShoppingBag, highlight: true },
    ],
  },
  // ⏸️ Pecuária Expandida pausada (decisão 17/05 — foco 100% bovinos).
  // Rotas /ovinos, /caprinos, /aves redirecionam via proxy.ts. Não
  // remover daqui — reativar comentando este bloco para voltar.
  // {
  //   label: "Pecuária Expandida",
  //   items: [
  //     { href: "/ovinos",           label: "Ovinos & Caprinos", icon: Rabbit   },
  //     { href: "/ovinos/dashboard", label: "Dashboard Ovinos",  icon: BarChart2, sub: true },
  //     { href: "/aves",             label: "Aves & Frangos",    icon: Bird      },
  //     { href: "/aves/dashboard",   label: "Dashboard Aves",    icon: BarChart2, sub: true },
  //   ],
  // },
  // ⏸️ Agricultura pausada (decisão 17/05 — foco 100% bovinos).
  // Rota /agricultura redireciona via proxy.ts. Não remover daqui —
  // reativar comentando este bloco para voltar.
  // {
  //   label: "Agricultura",
  //   items: [
  //     { href: "/agricultura",          label: "Dashboard",       icon: Wheat },
  //     { href: "/agricultura/fazendas", label: "Fazendas",        icon: Wheat,     sub: true },
  //     { href: "/agricultura/talhoes",  label: "Talhões",         icon: Layers,    sub: true },
  //     { href: "/agricultura/armazens", label: "Armazéns",        icon: Warehouse, sub: true },
  //     { href: "/agricultura/embarques",label: "Embarques",       icon: Ship,      sub: true },
  //     { href: "/agricultura/insumos",  label: "Insumos",         icon: Boxes,     sub: true },
  //     { href: "/agricultura/fiscal",   label: "Fiscal Agrícola", icon: Receipt,   sub: true },
  //   ],
  // },
  {
    label: "Ferramentas",
    items: [
      { href: "/migrar-dados",             label: "Importar animais", icon: FileUp },
      { href: "/planos",                   label: "Planos",           icon: BadgeCheck },
      { href: "/configuracoes/assinatura", label: "Assinatura",       icon: BadgeCheck, sub: true },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { href: "/market",        label: "Market",        icon: TrendingUp },
      { href: "/producao",      label: "Produção",      icon: BarChart3 },
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
