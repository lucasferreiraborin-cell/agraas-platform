"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
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
      { href: "/",            label: "Painel",               icon: "⊹" },
      { href: "/dashboard",   label: "Dashboard Executivo",  icon: "◎" },
      { href: "/inteligencia",label: "Inteligência",         icon: "◈" },
    ],
  },
  {
    label: "Rebanho",
    items: [
      { href: "/animais",      label: "Animais",      icon: "◉" },
      { href: "/propriedades", label: "Propriedades", icon: "▦" },
      { href: "/lotes",        label: "Lotes",        icon: "⊟" },
      { href: "/scores",       label: "Scores",       icon: "◐" },
      { href: "/market",       label: "Market",       icon: "◇" },
    ],
  },
  {
    label: null,
    items: [
      { href: "/exportacao", label: "Exportação", icon: "✈", highlight: true },
    ],
  },
  {
    label: "Operações",
    items: [
      { href: "/aplicacoes",           label: "Aplicações",           icon: "✚" },
      { href: "/aplicacoes/historico", label: "Histórico Aplicações", icon: "—", sub: true },
      { href: "/pesagens",             label: "Pesagens",             icon: "⚖" },
      { href: "/pesagens/historico",   label: "Histórico Pesagens",   icon: "—", sub: true },
      { href: "/estoque",              label: "Estoque",              icon: "▩" },
      { href: "/estoque/dashboard",    label: "Dashboard Sanitário",  icon: "—", sub: true },
      { href: "/estoque/historico",    label: "Histórico Estoque",    icon: "—", sub: true },
      { href: "/eventos",              label: "Eventos",              icon: "◷" },
      { href: "/movimentacoes",        label: "Movimentações",        icon: "⇄" },
      { href: "/movimentacoes/historico", label: "Histórico Movim.",  icon: "—", sub: true },
      { href: "/operacoes",            label: "Operações",            icon: "◎" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/custos",          label: "Custos",          icon: "◇" },
      { href: "/custos/historico",label: "Histórico Custos",icon: "—", sub: true },
      { href: "/vendas",          label: "Vendas",          icon: "↗" },
      { href: "/abates",          label: "Abates",          icon: "◆" },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { href: "/relatorios",    label: "Relatórios",    icon: "≣" },
      { href: "/alertas",       label: "Alertas",       icon: "◬" },
      { href: "/certificacoes", label: "Certificações", icon: "✓" },
      { href: "/historico",     label: "Histórico",     icon: "◴" },
      { href: "/cadeia",        label: "Cadeia",        icon: "∿" },
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
                    <span className="h-px w-3 rounded-full bg-current opacity-60" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_5px_rgba(110,231,183,0.9)]" />
                    )}
                  </Link>
                );
              }

              /* ── Item de destaque (Exportação) ── */
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
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition duration-200 ${
                        active
                          ? "border-emerald-500/40 bg-emerald-500/22 text-emerald-300 ring-1 ring-emerald-500/20"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/16"
                      }`}
                    >
                      {item.icon}
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
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition duration-200 ${
                      active
                        ? "border-white/22 bg-white/20 text-white ring-1 ring-white/14"
                        : "border-white/8 bg-white/7 text-white/80 group-hover:bg-white/12 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
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
