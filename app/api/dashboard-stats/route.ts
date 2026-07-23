import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const CACHE_TTL = 300; // 5 minutos

// Cria service client uma vez (fora do cache, fora do handler)
function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Cache definido a nível de módulo — unstable_cache precisa ser estável entre requisições
const fetchHerdStats = (clientId: string) =>
  unstable_cache(
    async () => {
      const db = getServiceDb();

      const today = new Date().toISOString().split("T")[0];
      const cutoff30d = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      // animal_scores / weights / animal_certifications / applications são tabelas
      // denormalizadas e NÃO possuem client_id — o vínculo com o cliente é sempre
      // via animal_id. Buscamos primeiro os IDs do rebanho ativo do cliente e
      // filtramos as demais tabelas por .in("animal_id", ids) (mesmo padrão do dossiê).
      // Obs.: o dado semeado usa status "Ativo"/"Vendido" (PT capitalizado); "active"
      // (inglês) zerava a contagem por não existir na base.
      const { data: animalRows, error: animalErr } = await db
        .from("animals")
        .select("id")
        .eq("client_id", clientId)
        .eq("status", "Ativo");
      if (animalErr) console.error("[dashboard-stats] animals:", animalErr.message);
      const animalIds = (animalRows ?? []).map(a => a.id);
      const totalAnimals = animalIds.length;

      const [
        { data: scoreRows, error: scoreErr },
        { data: weightRows, error: weightErr },
        { data: halalRows, error: halalErr },
        { data: carenciaRows, error: carenciaErr },
        { data: fieldsData, error: fieldsErr },
        { data: shipmentsData, error: shipmentsErr },
      ] = await Promise.all([
        db.from("animal_scores").select("total_score").in("animal_id", animalIds),
        db.from("weights").select("animal_id, weight, weighing_date").in("animal_id", animalIds).order("weighing_date", { ascending: false }).limit(500),
        db.from("animal_certifications").select("animal_id").in("animal_id", animalIds).ilike("certification_name", "%Halal%").eq("status", "active"),
        db.from("applications").select("animal_id").in("animal_id", animalIds).gte("withdrawal_date", today),
        db.from("crop_fields").select("id, status").eq("client_id", clientId).in("status", ["plantado", "em_desenvolvimento"]),
        db.from("crop_shipments").select("id, quantity_tons, status").eq("client_id", clientId),
      ]);

      // supabase-js não lança em erro de schema — só logando evitamos que uma nova
      // deriva de coluna volte a zerar leituras silenciosamente.
      for (const [label, err] of [
        ["animal_scores", scoreErr], ["weights", weightErr],
        ["animal_certifications", halalErr], ["applications", carenciaErr],
        ["crop_fields", fieldsErr], ["crop_shipments", shipmentsErr],
      ] as const) {
        if (err) console.error(`[dashboard-stats] ${label}:`, err.message);
      }

      // Score médio
      const scores = (scoreRows ?? []).map(r => Number(r.total_score ?? 0)).filter(s => s > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Peso médio e animais sem pesagem nos últimos 30d
      const latestWeightByAnimal = new Map<string, { weight: number; date: string }>();
      for (const w of (weightRows ?? [])) {
        if (!latestWeightByAnimal.has(w.animal_id))
          latestWeightByAnimal.set(w.animal_id, { weight: Number(w.weight), date: w.weighing_date ?? "" });
      }
      const allWeights = Array.from(latestWeightByAnimal.values());
      const avgWeight = allWeights.length > 0
        ? Math.round(allWeights.reduce((s, w) => s + w.weight, 0) / allWeights.length)
        : 0;
      const comPesagem30d = allWeights.filter(w => w.date >= cutoff30d).length;
      const semPesagem30d = Math.max(0, (totalAnimals ?? 0) - comPesagem30d);

      // Agri KPIs
      const ships = (shipmentsData ?? []) as { id: string; quantity_tons: number; status: string }[];
      const activeShips = ships.filter(s => s.status !== "entregue");

      return {
        totalAnimals: totalAnimals ?? 0,
        avgScore,
        avgWeight,
        semPesagem30d,
        halalCount: (halalRows ?? []).length,
        carenciasAtivas: (carenciaRows ?? []).length,
        agriKpis: {
          talhoesEmProducao: (fieldsData ?? []).length,
          embarcamentosAtivos: activeShips.length,
          toneladasTransito: activeShips.reduce((s, sh) => s + Number(sh.quantity_tons), 0),
        },
      };
    },
    [`dashboard-stats-${clientId}`],
    { revalidate: CACHE_TTL }
  );

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 60, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: clientData } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
  if (!clientData) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const stats = await fetchHerdStats(clientData.id)();

  return NextResponse.json({ ok: true, stats, cached_at: new Date().toISOString() });
}
