/**
 * Cron job + manual trigger: refresh do market intelligence.
 *
 * Vercel Cron chama cada 6h via header x-vercel-cron: 1.
 * Manual via Bearer CRON_SECRET (para teste e disparo admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshAllSignals } from "@/lib/market-intelligence";
import { cronAutorizado } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// AUTH-01 (14/09): `x-vercel-cron` é forjável; só Bearer CRON_SECRET vale.
function isAuthorized(req: NextRequest): boolean {
  return cronAutorizado(req);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await refreshAllSignals();
  return NextResponse.json(result);
}
