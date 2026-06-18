/**
 * Cron diário 7h BRT — pré-gera insights para todos os clientes ativos por persona.
 *
 * Estratégia: roda em background com pequeno delay entre clients para não estourar
 * rate limit da Anthropic. Persiste em daily_insights — UI consome o cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateInsights, persistInsights } from "@/lib/insights/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const auth = req.headers.get("authorization") ?? "";
  return Boolean(process.env.CRON_SECRET) && auth === `Bearer ${process.env.CRON_SECRET}`;
}

const PERSONA_BY_ROLE: Record<string, "produtor" | "frigorifico" | "banco"> = {
  client: "produtor",
  buyer: "frigorifico",
  bank: "banco",
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ranAt = new Date().toISOString();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: clients } = await db.from("clients").select("id, role").in("role", ["client", "buyer", "bank"]);
  if (!clients) {
    return NextResponse.json({ ok: false, error: "Sem clientes" });
  }

  let okCount = 0;
  let emptyCount = 0;
  let errCount = 0;
  const details: Array<{ client_id: string; persona: string; bullets: number; status: string }> = [];

  for (const c of clients) {
    const persona = PERSONA_BY_ROLE[c.role];
    if (!persona) continue;
    try {
      const insights = await generateInsights(persona, c.id);
      await persistInsights(insights, []);
      if (insights.bullets.length === 0) emptyCount++;
      else okCount++;
      details.push({ client_id: c.id, persona, bullets: insights.bullets.length, status: "ok" });
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      errCount++;
      details.push({
        client_id: c.id,
        persona,
        bullets: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  await db.from("platform_jobs_log").insert({
    job_name: "generate_insights",
    status: errCount === 0 ? "ok" : okCount > 0 ? "partial" : "failed",
    details: { ok: okCount, empty: emptyCount, errors: errCount, items: details },
    ran_at: ranAt,
  });

  return NextResponse.json({
    ok: true,
    ran_at: ranAt,
    ok_count: okCount,
    empty_count: emptyCount,
    error_count: errCount,
  });
}
