"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Package, Tag, Truck, Plus, MessageSquare, CheckCircle } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

// ── Types ────────────────────────────────────────────────────────────────────
export type Listing = {
  id: string;
  client_id: string;
  listing_type: string;
  title: string;
  description: string | null;
  category: string | null;
  price_per_unit: number;
  unit: string;
  quantity_available: number;
  location_state: string | null;
  location_city: string | null;
  status: string;
  halal_certified: boolean;
  score_agraas: number | null;
  created_at: string;
  client_name?: string;
};

export type Offer = {
  id: string;
  listing_id: string;
  offer_price_per_unit: number;
  offer_quantity: number;
  message: string | null;
  status: string;
  created_at: string;
  listing_title?: string;
};

export type Transaction = {
  id: string;
  listing_id: string;
  final_price_per_unit: number;
  final_quantity: number;
  total_value: number;
  status: string;
  created_at: string;
  listing_title?: string;
  counterpart_name?: string;
};

export type MarketplaceProps = {
  listings: Listing[];
  myListings: Listing[];
  myOffers: Offer[];
  myTransactions: Transaction[];
  currentClientId: string;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const TYPE_ICON: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  animal:       { icon: Tag,         color: "text-emerald-700", bg: "bg-emerald-50" },
  safra:        { icon: Package,     color: "text-amber-700",   bg: "bg-amber-50" },
  insumo:       { icon: ShoppingBag, color: "text-blue-700",    bg: "bg-blue-50" },
  maquinario:   { icon: Truck,       color: "text-purple-700",  bg: "bg-purple-50" },
  equipamento:  { icon: Truck,       color: "text-indigo-700",  bg: "bg-indigo-50" },
  epi:          { icon: ShoppingBag, color: "text-teal-700",    bg: "bg-teal-50" },
  outro:        { icon: Package,     color: "text-gray-700",    bg: "bg-gray-50" },
};

const TYPE_LABEL: Record<string, string> = {
  animal: "Animal", safra: "Safra", insumo: "Insumo", maquinario: "Maquinário",
  equipamento: "Equipamento", epi: "EPI", outro: "Outro",
};

