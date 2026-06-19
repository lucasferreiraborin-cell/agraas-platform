"use client";

/**
 * Sidebar da persona Contador — canal #1 da Agraas (modelo Omie, 27k
 * escritórios contábeis). Tom institucional, profissional contábil.
 *
 * Itens iniciais (sprint G1):
 *  - Portfólio  → visão geral dos produtores vinculados
 *  - Produtores → lista detalhada (stub)
 *  - Obrigações → calendário fiscal (stub)
 *  - Sair       → logout
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarClock, LogOut } from "lucide-react";

const CONTADOR_NAV = [
  { href: "/contador",              label: "Portfólio",           icon: LayoutDashboard },
  { href: "/contador/produtores",   label: "Produtores",          icon: Users },
  { href: "/contador/obrigacoes",   label: "Obrigações fiscais",  icon: CalendarClock },
];

export default function ContadorSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      <div className="space-y-1">
        {CONTADOR_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/contador" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium transition duration-200 ${
                active ? "bg-white/16 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
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
            </Link>
          );
        })}
      </div>

      <div className="mt-8 border-t border-white/8 pt-4">
        <Link
          href="/api/auth/logout"
          className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium text-white/55 hover:bg-white/8 hover:text-white transition duration-200"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-white/65 group-hover:bg-white/10 group-hover:text-white">
            <LogOut size={16} />
          </span>
          <span>Sair</span>
        </Link>
      </div>
    </nav>
  );
}
