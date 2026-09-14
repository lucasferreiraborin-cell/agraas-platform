/**
 * POST /api/migrate-animals/recalculate — recalcula o Score v3 de vários
 * animais depois de uma importação.
 *
 * AUTH-04 (raio-x 14/09/2026): EXECUTE do RPC está revogado para
 * `authenticated`; roda com a service key, mas SÓ para os ids que a RLS
 * confirma como do cliente — o corpo pode trazer qualquer uuid.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POR_CHAMADA = 500;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  let body: { animal_ids?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Corpo inválido" }, { status: 400 }); }
  const pedidos = Array.isArray(body.animal_ids)
    ? [...new Set(body.animal_ids.filter((x): x is string => typeof x === "string" && UUID_RE.test(x)))]
    : [];
  if (pedidos.length === 0) return Response.json({ error: "animal_ids obrigatório" }, { status: 400 });
  if (pedidos.length > MAX_POR_CHAMADA) return Response.json({ error: `Máximo ${MAX_POR_CHAMADA} animais por chamada` }, { status: 400 });

  // Só o que a RLS devolve é do cliente.
  const { data: meus } = await supabase.from("animals").select("id").in("id", pedidos);
  const ids = (meus ?? []).map(a => a.id as string);

  const service = createSupabaseServiceClient();
  let recalculated = 0;
  const falhas: string[] = [];
  for (const id of ids) {
    const { error } = await service.rpc("calculate_agraas_score_v3", { p_animal_id: id });
    if (error) falhas.push(`${id.slice(0, 8)}: ${error.message}`); else recalculated++;
  }

  return Response.json({ recalculated, ignorados: pedidos.length - ids.length, falhas });
}
