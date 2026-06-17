/**
 * Endpoint para produtor conceder/revogar acesso ao dossiê pra uma instituição financeira.
 *
 * Auth: requer produtor (role 'client' ou 'admin').
 * Body: { relationshipId: string, granted: boolean }
 *
 * Audit: cada toggle persiste granted_at/granted_by_producer.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clientData } = await auth
    .from("clients")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientData) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.relationshipId !== "string" || typeof body.granted !== "boolean") {
    return NextResponse.json({ error: "relationshipId + granted requeridos" }, { status: 400 });
  }

  // RLS já protege: política bpr_producer_update só permite se producer_client_id === get_my_client_id()
  const { data, error } = await auth
    .from("bank_producer_relationships")
    .update({ granted_by_producer: body.granted })
    .eq("id", body.relationshipId)
    .eq("producer_client_id", clientData.id)
    .select("id, bank_client_id, granted_by_producer, granted_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Falha ao atualizar relacionamento", detail: error?.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, relationship: data });
}
