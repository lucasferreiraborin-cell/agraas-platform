"use client";

/**
 * Admin Switcher — controle persistente no header que permite ao Lucas
 * (e qualquer outro admin) simular cada persona da plataforma.
 *
 * Aparece SÓ se realPersona === "admin". Cookie agraas_view_as persiste
 * a escolha por 8h. Botão "Resetar" apaga cookie e volta ao modo admin.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, Loader2, ShieldAlert } from "lucide-react";
import type { Persona } from "@/lib/persona-themes";

const OPTIONS: { value: Persona; label: string }[] = [
  { value: "produtor", label: "Produtor" },
  { value: "frigorifico", label: "Frigorífico" },
  { value: "banco", label: "Banco" },
];

export default function AdminSwitcher({
  currentViewing,
  isViewingAs,
}: {
  currentViewing: Persona;
  isViewingAs: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setView(persona: Persona | null) {
    setOpen(false);
    startTransition(async () => {
      await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
      });
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
          isViewingAs
            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"
        } hover:brightness-110`}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : isViewingAs ? (
          <Eye size={12} />
        ) : (
          <ShieldAlert size={12} />
        )}
        {isViewingAs ? `Vendo como ${labelFor(currentViewing)}` : "Admin"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 ag-card-strong p-2 shadow-2xl">
          <div className="text-[10px] uppercase tracking-wider text-[--text-muted] px-2 py-1">
            Ver como
          </div>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/8 transition ${
                isViewingAs && currentViewing === opt.value ? "bg-white/10 text-[--text-primary]" : "text-[--text-secondary]"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {isViewingAs && (
            <>
              <div className="h-px bg-white/8 my-1" />
              <button
                onClick={() => setView(null)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 transition flex items-center gap-2"
              >
                <X size={12} />
                Voltar para Admin (ver tudo)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function labelFor(p: Persona): string {
  return OPTIONS.find((o) => o.value === p)?.label ?? p;
}
