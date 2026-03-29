import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { animal_ids }: { animal_ids: string[] } = await req.json();
  if (!Array.isArray(animal_ids) || animal_ids.length === 0) {
    return Response.json({ error: "animal_ids obrigatório" }, { status: 400 });
  }

  let recalculated = 0;
  for (const id of animal_ids) {
    const { error } = await supabase.rpc("calculate_agraas_score", { p_animal_id: id });
    if (!error) recalculated++;
  }

  return Response.json({ recalculated });
}
