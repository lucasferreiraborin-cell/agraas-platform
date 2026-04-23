import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicShell from "@/app/components/ui/PublicShell";
import MarketplaceTabs from "@/app/components/marketplace/MarketplaceTabs";
import MarketplacePublicView from "@/app/components/marketplace/MarketplacePublicView";
import type { Listing, Offer, Transaction } from "@/app/components/marketplace/MarketplaceTabs";

export const metadata: Metadata = {
  title: "Marketplace Agro",
  description:
    "Compre e venda animais, safras, insumos e equipamentos com rastreabilidade Agraas integrada. Certificação Halal e Score verificados automaticamente.",
};

export const revalidate = 120;

export default async function MarketplacePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: clientData } = user
    ? await supabase.from("clients").select("id").eq("auth_user_id", user.id).single()
    : { data: null };

  const clientId = clientData?.id ?? "";
  const isPublic = !user;

  // Listings públicos: sempre service client (bypass RLS, listings ativos são públicos)
  const db = createSupabaseServiceClient();
  const [{ data: listingsData }, { data: myListingsData }, { data: offersData }, { data: txData }] = await Promise.all([
    db.from("marketplace_listings").select("*").eq("status", "ativo").order("created_at", { ascending: false }),
    isPublic
      ? Promise.resolve({ data: [] })
      : supabase.from("marketplace_listings").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    isPublic
      ? Promise.resolve({ data: [] })
      : supabase
          .from("marketplace_offers")
          .select("*, listing:marketplace_listings(title)")
          .eq("buyer_client_id", clientId)
          .order("created_at", { ascending: false }),
    isPublic
      ? Promise.resolve({ data: [] })
      : supabase
          .from("marketplace_transactions")
          .select("*, listing:marketplace_listings(title)")
          .or(`seller_client_id.eq.${clientId},buyer_client_id.eq.${clientId}`)
          .order("created_at", { ascending: false }),
  ]);

  const listings: Listing[] = (listingsData ?? []) as Listing[];
  const myListings: Listing[] = (myListingsData ?? []) as Listing[];

  const myOffers: Offer[] = ((offersData ?? []) as unknown[]).map((o) => {
    const row = o as { listing?: { title?: string } | { title?: string }[] } & Record<string, unknown>;
    const lt = Array.isArray(row.listing) ? row.listing[0]?.title : row.listing?.title;
    return { ...(row as unknown as Offer), listing_title: lt };
  });

  const myTransactions: Transaction[] = ((txData ?? []) as unknown[]).map((t) => {
    const row = t as { listing?: { title?: string } | { title?: string }[] } & Record<string, unknown>;
    const lt = Array.isArray(row.listing) ? row.listing[0]?.title : row.listing?.title;
    return { ...(row as unknown as Transaction), listing_title: lt };
  });

  // ── Public visitor: full marketing + catalog view ───────────────────────
  if (isPublic) {
    return (
      <PublicShell>
        <MarketplacePublicView listings={listings} />
      </PublicShell>
    );
  }

  // ── Authenticated: sidebar layout (root layout handles) + tabs ─────────
  const activeCount = listings.length;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Agraas Marketplace</span>
            <h1 className="ag-page-title">Marketplace Agro</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Compre e venda animais, safras, insumos e equipamentos com rastreabilidade Agraas integrada.
              Certificação Halal e Score verificados automaticamente.
            </p>
          </div>
          <div className="ag-hero-panel">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ag-kpi-card">
                <p className="ag-kpi-label">Anúncios ativos</p>
                <p className="ag-kpi-value text-[var(--primary)]">{activeCount}</p>
                <p className="sub">no marketplace</p>
              </div>
              <div className="ag-kpi-card">
                <p className="ag-kpi-label">Meus anúncios</p>
                <p className="ag-kpi-value">{myListings.length}</p>
                <p className="sub">publicados</p>
              </div>
              <div className="ag-kpi-card">
                <p className="ag-kpi-label">Ofertas enviadas</p>
                <p className="ag-kpi-value">{myOffers.length}</p>
                <p className="sub">pendentes e respondidas</p>
              </div>
              <div className="ag-kpi-card">
                <p className="ag-kpi-label">Transações</p>
                <p className="ag-kpi-value">{myTransactions.length}</p>
                <p className="sub">concluídas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketplaceTabs
        listings={listings}
        myListings={myListings}
        myOffers={myOffers}
        myTransactions={myTransactions}
        currentClientId={clientId}
      />
    </main>
  );
}
