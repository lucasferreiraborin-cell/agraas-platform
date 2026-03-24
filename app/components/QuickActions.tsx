"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const actions = [
  { href: "/lotes/novo",     label: "Criar lote exportação", icon: "✈", color: "emerald" },
  { href: "/animais/novo",   label: "Adicionar animal",      icon: "◉", color: "sky"     },
  { href: "/aplicacoes",     label: "Registrar aplicação",   icon: "💉", color: "amber"  },
  { href: "/pesagens",       label: "Registrar pesagem",     icon: "⚖", color: "violet" },
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300", hover: "hover:bg-emerald-500/25" },
  sky:     { bg: "bg-sky-500/15",     border: "border-sky-500/30",     text: "text-sky-300",     hover: "hover:bg-sky-500/25"     },
  amber:   { bg: "bg-amber-500/15",   border: "border-amber-500/30",   text: "text-amber-300",   hover: "hover:bg-amber-500/25"   },
  violet:  { bg: "bg-violet-500/15",  border: "border-violet-500/30",  text: "text-violet-300",  hover: "hover:bg-violet-500/25"  },
};

export default function QuickActions() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (pathname.startsWith("/comprador")) return null;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-6 right-[92px] z-50 flex flex-col items-end gap-2">
      {/* Action items */}
      <div className="flex flex-col items-end gap-2 pb-1">
        {actions.map((action, i) => {
          const c = colorMap[action.color];
          return (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md transition-all duration-200 ${c.bg} ${c.border} ${c.text} ${c.hover} ${
                open
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-3 opacity-0"
              }`}
              style={{
                transitionDelay: open ? `${i * 40}ms` : `${(actions.length - 1 - i) * 30}ms`,
              }}
            >
              <span className="text-base leading-none">{action.icon}</span>
              <span className="whitespace-nowrap">{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* FAB trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu de ações" : "Abrir menu de ações rápidas"}
        className={`flex h-13 w-13 items-center justify-center rounded-full border border-white/20 bg-[#1a2535] text-white shadow-xl transition-all duration-300 hover:bg-[#1e2d42] hover:shadow-2xl active:scale-95 ${
          open ? "rotate-45 border-white/30 bg-[#1e2d42]" : ""
        }`}
        style={{ width: "52px", height: "52px" }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="10" y1="3" x2="10" y2="17" />
          <line x1="3" y1="10" x2="17" y2="10" />
        </svg>
      </button>
    </div>
  );
}
