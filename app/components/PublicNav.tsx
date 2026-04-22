"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[.08] bg-[#0f3517]">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="text-[1.4rem] font-semibold tracking-[-.05em] text-white">
          Agraas
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="text-[.875rem] font-medium text-white transition-colors duration-200 hover:text-white/80">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login"
            className="rounded-lg border border-white/40 px-4 py-2 text-[.8125rem] font-medium text-white transition-all duration-200 hover:border-white/70 hover:bg-white/5">
            Entrar
          </Link>
          <Link href="/cadastro"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[.8125rem] font-semibold text-white shadow-[0_2px_8px_rgba(46,139,62,.3)] transition-all duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[0_4px_16px_rgba(46,139,62,.4)]">
            Criar conta
          </Link>
        </div>

        <button type="button" onClick={() => setOpen(!open)} className="text-white md:hidden" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="animate-[fadeIn_.2s_ease] border-t border-white/[.08] bg-[#0f3517] px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="text-[.9375rem] font-medium text-white hover:text-white/80">{l.label}</Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Link href="/login" onClick={() => setOpen(false)}
                className="rounded-lg border border-white/40 py-2.5 text-center text-[.875rem] font-medium text-white">Entrar</Link>
              <Link href="/cadastro" onClick={() => setOpen(false)}
                className="rounded-lg bg-[var(--primary)] py-2.5 text-center text-[.875rem] font-semibold text-white">Criar conta</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
