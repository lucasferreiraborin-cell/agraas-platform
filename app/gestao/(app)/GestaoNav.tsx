"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, FileText, Wallet, Package, Fuel, Layers, ClipboardCheck, Menu, X, ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; desc: string; curto: string };

// Sete itens, uma ação principal por tela. Ordem = frequência de uso semanal.
export const GESTAO_ITENS: Item[] = [
  { href: "/gestao",            label: "Início",            curto: "Início", icon: Home,           desc: "O que pede atenção hoje" },
  { href: "/gestao/notas",      label: "Notas fiscais",     curto: "Notas",  icon: FileText,       desc: "A nota entra, o resto se lança" },
  { href: "/gestao/financeiro", label: "Contas a pagar e receber", curto: "Contas", icon: Wallet,  desc: "Vencimentos e baixas" },
  { href: "/gestao/maquinas",   label: "Máquinas e diesel", curto: "Diesel", icon: Fuel,           desc: "Abastecimento e custo por máquina" },
  { href: "/gestao/estoque",    label: "Insumos",           curto: "Insumos", icon: Package,       desc: "Estoque e histórico de preço" },
  { href: "/gestao/atividades", label: "Atividades",        curto: "Atividades", icon: Layers,     desc: "Resultado por lavoura e criação" },
  { href: "/gestao/fechamento", label: "Fechamento do mês", curto: "Fechamento", icon: ClipboardCheck, desc: "Pronto para o contador" },
];

const NA_BARRA = ["/gestao", "/gestao/notas", "/gestao/financeiro", "/gestao/maquinas"];

function ativo(pathname: string, href: string) {
  return href === "/gestao" ? pathname === "/gestao" : pathname === href || pathname.startsWith(href + "/");
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

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
            className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[.9rem] transition ${FOCO} ${
              on ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} strokeWidth={on ? 2.2 : 1.8} className="shrink-0" aria-hidden />
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
      <div className="mt-6 border-t border-white/10 pt-5">
        {/* Sai do /gestao: navegação completa (o shell é escolhido no servidor). */}
        <a
          href="/painel"
          className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-[.8rem] text-white/70 transition hover:bg-white/10 hover:text-white ${FOCO}`}
        >
          Rastreio e passaporte
          <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>
    </nav>
  );
}

export function GestaoSidebar() {
  return <Lista />;
}

/** Barra inferior fixa (< lg): 4 destinos + Mais, que abre o menu completo. */
export function GestaoBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const itens = GESTAO_ITENS.filter((i) => NA_BARRA.includes(i.href));
  const maisAtivo = !NA_BARRA.some((h) => ativo(pathname, h));
  const base = "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[.68rem] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]";

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(20,40,20,0.06)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-stretch gap-1 px-2 pt-1.5 pb-1.5">
          {itens.map((it) => {
            const on = ativo(pathname, it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`${base} ${on ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]" : "text-[var(--text-secondary)]"}`}
              >
                <Icon size={21} strokeWidth={on ? 2.3 : 1.8} aria-hidden />
                {it.curto}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={`${base} ${maisAtivo ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]" : "text-[var(--text-secondary)]"}`}
          >
            <Menu size={21} strokeWidth={maisAtivo ? 2.3 : 1.8} aria-hidden />
            Mais
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] overflow-y-auto bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <span className="text-xl font-semibold tracking-[-0.04em] text-white">Agraas <span className="font-normal text-white/70">Gestão</span></span>
              <button type="button" onClick={() => setOpen(false)} className={`rounded-lg p-1 text-white/90 ${FOCO}`} aria-label="Fechar menu">
                <X size={22} aria-hidden />
              </button>
            </div>
            <Lista onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
