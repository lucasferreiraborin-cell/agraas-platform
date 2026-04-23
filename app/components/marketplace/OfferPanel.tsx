"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MessageSquare, Lock } from "lucide-react";

interface OfferPanelProps {
  listingId: string;
  isLoggedIn: boolean;
  isOwn: boolean;
  unit: string;
  maxQty: number;
  unitPrice: number;
}

export default function OfferPanel({
  listingId,
  isLoggedIn,
  isOwn,
  unit,
  maxQty,
  unitPrice,
}: OfferPanelProps) {
  const [qty, setQty] = useState(Math.min(1, maxQty));
  const [offerPrice, setOfferPrice] = useState(unitPrice);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          offer_price_per_unit: offerPrice,
          offer_quantity: qty,
          message,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Erro ao enviar oferta." }));
        throw new Error(msg ?? "Erro ao enviar oferta.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar oferta.");
    } finally {
      setLoading(false);
    }
  }

  if (isOwn) {
    return (
      <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-soft)]/50 p-4 text-center">
        <p className="text-[.8125rem] font-semibold text-[var(--primary)]">
          Este é o seu anúncio
        </p>
        <p className="mt-1 text-[.75rem] text-[var(--text-secondary)]">
          As ofertas recebidas aparecerão no painel da plataforma.
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <p className="flex items-center gap-2 text-[.8125rem] font-semibold text-[var(--text-primary)]">
            <Lock size={13} />
            Entre para fazer uma oferta
          </p>
          <p className="mt-1 text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
            Em 2 minutos você cria conta e negocia direto com o vendedor.
          </p>
        </div>
        <Link
          href={`/cadastro?next=/marketplace/${listingId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)]"
        >
          Criar conta gratuita
          <ArrowRight size={14} />
        </Link>
        <Link
          href={`/login?next=/marketplace/${listingId}`}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white py-3 text-[.875rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
        >
          Já tenho conta
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5 text-center">
        <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[var(--primary)]">
          Oferta enviada
        </p>
        <p className="mt-2 text-[.875rem] font-semibold text-[var(--primary)]">
          ✓ O vendedor foi notificado.
        </p>
        <p className="mt-2 text-[.75rem] leading-[1.55] text-[var(--text-secondary)]">
          Você verá o status em <strong>Minhas Ofertas</strong> no painel.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[.6875rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
            Quantidade ({unit})
          </label>
          <input
            type="number"
            min={1}
            max={maxQty}
            step={1}
            value={qty}
            onChange={(e) =>
              setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 0)))
            }
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[.6875rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
            Preço por {unit}
          </label>
          <input
            type="number"
            min={1}
            step="0.01"
            value={offerPrice}
            onChange={(e) => setOfferPrice(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[.6875rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
          Mensagem (opcional)
        </label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Conte sua necessidade, prazo de entrega, forma de pagamento…"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
        />
      </div>

      <div className="rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-[.75rem] text-[var(--text-secondary)]">
        Total da oferta:{" "}
        <span className="font-mono font-semibold text-[var(--text-primary)]">
          {(qty * offerPrice).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || qty < 1 || offerPrice <= 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Enviando
          </>
        ) : (
          <>
            <MessageSquare size={14} />
            Fazer oferta
          </>
        )}
      </button>
    </form>
  );
}
