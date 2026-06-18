/**
 * Endpoint de Insights por persona.
 *
 * GET /api/insights/produtor   → retorna cache do dia para o client do user
 * GET /api/insights/frigorifico
 * GET /api/insights/banco
 *
 * Se cache ausente, gera on-demand (sob rate limit) e persiste.
 * Disparo proativo: cron /api/cron/generate-insights às 7h BRT.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { generateInsights, persistInsights } from "@/lib/insights/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_PERSONAS = ["produtor", "frigorifico", "banco"] as const;

type Params = { params: Promise<{ persona: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { persona } = await params;
  if (!VALID_PERSONAS.includes(persona as typeof VALID_PERSONAS[number])) {
    return NextResponse.json({ error: "Persona inválida" }, { status: 400 });
  }

  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clientData } = await auth
    .from("clients")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientData) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const today = new Date().toISOString().split("T")[0];
  const db = createSupabaseServiceClient();

  const { data: cached } = await db
    .from("daily_insights")
    .select("*")
    .eq("persona", persona)
    .eq("client_id", clientData.id)
    .eq("insight_date", today)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({
      persona,
      client_id: clientData.id,
      bullets: cached.bullets,
      generated_at: cached.generated_at,
      cached: true,
    });
  }

  // Gerar on-demand
  try {
    const insights = await generateInsights(
      persona as "produtor" | "frigorifico" | "banco",
      clientData.id,
    );
    await persistInsights(insights, []);
    return NextResponse.json({ ...insights, cached: false });
  } catch (err) {
    console.error("[insights] geração falhou:", err);
    return NextResponse.json(
      { error: "Falha ao gerar insights", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
