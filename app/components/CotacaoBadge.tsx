/**
 * Badge de cotação @ — mostra valor + timestamp + indicador stale.
 *
 * Server Component. Use inline em telas onde preço aparece (painel, financeiro,
 * vendas, abates, etc.).
 */

import { getCotacaoArroba, formatCotacaoAge } from "@/lib/cotacao";
import { TrendingUp, AlertTriangle } from "lucide-react";

type Props = {
  /** Estilo compacto (sem texto explicativo). Use em headers. */
  compact?: boolean;
};

export async function CotacaoBadge({ compact = false }: Props) {
  const snap = await getCotacaoArroba();

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Stale ou fallback → âmbar com warning
  if (snap.isStale || snap.isFallback) {
    return (
      <span
        title={
          snap.isFallback
            ? "Cotação indisponível. Valor de referência aplicado até próxima atualização."
            : `Última atualização ${formatCotacaoAge(snap.updatedAt)}. Considere uma atualização manual.`
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
      >
        <AlertTriangle size={11} />
        <span className="tabular-nums">{fmt.format(snap.value)}/@</span>
        {!compact && (
          <span className="text-[10px] font-normal text-amber-700">
            · {snap.isFallback ? "valor de referência" : "stale"}
          </span>
        )}
      </span>
    );
  }

  // Estado fresco → verde
  return (
    <span
      title={`Atualizada ${formatCotacaoAge(snap.updatedAt)} · CEPEA/Esalq`}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
    >
      <TrendingUp size={11} />
      <span className="tabular-nums">{fmt.format(snap.value)}/@</span>
      {!compact && (
        <span className="text-[10px] font-normal text-emerald-700">
          · {formatCotacaoAge(snap.updatedAt)}
        </span>
      )}
    </span>
  );
}
