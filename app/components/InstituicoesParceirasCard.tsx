"use client";

/**
 * Card de transparência LGPD — produtor vê quais instituições financeiras
 * pediram acesso ao dossiê e ativa/desativa permissão a qualquer momento.
 *
 * Aparece no /painel quando há pelo menos um relacionamento (ativo ou pendente).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

export type InstituicaoParceira = {
  id: string;                  // relationship id
  bank_name: string;
  relationship_type: "credit_analysis" | "portfolio_monitoring" | "loan_active";
  granted_by_producer: boolean;
  granted_at: string | null;
  created_at: string;
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  credit_analysis: "Análise de crédito",
  portfolio_monitoring: "Monitoramento de portfólio",
  loan_active: "Crédito ativo",
};

export default function InstituicoesParceirasCard({
  parceiras,
}: {
  parceiras: InstituicaoParceira[];
}) {
  if (parceiras.length === 0) return null;

  return (
    <div className="ag-card">
      <div className="px-6 py-4 border-b border-white/8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[--text-muted] flex items-center gap-1.5">
            <ShieldCheck size={12} />
            Transparência LGPD
          </div>
          <h3 className="text-lg font-semibold text-[--text-primary] mt-0.5">
            Instituições parceiras
          </h3>
          <p className="text-sm text-[--text-secondary] mt-1.5 max-w-xl">
            Estas instituições financeiras solicitaram acesso ao seu dossiê. Você controla
            o compartilhamento — pode liberar ou revogar a qualquer momento.
          </p>
        </div>
      </div>
      <div className="divide-y divide-white/8">
        {parceiras.map((p) => (
          <RowInstituicao key={p.id} parceira={p} />
        ))}
      </div>
    </div>
  );
}

function RowInstituicao({ parceira }: { parceira: InstituicaoParceira }) {
  const router = useRouter();
  const [granted, setGranted] = useState(parceira.granted_by_producer);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !granted;
    setError(null);
    setGranted(next);

    startTransition(async () => {
      try {
        const res = await fetch("/api/banco/toggle-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipId: parceira.id, granted: next }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar");
        router.refresh();
      } catch (e) {
        setGranted(!next);
        setError(e instanceof Error ? e.message : "Erro ao atualizar");
      }
    });
  }

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-[--surface-soft] border border-[--border] flex items-center justify-center shrink-0">
        <Building2 size={18} className="text-[--text-secondary]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[--text-primary] truncate">{parceira.bank_name}</div>
        <div className="text-xs text-[--text-secondary] mt-0.5">
          {RELATIONSHIP_LABEL[parceira.relationship_type] ?? parceira.relationship_type}
          {granted && parceira.granted_at && (
            <> · liberado em {new Date(parceira.granted_at).toLocaleDateString("pt-BR")}</>
          )}
        </div>
        {error && <div className="text-xs text-[--danger] mt-1">{error}</div>}
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-50 ${
          granted
            ? "bg-green-500/10 border-green-500/30 text-green-300"
            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
        }`}
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : granted ? (
          <ShieldCheck size={12} />
        ) : (
          <ShieldOff size={12} />
        )}
        {granted ? "Compartilhando" : "Bloqueado"}
      </button>
    </div>
  );
}