const OFFER_STATUS: Record<string, { cls: string; label: string }> = {
  pendente:  { cls: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pendente" },
  aceita:    { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Aceita" },
  recusada:  { cls: "bg-red-50 text-red-700 border-red-200",         label: "Recusada" },
  expirada:  { cls: "bg-gray-50 text-gray-600 border-gray-200",      label: "Expirada" },
};

const TX_STATUS: Record<string, { cls: string; label: string }> = {
  aguardando_pagamento: { cls: "bg-amber-50 text-amber-700 border-amber-200",   label: "Aguardando pagamento" },
  pago:                 { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Pago" },
  entregue:             { cls: "bg-blue-50 text-blue-700 border-blue-200",       label: "Entregue" },
  cancelado:            { cls: "bg-red-50 text-red-700 border-red-200",          label: "Cancelado" },
  disputado:            { cls: "bg-purple-50 text-purple-700 border-purple-200", label: "Disputado" },
};

const TABS = [
  { key: "explorar", label: "Explorar", icon: Search },
  { key: "meus", label: "Meus Anúncios", icon: Tag },
  { key: "ofertas", label: "Minhas Ofertas", icon: MessageSquare },
  { key: "transacoes", label: "Transações", icon: CheckCircle },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MarketplaceTabs({ listings, myListings, myOffers, myTransactions }: MarketplaceProps) {
  const [tab, setTab] = useState<TabKey>("explorar");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [halalOnly, setHalalOnly] = useState(false);

  const filtered = useMemo(() => {
    let r = listings;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(l => l.title.toLowerCase().includes(q) || (l.description ?? "").toLowerCase().includes(q));
    }
    if (typeFilter) r = r.filter(l => l.listing_type === typeFilter);
    if (halalOnly) r = r.filter(l => l.halal_certified);
    return r;
  }, [listings, search, typeFilter, halalOnly]);

  return (
    <>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl bg-[var(--surface-soft)] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const count = t.key === "meus" ? myListings.length : t.key === "ofertas" ? myOffers.length : t.key === "transacoes" ? myTransactions.length : filtered.length;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.key ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`}>
              <Icon size={15} />{t.label}
              <span className="ml-1 rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── EXPLORAR ─────────────────────────────────────────────────── */}
      {tab === "explorar" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou descrição..."
                className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none">
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={halalOnly} onChange={e => setHalalOnly(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--primary)]" />
              Halal certificado
            </label>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="ag-empty-state">
              <div className="ag-empty-state-icon"><ShoppingBag size={24} /></div>
              <p className="ag-empty-state-title">Nenhum anúncio encontrado</p>
              <p className="ag-empty-state-text">Ajuste os filtros ou publique o primeiro anúncio.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      )}

      {/* ── MEUS ANÚNCIOS ────────────────────────────────────────────── */}
      {tab === "meus" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="ag-section-title">Meus anúncios</h3>
            <Link href="/marketplace/novo" className="ag-button-primary flex items-center gap-2">
              <Plus size={15} /> Novo anúncio
            </Link>
          </div>
          {myListings.length === 0 ? (
            <div className="ag-empty-state">
              <div className="ag-empty-state-icon"><Tag size={24} /></div>
              <p className="ag-empty-state-title">Nenhum anúncio publicado</p>
              <p className="ag-empty-state-text">Publique animais, safras ou insumos para venda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map(l => (
                <div key={l.id} className="ag-card flex items-center justify-between gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{l.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{TYPE_LABEL[l.listing_type]} · {fmt(l.price_per_unit)}/{l.unit} · {l.quantity_available} disponíveis</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${l.status === "ativo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                    {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MINHAS OFERTAS ────────────────────────────────────────────── */}
      {tab === "ofertas" && (
        <div className="space-y-4">
          <h3 className="ag-section-title">Minhas ofertas</h3>
          {myOffers.length === 0 ? (
            <div className="ag-empty-state">
              <div className="ag-empty-state-icon"><MessageSquare size={24} /></div>
              <p className="ag-empty-state-title">Nenhuma oferta enviada</p>
              <p className="ag-empty-state-text">Explore o marketplace e faça ofertas em anúncios.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOffers.map(o => {
                const st = OFFER_STATUS[o.status] ?? OFFER_STATUS.pendente;
                return (
                  <div key={o.id} className="ag-card flex items-center justify-between gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] truncate">{o.listing_title ?? o.listing_id.slice(0, 8)}</p>
                      <p className="text-xs text-[var(--text-muted)]">{fmt(o.offer_price_per_unit)} × {o.offer_quantity}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TRANSAÇÕES ────────────────────────────────────────────────── */}
      {tab === "transacoes" && (
        <div className="space-y-4">
          <h3 className="ag-section-title">Transações</h3>
          {myTransactions.length === 0 ? (
            <div className="ag-empty-state">
              <div className="ag-empty-state-icon"><CheckCircle size={24} /></div>
              <p className="ag-empty-state-title">Nenhuma transação concluída</p>
              <p className="ag-empty-state-text">As transações aparecerão aqui quando ofertas forem aceitas e pagas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table w-full">
                <thead>
                  <tr><th>Data</th><th>Anúncio</th><th>Valor</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {myTransactions.map(t => {
                    const st = TX_STATUS[t.status] ?? TX_STATUS.aguardando_pagamento;
                    return (
                      <tr key={t.id}>
                        <td className="tabular-nums text-sm">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="font-medium">{t.listing_title ?? "—"}</td>
                        <td className="tabular-nums font-bold text-emerald-600">{fmt(t.total_value)}</td>
                        <td><span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ listing: l }: { listing: Listing }) {
  const t = TYPE_ICON[l.listing_type] ?? TYPE_ICON.outro;
  const Icon = t.icon;

  return (
    <div className="ag-card group relative overflow-hidden p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      {/* Type badge */}
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.bg}`}>
          <Icon size={18} className={t.color} />
        </span>
        <div className="flex items-center gap-1.5">
          {l.halal_certified && <HalalBadgeSVG size={28} />}
          {l.score_agraas != null && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Score {l.score_agraas}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <h4 className="mt-3 font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">{l.title}</h4>
      {l.description && <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{l.description}</p>}

      {/* Price */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-[var(--primary)]">{fmt(l.price_per_unit)}</span>
        <span className="text-xs text-[var(--text-muted)]">/{l.unit}</span>
      </div>

      {/* Meta */}
      <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
        {l.location_city && l.location_state && <span>{l.location_city}-{l.location_state}</span>}
        <span>{l.quantity_available.toLocaleString("pt-BR")} disponíveis</span>
      </div>

      {/* CTA */}
      <Link href={`/marketplace/${l.id}`} className="mt-4 block w-full rounded-xl border border-[var(--primary)] bg-white py-2 text-center text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition">
        Ver detalhes
      </Link>
    </div>
  );
}
