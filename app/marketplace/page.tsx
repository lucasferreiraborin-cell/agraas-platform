import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ShoppingBag } from "lucide-react";
import MarketplaceTabs from "@/app/components/marketplace/MarketplaceTabs";
import type { Listing, Offer, Transaction } from "@/app/components/marketplace/MarketplaceTabs";

export default async function MarketplacePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: clientData } = user
    ? await supabase.from("clients").select("id").eq("auth_user_id", user.id).single()
    : { data: null };

  const clientId = clientData?.id ?? "";

  const [{ data: listingsData }, { data: myListingsData }, { data: offersData }, { data: txData }] = await Promise.all([
    supabase.from("marketplace_listings").select("*").eq("status", "ativo").order("created_at", { ascending: false }),
    supabase.from("marketplace_listings").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("marketplace_offers").select("*, listing:marketplace_listings(title)").eq("buyer_client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("marketplace_transactions").select("*, listing:marketplace_listings(title)").or(`seller_client_id.eq.${clientId},buyer_client_id.eq.${clientId}`).order("created_at", { ascending: false }),
  ]);

  const listings: Listing[] = (listingsData ?? []) as Listing[];
  const myListings: Listing[] = (myListingsData ?? []) as Listing[];

  const myOffers: Offer[] = ((offersData ?? []) as unknown[]).map((o: any) => ({
    ...o,
    listing_title: Array.isArray(o.listing) ? o.listing[0]?.title : o.listing?.title,
  }));

  const myTransactions: Transaction[] = ((txData ?? []) as unknown[]).map((t: any) => ({
    ...t,
    listing_title: Array.isArray(t.listing) ? t.listing[0]?.title : t.listing?.title,
  }));

  const activeCount = listings.length;

  return (
    <main className="space-y-6">
      <section className="ag-card-strong overflow-hidden">
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
