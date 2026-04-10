"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Beef, Wheat, Truck, FileText } from "lucide-react";

const BUYER_NAV = [
  { href: "/comprador",                  label: "Overview",                icon: LayoutDashboard },
  { href: "/comprador?tab=livestock",    label: "Brazilian Livestock",     icon: Beef },
  { href: "/comprador?tab=grains",       label: "Agricultural Commodities",icon: Wheat },
  { href: "/tracking",                   label: "Live Tracking",           icon: Truck },
  { href: "/certificacoes",              label: "Reports",                 icon: FileText },
];

export default function BuyerSidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (path === "/comprador") return pathname === "/comprador";
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <nav className="flex-1 overflow-y-auto px-4 py-5">
      <div className="space-y-1">
        {BUYER_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium transition duration-200 ${
                active ? "bg-white/16 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                active ? "border-white/22 bg-white/20 text-white" : "border-white/8 bg-white/7 text-white/80"
              }`}>
                <Icon size={16} />
              </span>
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.9)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
