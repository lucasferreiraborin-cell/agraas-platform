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
  animal_id: z.string().uuid().optional(),
  lot_id: z.string().uuid().optional(),
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

  // animal_id/score nunca vêm do cliente como valor de confiança: o vínculo
  // só vale se o animal for do próprio cliente, e o score é relido aqui
  // (mesmo padrão .in(["v3","v3.1","v3.2"]) usado no resto do app) — não dá
  // pra forjar score num anúncio público.
  let animalId: string | null = null;
  let scoreAgraas: number | null = null;
  if (parsed.data.animal_id) {
    const { data: animal } = await supabase
      .from("animals")
      .select("id, client_id")
      .eq("id", parsed.data.animal_id)
      .maybeSingle();
    if (animal && animal.client_id === clientRow.id) {
      animalId = animal.id;
      const { data: scoreRow } = await supabase
        .from("animal_scores")
        .select("total_score")
        .eq("animal_id", animalId)
        .in("algorithm_version", ["v3", "v3.1", "v3.2"])
        .maybeSingle();
      if (scoreRow?.total_score != null) {
        scoreAgraas = Math.round(Number(scoreRow.total_score));
      }
    }
  }

  // Mesma regra do animal: lot_id só vale se o lote for do próprio cliente,
  // e o score é a média real dos animais ainda ativos no lote (lido aqui,
  // não aceito do corpo da requisição).
  let lotId: string | null = null;
  if (parsed.data.lot_id) {
    const { data: lot } = await supabase
      .from("lots")
      .select("id, client_id")
      .eq("id", parsed.data.lot_id)
      .maybeSingle();
    if (lot && lot.client_id === clientRow.id) {
      lotId = lot.id;
      const { data: assignments } = await supabase
        .from("animal_lot_assignments")
        .select("animal_id")
        .eq("lot_id", lotId)
        .is("exit_date", null);
      const animalIds = (assignments ?? []).map((a) => a.animal_id).filter(Boolean);
      if (animalIds.length > 0) {
        const { data: scoreRows } = await supabase
          .from("animal_scores")
          .select("total_score")
          .in("animal_id", animalIds)
          .in("algorithm_version", ["v3", "v3.1", "v3.2"]);
        const scores = (scoreRows ?? [])
          .map((s) => Number(s.total_score))
          .filter((v) => !Number.isNaN(v));
        if (scores.length > 0) {
          scoreAgraas = Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
        }
      }
    }
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
      animal_id: animalId,
      lot_id: lotId,
      score_agraas: scoreAgraas,
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
