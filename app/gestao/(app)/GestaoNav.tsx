"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, FileText, Wallet, Package, Fuel, Layers, ClipboardCheck, Menu, X, ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; desc: string };

// Sete itens, uma ação principal por tela. Ordem = frequência de uso semanal.
export const GESTAO_ITENS: Item[] = [
  { href: "/gestao",            label: "Início",            icon: Home,           desc: "O que pede atenção hoje" },
  { href: "/gestao/notas",      label: "Notas fiscais",     icon: FileText,       desc: "A nota entra, o resto se lança" },
  { href: "/gestao/financeiro", label: "Contas a pagar e receber", icon: Wallet,  desc: "Vencimentos e baixas" },
  { href: "/gestao/maquinas",   label: "Máquinas e diesel", icon: Fuel,           desc: "Abastecimento e custo por máquina" },
  { href: "/gestao/estoque",    label: "Insumos",           icon: Package,        desc: "Estoque e histórico de preço" },
  { href: "/gestao/atividades", label: "Atividades",        icon: Layers,         desc: "Resultado por lavoura e criação" },
  { href: "/gestao/fechamento", label: "Fechamento do mês", icon: ClipboardCheck, desc: "Pronto para o contador" },
];

function ativo(pathname: string, href: string) {
  return href === "/gestao" ? pathname === "/gestao" : pathname === href || pathname.startsWith(href + "/");
}

function Lista({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-4 py-5" aria-label="Agraas Gestão">
      {GESTAO_ITENS.map((it) => {
        const on = ativo(pathname, it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={on ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[.9rem] transition ${
              on ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/8 hover:text-white"
            }`}
          >
            <Icon size={18} strokeWidth={on ? 2.2 : 1.8} className="shrink-0" />
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
      <div className="mt-6 border-t border-white/10 pt-5">
        <Link
          href="/painel"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[.8rem] text-white/60 transition hover:bg-white/8 hover:text-white"
        >
          Rastreio e passaporte
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </nav>
  );
}

export function GestaoSidebar() {
  return <Lista />;
}

export function GestaoMobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-black/5 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[84%] max-w-[320px] overflow-y-auto bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <span className="text-xl font-semibold tracking-[-0.04em] text-white">Agraas <span className="font-normal text-white/60">Gestão</span></span>
              <button type="button" onClick={() => setOpen(false)} className="text-white/80" aria-label="Fechar">
                <X size={22} />
              </button>
            </div>
            <Lista onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
