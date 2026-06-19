"use client";

/**
 * Sidebar contextual do módulo Controladoria (Contábil + Fiscal + Estoque).
 *
 * Vive DENTRO da área autenticada do produtor — convive com o sidebar global
 * /painel à esquerda. Renderiza como sub-rail (rail secundário) na coluna
 * principal, semelhante ao padrão "section nav" do Linear/Notion.
 *
 * Itens: Painel · Notas · Contas · Cash flow · Estoque · Voltar ao painel.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  TrendingUp,
  Boxes,
  ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  divider?: true;
};

const NAV: Item[] = [
  { href: "/controladoria",            label: "Painel",     icon: LayoutDashboard },
  { href: "/controladoria/notas",      label: "Notas",      icon: Receipt },
  { href: "/controladoria/contas",     label: "Contas",     icon: BookOpen },
  { href: "/controladoria/cash-flow",  label: "Cash flow",  icon: TrendingUp },
  { href: "/controladoria/estoque",    label: "Estoque",    icon: Boxes },
  { href: "/painel",                   label: "Voltar ao painel", icon: ArrowLeft, divider: true },
];

export default function ControladoriaSidebarNav() {
  const pathname = usePathname();

  function isActive(item: Item) {
    if (item.href === "/painel") return false;
    if (item.href === "/controladoria") return pathname === "/controladoria";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <nav className="space-y-1">
      <div className="px-3 pb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Controladoria
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Contábil · Fiscal · Estoque
        </p>
      </div>

      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        const isBack = item.href === "/painel";

        return (
          <div key={item.href}>
            {item.divider && (
              <div className="my-3 border-t border-[var(--border)]" />
            )}
            <Link
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                  : isBack
                  ? "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-secondary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  active
                    ? "border-transparent bg-[var(--primary)]/14 text-[var(--primary-hover)]"
                    : "border-[var(--border)] bg-white text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                }`}
              >
                <Icon size={14} />
              </span>
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
