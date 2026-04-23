import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicShell from "@/app/components/ui/PublicShell";
import ScoreRing from "@/app/components/ui/ScoreRing";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { FadeIn } from "@/app/components/ui/Motion";
import OfferPanel from "@/app/components/marketplace/OfferPanel";
import {
  ArrowLeft,
  MapPin,
  Package,
  Calendar,
  ShieldCheck,
  Tag,
  Wheat,
  Truck,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

const TYPE_META: Record<string, { icon: typeof Package; label: string }> = {
  animal:      { icon: Tag,         label: "Animal"      },
  safra:       { icon: Wheat,       label: "Safra"       },
  insumo:      { icon: ShoppingBag, label: "Insumo"      },
  maquinario:  { icon: Truck,       label: "Maquinário"  },
  equipamento: { icon: Truck,       label: "Equipamento" },
  epi:         { icon: ShoppingBag, label: "EPI"         },
  outro:       { icon: Package,     label: "Outro"       },
};

type ListingDetail = {
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
  halal_certified: boolean;
  score_agraas: number | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  animal_id: string | null;
  lot_id: string | null;
};

type SellerInfo = {
  name: string;
  location?: string | null;
  activeListings: number;
  completedDeals: number;
  memberSince: string;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = createSupabaseServiceClient();
  const { data } = await db
    .from("marketplace_listings")
    .select("title, description, listing_type, location_city, location_state")
    .eq("id", id)
    .single();

  if (!data) return { title: "Anúncio" };

  const loc =
    data.location_city && data.location_state
      ? ` · ${data.location_city}-${data.location_state}`
      : "";

  return {
    title: data.title,
    description: (data.description ?? "").slice(0, 160) || `${TYPE_META[data.listing_type]?.label ?? ""}${loc}`,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseServiceClient();
  const supa = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supa.auth.getUser();

  const { data: listing } = await db
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .single();

  if (!listing) notFound();
  const l = listing as ListingDetail;

  // Seller info + agraas_id do animal (se linkado) para gerar URL do passaporte público
  const [{ data: seller }, { data: animalInfo }] = await Promise.all([
    db.from("clients").select("name, created_at").eq("id", l.client_id).single(),
    l.animal_id
      ? db.from("animals").select("agraas_id").eq("id", l.animal_id).single()
      : Promise.resolve({ data: null as { agraas_id?: string } | null }),
  ]);
  const passportSlug = animalInfo?.agraas_id ?? null;

  const [{ count: activeCount }, { count: dealsCount }] = await Promise.all([
    db
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("client_id", l.client_id)
      .eq("status", "ativo"),
    db
      .from("marketplace_transactions")
      .select("id", { count: "exact", head: true })
      .eq("seller_client_id", l.client_id)
      .eq("status", "pago"),
  ]);

  const sellerInfo: SellerInfo = {
    name: seller?.name ?? "Vendedor Agraas",
    location:
      l.location_city && l.location_state
        ? `${l.location_city} · ${l.location_state}`
        : null,
    activeListings: activeCount ?? 0,
    completedDeals: dealsCount ?? 0,
    memberSince: seller?.created_at ?? l.created_at,
  };

  const typeMeta = TYPE_META[l.listing_type] ?? TYPE_META.outro;
  const TypeIcon = typeMeta.icon;

  // Is current user the seller? Then don't show offer panel
  let isOwnListing = false;
  if (user) {
    const { data: me } = await supa
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (me?.id === l.client_id) isOwnListing = true;
  }

  const totalValue = l.price_per_unit * l.quantity_available;

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10 lg:py-12">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-[.8125rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--primary)]"
        >
          <ArrowLeft size={13} />
          Voltar ao marketplace
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
          {/* ─── LEFT: main content ─────────────────────────────────── */}
          <div>
            <FadeIn>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 font-mono text-[.6875rem] uppercase tracking-[.12em] text-[var(--text-secondary)]">
                  <TypeIcon size={11} />
                  {typeMeta.label}
                </span>
                {l.halal_certified && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-bold uppercase tracking-[.12em] text-[var(--primary)]">
                    <HalalBadgeSVG size={12} /> Halal certificado
                  </span>
                )}
                {l.score_agraas != null && l.score_agraas >= 70 && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[.6875rem] font-bold uppercase tracking-[.12em] text-emerald-700">
                    <ShieldCheck size={11} /> Premium
                  </span>
                )}
              </div>

              <h1 className="mt-6 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-[1.08] tracking-[-.025em] text-[var(--text-primary)]">
                {l.title}
              </h1>

              {sellerInfo.location && (
                <div className="mt-3 flex items-center gap-2 text-[.875rem] text-[var(--text-muted)]">
                  <MapPin size={13} />
                  {sellerInfo.location}
                </div>
              )}
            </FadeIn>

            {/* Visual hero — image placeholder / score ring for animal/safra */}
            <FadeIn delay={0.15}>
              <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[#0f3517] to-[#1E5E26] p-12">
                <div className="flex flex-col items-center gap-8 md:flex-row md:gap-14">
                  {l.score_agraas != null ? (
                    <ScoreRing
                      score={l.score_agraas}
                      size="lg"
                      variant="dark"
                      label="Score Agraas"
                      sub={typeMeta.label}
                    />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/[.05]">
                      <TypeIcon size={48} className="text-white/50" />
                    </div>
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                      Dados verificados
                    </p>
                    <h2 className="mt-3 text-[1.5rem] font-medium leading-[1.25] tracking-[-.02em] text-white">
                      Histórico completo da origem no passaporte Agraas.
                    </h2>
                    <p className="mt-3 text-[.9375rem] leading-[1.7] text-white/55">
                      Ao fechar negócio, você recebe o link para o passaporte digital com GPS, certificações, histórico sanitário e produtivo.
                    </p>
                    {(l.animal_id || l.lot_id) && (
                      <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[.05] px-3 py-1.5 font-mono text-[.75rem] text-white/70">
                        <ExternalLink size={11} />
                        {l.animal_id ? `animal_id: ${l.animal_id.slice(0, 8)}…` : `lot_id: ${l.lot_id?.slice(0, 8)}…`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Description */}
            {l.description && (
              <FadeIn delay={0.25}>
                <div className="mt-10">
                  <h3 className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                    Descrição
                  </h3>
                  <div className="mt-4 whitespace-pre-line text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
                    {l.description}
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Details grid */}
            <FadeIn delay={0.3}>
              <div className="mt-10">
                <h3 className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                  Detalhes
                </h3>
                <div className="mt-4 grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:grid-cols-2">
                  <DetailRow
                    icon={<Package size={14} />}
                    label="Quantidade disponível"
                    value={`${l.quantity_available.toLocaleString("pt-BR")} ${l.unit}`}
                  />
                  <DetailRow
                    icon={<Tag size={14} />}
                    label="Tipo"
                    value={typeMeta.label}
                  />
                  {l.category && (
                    <DetailRow
                      icon={<Package size={14} />}
                      label="Categoria"
                      value={l.category}
                    />
                  )}
                  <DetailRow
                    icon={<Calendar size={14} />}
                    label="Publicado em"
                    value={fmtDate(l.created_at)}
                  />
                  {l.expires_at && (
                    <DetailRow
                      icon={<Calendar size={14} />}
                      label="Validade"
                      value={fmtDate(l.expires_at)}
                    />
                  )}
                  <DetailRow
                    icon={<ShieldCheck size={14} />}
                    label="Certificação Halal"
                    value={l.halal_certified ? "Sim — verificada" : "Não declarada"}
                    valueClass={l.halal_certified ? "text-[var(--primary)]" : undefined}
                  />
                </div>
              </div>
            </FadeIn>
          </div>

          {/* ─── RIGHT: sticky offer / seller panel ─────────────────── */}
          <aside className="lg:sticky lg:top-[92px] lg:h-fit">
            <div className="space-y-5">
              {/* Price + offer card */}
              <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-card)]">
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--text-muted)]">
                  Preço por {l.unit}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[2.2rem] font-semibold tracking-[-.02em] text-[var(--primary)]">
                    {fmtBRL(l.price_per_unit)}
                  </span>
                </div>
                <p className="mt-2 text-[.8125rem] text-[var(--text-muted)]">
                  Valor total estimado:{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {fmtBRL(totalValue)}
                  </span>{" "}
                  <span className="text-[var(--text-muted)]">
                    ({l.quantity_available.toLocaleString("pt-BR")} {l.unit})
                  </span>
                </p>

                <div className="my-6 h-px bg-[var(--border)]" />

                <OfferPanel
                  listingId={l.id}
                  isLoggedIn={!!user}
                  isOwn={isOwnListing}
                  unit={l.unit}
                  maxQty={l.quantity_available}
                  unitPrice={l.price_per_unit}
                />

                {passportSlug && (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <a
                      href={`/passaporte/${passportSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-white px-4 py-3 text-[.8125rem] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                    >
                      Ver passaporte público
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>

              {/* Seller card */}
              <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--text-muted)]">
                  Vendedor
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[.9375rem] font-bold text-[var(--primary)]">
                    {sellerInfo.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[.9375rem] font-semibold text-[var(--text-primary)]">
                      {sellerInfo.name}
                    </p>
                    {sellerInfo.location && (
                      <p className="flex items-center gap-1 text-[.75rem] text-[var(--text-muted)]">
                        <MapPin size={10} />
                        {sellerInfo.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[var(--surface-soft)] p-3 text-center">
                    <p className="font-mono text-[.6875rem] uppercase tracking-[.12em] text-[var(--text-muted)]">
                      Anúncios
                    </p>
                    <p className="mt-1 text-[1.125rem] font-semibold text-[var(--text-primary)]">
                      {sellerInfo.activeListings}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-3 text-center">
                    <p className="font-mono text-[.6875rem] uppercase tracking-[.12em] text-[var(--text-muted)]">
                      Vendas
                    </p>
                    <p className="mt-1 text-[1.125rem] font-semibold text-[var(--text-primary)]">
                      {sellerInfo.completedDeals}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[.6875rem] text-[var(--text-muted)]">
                  Membro Agraas desde {fmtDate(sellerInfo.memberSince)}
                </p>
              </div>

              {/* Trust badges */}
              <div className="rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-soft)]/60 p-5">
                <p className="flex items-center gap-1.5 text-[.75rem] font-semibold text-[var(--primary)]">
                  <ShieldCheck size={13} />
                  Proteção Agraas
                </p>
                <p className="mt-2 text-[.75rem] leading-[1.65] text-[var(--text-secondary)]">
                  Todos os anúncios passam por validação automática de origem, certificações e score. RLS garante que apenas dados verificáveis aparecem publicamente.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[.6875rem] font-medium uppercase tracking-[.14em] text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <p className={`mt-1.5 text-[.9375rem] font-semibold text-[var(--text-primary)] ${valueClass ?? ""}`}>
        {value}
      </p>
    </div>
  );
}
