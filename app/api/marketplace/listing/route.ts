import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const ListingTypeEnum = z.enum([
  "animal",
  "safra",
  "insumo",
  "maquinario",
  "equipamento",
  "epi",
  "outro",
]);

const ListingSchema = z.object({
  listing_type: ListingTypeEnum,
  title: z.string().min(5).max(120),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  price_per_unit: z.number().positive().max(10_000_000),
  unit: z.string().min(1).max(20),
  quantity_available: z.number().positive().max(10_000_000),
  location_city: z.string().min(1).max(80),
  location_state: z.string().length(2),
  halal_certified: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ListingSchema.safeParse(body);
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

  const { data: inserted, error } = await supabase
    .from("marketplace_listings")
    .insert({
      client_id: clientRow.id,
      listing_type: parsed.data.listing_type,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      price_per_unit: parsed.data.price_per_unit,
      unit: parsed.data.unit,
      quantity_available: parsed.data.quantity_available,
      location_city: parsed.data.location_city,
      location_state: parsed.data.location_state,
      halal_certified: parsed.data.halal_certified ?? false,
      status: "ativo",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível publicar o anúncio." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
