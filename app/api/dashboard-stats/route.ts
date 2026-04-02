import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const CACHE_TTL = 300; // 5 minutos

// Cache por client_id — agrega stats pesadas do rebanho
function getHerdStats(clientId: string) {
  return unstable_cache(
    async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const [
        { count: totalAnimals },
        { data: scoreRows },
        { data: weightRows },
        { data: halalRows },
        { data: carenciaRows },
        { data: fieldsData },
        { data: shipmentsData },
      ] = await Promise.all([
        db.from("animals").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "active"),
        db.from("animal_scores").select("total_score").eq("client_id", clientId),
        db.from("weights").select("animal_id, weight, weighing_date").eq("client_id", clientId).order("weighing_date", { ascending: false }).limit(500),
        db.from("animal_certifications").select("animal_id").eq("client_id", clientId).ilike("certification_name", "%Halal%").eq("status", "active"),
        db.from("applications").select("animal_id, withdrawal_date").eq("client_id", clientId).gte("withdrawal_date", new Date().toISOString().split("T")[0]),
        db.from("crop_fields").select("id, status").eq("client_id", clientId).in("status", ["plantado", "em_desenvolvimento"]),
        db.from("crop_shipments").select("id, quantity_tons, status").eq("client_id", clientId),
      ]);

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
      const cutoff30d = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const semPesagem30d = (totalAnimals ?? 0) - allWeights.filter(w => w.date >= cutoff30d).length;

      // Agri KPIs
      const ships = (shipmentsData ?? []) as { id: string; quantity_tons: number; status: string }[];
      const activeShips = ships.filter(s => s.status !== "entregue");

      return {
        totalAnimals: totalAnimals ?? 0,
        avgScore,
        avgWeight,
        semPesagem30d: Math.max(0, semPesagem30d),
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
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 60, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: clientData } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
  if (!clientData) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const stats = await getHerdStats(clientData.id)();

  return NextResponse.json({ ok: true, stats, cached_at: new Date().toISOString() });
}
