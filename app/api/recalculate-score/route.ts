import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { calculateAgraasScore, calculateAgeInMonths } from "@/lib/agraas-analytics";

export async function POST(req: NextRequest) {
  const { animalId } = await req.json();
  if (!animalId) return new Response("animalId obrigatório", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  // Busca dados do animal
  const { data: animal } = await supabase
    .from("animals")
    .select("id, internal_code, nickname, sex, breed, status, birth_date, blood_type, sire_animal_id, dam_animal_id, client_id")
    .eq("id", animalId)
    .single();

  if (!animal) return new Response("Animal não encontrado", { status: 404 });

  // Última pesagem
  const { data: weights } = await supabase
    .from("weights")
    .select("weight, weighing_date")
    .eq("animal_id", animalId)
    .order("weighing_date", { ascending: false })
    .limit(2);

  const lastWeight = weights?.[0] ? Number(weights[0].weight) : null;

  // Aplicações (sanidade)
  const { data: applications } = await supabase
    .from("applications")
    .select("application_date, withdrawal_date")
    .eq("animal_id", animalId);

  // Eventos (operacional / continuidade)
  const { data: events } = await supabase
    .from("events")
    .select("event_type, event_date")
    .eq("animal_id", animalId);

  // Pesagens nos últimos 90 dias (continuidade)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentWeighings = (weights ?? []).filter(
    w => w.weighing_date && new Date(w.weighing_date) > ninetyDaysAgo
  ).length;

  // Calcula sanitaryScore: base 50 + bônus por aplicações registradas (max 100)
  const appCount = (applications ?? []).length;
  const sanitaryScore = Math.min(100, 50 + appCount * 5);

  // Calcula operationalScore: base 40 + bônus por eventos registrados
  const eventCount = (events ?? []).length;
  const operationalScore = Math.min(100, 40 + eventCount * 3);

  // Calcula continuityScore: base 40 + bônus por pesagens recentes
  const continuityScore = Math.min(100, 40 + recentWeighings * 15);

  const totalScore = calculateAgraasScore({
    lastWeight,
    ageMonths: calculateAgeInMonths(animal.birth_date),
    sanitaryScore,
    operationalScore,
    continuityScore,
    hasBloodType: Boolean(animal.blood_type),
    hasGenealogy: Boolean(animal.sire_animal_id || animal.dam_animal_id),
  });

  const identityJson = {
    internal_code: animal.internal_code,
    sex: animal.sex,
    breed: animal.breed,
    status: animal.status,
  };

  const scoreJson = {
    total_score: totalScore,
    productive_score: lastWeight ? Math.min(100, 35 + Math.round(lastWeight / 10)) : 35,
    sanitary_score: sanitaryScore,
    operational_score: operationalScore,
    continuity_score: continuityScore,
    last_weight: lastWeight,
    updated_at: new Date().toISOString(),
  };

  // UPSERT no cache
  const { error: upsertError } = await supabase
    .from("agraas_master_passport_cache")
    .upsert(
      {
        animal_id: animalId,
        client_id: animal.client_id,
        identity_json: identityJson,
        score_json: scoreJson,
      },
      { onConflict: "animal_id" }
    );

  if (upsertError) {
    return Response.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  return Response.json({ ok: true, score: totalScore });
}
