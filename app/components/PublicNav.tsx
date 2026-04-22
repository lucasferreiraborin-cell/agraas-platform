"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
];

const W = { color: "#ffffff" } as const;

export default function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50" style={{ backgroundColor: "#0f3517", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" style={W} className="text-[1.4rem] font-semibold tracking-[-.05em]">
          Agraas
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} style={W} className="text-[.875rem] font-medium transition-opacity duration-200 hover:opacity-80">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" style={{ ...W, border: "1px solid rgba(255,255,255,.4)" }}
            className="rounded-lg px-4 py-2 text-[.8125rem] font-medium transition-all duration-200 hover:opacity-80">
            Entrar
          </Link>
          <Link href="/cadastro" style={{ ...W, backgroundColor: "#2E8B3E" }}
            className="rounded-lg px-4 py-2 text-[.8125rem] font-semibold shadow-[0_2px_8px_rgba(46,139,62,.3)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(46,139,62,.4)]">
            Criar conta
          </Link>
        </div>

        <button type="button" onClick={() => setOpen(!open)} style={W} className="md:hidden" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="animate-[fadeIn_.2s_ease] px-6 pb-6 pt-4 md:hidden" style={{ backgroundColor: "#0f3517", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div className="flex flex-col gap-4">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={W} className="text-[.9375rem] font-medium">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Link href="/login" onClick={() => setOpen(false)} style={{ ...W, border: "1px solid rgba(255,255,255,.4)" }}
                className="rounded-lg py-2.5 text-center text-[.875rem] font-medium">Entrar</Link>
              <Link href="/cadastro" onClick={() => setOpen(false)} style={{ ...W, backgroundColor: "#2E8B3E" }}
                className="rounded-lg py-2.5 text-center text-[.875rem] font-semibold">Criar conta</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
