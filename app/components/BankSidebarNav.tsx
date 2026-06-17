"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, BarChart3 } from "lucide-react";

const BANK_NAV = [
  { href: "/banco",                   label: "Portfólio",            icon: LayoutDashboard },
  { href: "/banco/produtores",        label: "Produtores",           icon: Users },
  { href: "/banco/analytics",         label: "Indicadores",          icon: BarChart3 },
  { href: "/banco/dossies",           label: "Dossiês exportados",   icon: FileText },
];

export default function BankSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      <div className="space-y-1">
        {BANK_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium transition duration-200 ${
                active ? "bg-white/16 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200 ${
                active
                  ? "border-white/22 bg-white/20 text-white ring-1 ring-white/14"
                  : "border-white/8 bg-white/7 text-white/80 group-hover:bg-white/12 group-hover:text-white"
              }`}>
                <Icon size={16} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
