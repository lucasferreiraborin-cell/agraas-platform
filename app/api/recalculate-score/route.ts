import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { animalId } = await req.json();
  if (!animalId) return new Response("animalId obrigatório", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: score, error } = await supabase.rpc("calculate_agraas_score", {
    p_animal_id: animalId,
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, score });
}
