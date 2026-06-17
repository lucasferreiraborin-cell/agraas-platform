"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Beef, Wheat, Truck, FileText, Store, Users } from "lucide-react";

const BUYER_NAV = [
  { href: "/comprador",                  label: "Visão Geral",          icon: LayoutDashboard, tab: null },
  { href: "/comprador/oportunidades",    label: "Oportunidades",        icon: Store,           tab: null },
  { href: "/comprador/produtores",       label: "Produtores",           icon: Users,           tab: null },
  { href: "/comprador?tab=livestock",    label: "Pecuária Brasileira",  icon: Beef,            tab: "livestock" },
  { href: "/comprador?tab=grains",       label: "Commodities Agrícolas",icon: Wheat,           tab: "grains" },
  { href: "/tracking",                   label: "Rastreio ao Vivo",     icon: Truck,           tab: null },
  { href: "/certificacoes",              label: "Relatórios",           icon: FileText,        tab: null },
];

export default function BuyerSidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  function isActive(item: typeof BUYER_NAV[number]) {
    const itemPath = item.href.split("?")[0];

    // Items inside /comprador — disambiguate by ?tab= query param
    if (itemPath === "/comprador") {
      if (pathname !== "/comprador") return false;
      // Overview = /comprador without tab
      if (item.tab === null) return currentTab === null;
      return currentTab === item.tab;
    }

    // External pages — match by pathname prefix
    return pathname === itemPath || pathname.startsWith(itemPath + "/");
  }

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      <div className="space-y-1">
        {BUYER_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
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
