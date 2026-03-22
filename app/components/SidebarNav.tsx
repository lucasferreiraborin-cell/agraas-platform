"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/", label: "Painel", icon: "◉" },
  { href: "/dashboard", label: "Dashboard Executivo", icon: "✳" },
  { href: "/inteligencia", label: "Inteligência", icon: "✺" },
  { href: "/cadeia", label: "Cadeia", icon: "⛓" },
  { href: "/animais", label: "Animais", icon: "◌" },
  { href: "/market", label: "Market", icon: "◈" },
  { href: "/operacoes", label: "Operações", icon: "◎" },
  { href: "/propriedades", label: "Propriedades", icon: "▣" },
  { href: "/estoque", label: "Estoque", icon: "▥" },
  { href: "/estoque/dashboard", label: "Dashboard Sanitário", icon: "▤" },
  { href: "/estoque/historico", label: "Histórico Estoque", icon: "△" },
  { href: "/aplicacoes", label: "Aplicações", icon: "✚" },
  { href: "/aplicacoes/historico", label: "Histórico Aplicações", icon: "◔" },
  { href: "/pesagens", label: "Pesagens", icon: "⚖" },
  { href: "/pesagens/historico", label: "Histórico Pesagens", icon: "◴" },
  { href: "/eventos", label: "Eventos", icon: "☰" },
  { href: "/produtivo", label: "Dashboard Produtivo", icon: "▲" },
  { href: "/movimentacoes", label: "Movimentações", icon: "⇄" },
  { href: "/movimentacoes/historico", label: "Histórico Movimentações", icon: "↺" },
  { href: "/custos", label: "Custos", icon: "$" },
  { href: "/custos/historico", label: "Histórico Custos", icon: "◫" },
  { href: "/relatorios", label: "Relatórios", icon: "☷" },
  { href: "/alertas", label: "Alertas", icon: "!" },
  { href: "/vendas", label: "Vendas", icon: "↔️" },
  { href: "/lotes", label: "Lotes", icon: "▤" },
  { href: "/abates", label: "Abates", icon: "◆" },
  { href: "/scores", label: "Scores", icon: "✦" },
  { href: "/certificacoes", label: "Certificações", icon: "✓" },
  { href: "/historico", label: "Histórico", icon: "◷" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-6">
      {menuItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-2xl px-5 py-3.5 text-[15px] font-medium transition duration-200 ${
              active
                ? "bg-white/18 text-white"
                : "text-white/82 hover:bg-white/12 hover:text-white"
            }`}
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm text-white/90 transition duration-200 ${
                active
                  ? "border-white/20 bg-white/20 ring-1 ring-white/16"
                  : "border-white/8 bg-white/8 ring-1 ring-white/6 group-hover:bg-white/14 group-hover:ring-white/12"
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
    </nav>
  );
}
