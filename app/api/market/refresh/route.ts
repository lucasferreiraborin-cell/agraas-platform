/**
 * Cron job + manual trigger: refresh do market intelligence.
 *
 * Vercel Cron chama cada 6h via header x-vercel-cron: 1.
 * Manual via Bearer CRON_SECRET (para teste e disparo admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshAllSignals } from "@/lib/market-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const auth = req.headers.get("authorization") ?? "";
  return Boolean(process.env.CRON_SECRET) && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await refreshAllSignals();
  return NextResponse.json(result);
}
