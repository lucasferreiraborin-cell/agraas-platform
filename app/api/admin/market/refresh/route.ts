/**
 * Bridge admin-only para disparar refresh de mercado manualmente.
 * Reutiliza refreshAllSignals() — sem expor CRON_SECRET ao client.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { refreshAllSignals } from "@/lib/market-intelligence";
import { roleToPersona } from "@/lib/persona-themes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clientData } = await auth
    .from("clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientData || roleToPersona(clientData.role) !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const result = await refreshAllSignals();
  return NextResponse.json(result);
}
