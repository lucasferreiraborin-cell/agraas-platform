import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const OfferSchema = z.object({
  listing_id: z.string().uuid(),
  offer_price_per_unit: z.number().positive().max(10_000_000),
  offer_quantity: z.number().positive().max(1_000_000),
  message: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = OfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientRow) {
    return NextResponse.json(
      { error: "Perfil de cliente não encontrado." },
      { status: 400 },
    );
  }

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, client_id, status, quantity_available")
    .eq("id", parsed.data.listing_id)
    .single();
  if (!listing) {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }
  if (listing.status !== "ativo") {
    return NextResponse.json({ error: "Anúncio não está ativo." }, { status: 400 });
  }
  if (listing.client_id === clientRow.id) {
    return NextResponse.json(
      { error: "Você não pode fazer oferta no próprio anúncio." },
      { status: 400 },
    );
  }
  if (parsed.data.offer_quantity > listing.quantity_available) {
    return NextResponse.json(
      { error: `Quantidade solicitada excede disponível (${listing.quantity_available}).` },
      { status: 400 },
    );
  }

  const { data: inserted, error } = await supabase
    .from("marketplace_offers")
    .insert({
      listing_id: parsed.data.listing_id,
      buyer_client_id: clientRow.id,
      offer_price_per_unit: parsed.data.offer_price_per_unit,
      offer_quantity: parsed.data.offer_quantity,
      message: parsed.data.message ?? null,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível registrar a oferta." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
