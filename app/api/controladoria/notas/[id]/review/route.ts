/**
 * POST /api/controladoria/notas/[id]/review
 * Muda status de uma NF-e para reviewed ou rejected.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const rl = checkRateLimit(req, 60, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, reason } = body;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }
  if (action === "reject" && !reason?.trim()) {
    return NextResponse.json({ error: "reason required for rejection" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "reviewed" : "rejected";
  const update: Record<string, string> = { status: newStatus };
  if (action === "reject") update.rejection_reason = reason!.trim();

  const { error } = await supabase
    .from("fiscal_invoices")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
