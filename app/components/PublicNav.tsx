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
    <nav className="sticky top-0 z-50 border-b border-white/[.06] bg-[#071a0e]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="text-[1.4rem] font-semibold tracking-[-.05em] text-white">
          Agraas
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="text-[.875rem] font-medium text-white/50 transition-colors duration-200 hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login"
            className="rounded-lg border border-white/[.12] px-4 py-2 text-[.8125rem] font-medium text-white/60 transition-all duration-200 hover:border-white/25 hover:text-white">
            Entrar
          </Link>
          <Link href="/cadastro"
            className="rounded-lg bg-[#5d9c44] px-4 py-2 text-[.8125rem] font-semibold text-white shadow-[0_2px_8px_rgba(93,156,68,.3)] transition-all duration-200 hover:bg-[#4f8a38] hover:shadow-[0_4px_16px_rgba(93,156,68,.4)]">
            Criar conta
          </Link>
        </div>

        <button type="button" onClick={() => setOpen(!open)} className="text-white/70 md:hidden" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="animate-[fadeIn_.2s_ease] border-t border-white/[.06] bg-[#071a0e] px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="text-[.9375rem] font-medium text-white/50 hover:text-white">{l.label}</Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Link href="/login" onClick={() => setOpen(false)}
                className="rounded-lg border border-white/[.12] py-2.5 text-center text-[.875rem] font-medium text-white/60">Entrar</Link>
              <Link href="/cadastro" onClick={() => setOpen(false)}
                className="rounded-lg bg-[#5d9c44] py-2.5 text-center text-[.875rem] font-semibold text-white">Criar conta</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
