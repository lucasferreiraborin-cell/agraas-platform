/**
 * POST /api/recalculate-score — recalcula o Score v3 de um animal do cliente.
 *
 * AUTH-04 (raio-x 14/09/2026): as migrations 155/156 revogaram EXECUTE de
 * calculate_agraas_score_v3 para `authenticated` — a chamada com o client de
 * cookies falhava sempre. A posse continua verificada pela RLS (o SELECT do
 * animal só devolve o que é do cliente); o RPC roda com a service key.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 50, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  let body: { animalId?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Corpo inválido" }, { status: 400 }); }
  const animalId = (body.animalId ?? "").trim();
  if (!UUID_RE.test(animalId)) return Response.json({ ok: false, error: "animalId inválido" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, error: "Não autenticado" }, { status: 401 });

  // Posse via RLS: se não é do cliente, não aparece.
  const { data: animalCheck } = await supabase.from("animals").select("id").eq("id", animalId).maybeSingle();
  if (!animalCheck) return Response.json({ ok: false, error: "Animal não encontrado" }, { status: 404 });

  const { data: score, error } = await createSupabaseServiceClient()
    .rpc("calculate_agraas_score_v3", { p_animal_id: animalId });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, score });
}
