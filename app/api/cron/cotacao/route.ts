import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel calls this route daily at 11:00 UTC (08:00 BRT)
// Authorization header is checked to prevent unauthorized calls
export const dynamic = "force-dynamic";

const INDICATORS = ["boi_gordo", "bezerro", "vaca_gorda", "novilho_precoce"] as const;

// CEPEA indicator IDs (arroba, R$/@ from esalq.usp.br API)
const CEPEA_IDS: Record<string, number> = {
  boi_gordo:      2,  // Boi gordo ESALQ/BM&FBovespa
  bezerro:       14,  // Bezerro (MS)
  vaca_gorda:    31,  // Vaca gorda (MS)
  novilho_precoce: 35, // Novilho precoce (MS)
};

async function fetchCepeaPrice(indicatorId: number): Promise<number | null> {
  try {
    const url = `https://cepea.esalq.usp.br/br/widget/json/d/?q=${indicatorId}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Agraas-Platform/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // CEPEA widget returns: { data: [{ "0": "price", "1": "date" }, ...] }
    const rows = json?.data ?? json?.["cepea-consulta"]?.item ?? [];
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first) return null;
    // Price may be in key "0", "preco", or "valor"
    const raw = first["0"] ?? first["preco"] ?? first["valor"] ?? null;
    if (raw == null) return null;
    const parsed = parseFloat(String(raw).replace(",", "."));
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Record<string, number | null> = {};

  for (const key of INDICATORS) {
    const price = await fetchCepeaPrice(CEPEA_IDS[key]);
    results[key] = price;

    if (price != null) {
      await db
        .from("platform_settings")
        .upsert(
          { key: `cotacao_${key}`, value: String(price), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
    }
  }

  // Update last_updated timestamp
  await db
    .from("platform_settings")
    .upsert(
      { key: "cotacao_updated_at", value: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  console.log("[cron/cotacao]", new Date().toISOString(), results);

  return NextResponse.json({ ok: true, results, ts: new Date().toISOString() });
}
