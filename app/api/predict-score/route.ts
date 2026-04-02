import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { withApiSentry } from "@/lib/with-sentry";
import { z } from "zod";

export const runtime = "nodejs";

// ── Zod schemas ───────────────────────────────────────────────────────────────
const GetQuerySchema = z.object({
  animalId: z.string().uuid("animalId deve ser um UUID válido"),
});

const PostBodySchema = z.object({
  animalId: z.string().uuid("animalId deve ser um UUID válido"),
  force: z.boolean().optional().default(false),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// ── GET — return cached prediction ────────────────────────────────────────────
export const GET = withApiSentry(async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 60, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const parsed = GetQuerySchema.safeParse({ animalId: req.nextUrl.searchParams.get("animalId") });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { animalId } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("animal_id", animalId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ cached: false });
  return NextResponse.json({ cached: true, prediction: data });
});

// ── POST — generate (or force-refresh) prediction ─────────────────────────────
export const POST = withApiSentry(async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const bodyRaw = await req.json().catch(() => ({}));
  const bodyParsed = PostBodySchema.safeParse(bodyRaw);
  if (!bodyParsed.success) return NextResponse.json({ error: bodyParsed.error.issues[0].message }, { status: 400 });
  const { animalId, force } = bodyParsed.data;

  const supabase = await createSupabaseServerClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check cache (skip when force=true)
  if (!force) {
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data: cached } = await supabase
      .from("ai_predictions")
      .select("*")
      .eq("animal_id", animalId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) return NextResponse.json({ cached: true, prediction: cached });
  }

  // Fetch animal context in parallel
  const [animalRes, weightsRes, appsRes, certsRes, eventsRes] = await Promise.all([
    supabase
      .from("animals")
      .select("id, agraas_id, internal_code, nickname, breed, sex, birth_date, status, client_id")
      .eq("id", animalId)
      .single(),
    supabase
      .from("weight_records")
      .select("weight_kg, recorded_at")
      .eq("animal_id", animalId)
      .order("recorded_at", { ascending: false })
      .limit(5),
    supabase
      .from("sanitary_applications")
      .select("product_name, application_date, product_type, withdrawal_period_days")
      .eq("animal_id", animalId)
      .gte("application_date", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("application_date", { ascending: false }),
    supabase
      .from("animal_certifications")
      .select("certification_name, status, issued_at, expires_at")
      .eq("animal_id", animalId)
      .eq("status", "active"),
    supabase
      .from("events")
      .select("event_type, description, event_date, notes")
      .eq("animal_id", animalId)
      .gte("event_date", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("event_date", { ascending: false })
      .limit(20),
  ]);

  if (animalRes.error || !animalRes.data) {
    return NextResponse.json({ error: "Animal not found" }, { status: 404 });
  }

  const animal = animalRes.data;

  // Build prompt
  const weights = (weightsRes.data ?? []).map(
    w => `${w.recorded_at}: ${w.weight_kg} kg`
  );
  const applications = (appsRes.data ?? []).map(
    a => `${a.application_date}: ${a.product_name} (type: ${a.product_type ?? "?"}, withdrawal: ${a.withdrawal_period_days ?? "?"}d)`
  );
  const certs = (certsRes.data ?? []).map(
    c => `${c.certification_name} (active, expires: ${c.expires_at ?? "no expiry"})`
  );
  const events = (eventsRes.data ?? []).map(
    e => `${e.event_date} [${e.event_type}]: ${e.description ?? ""}`
  );

  const birthDate = animal.birth_date ?? "unknown";
  const ageMs = animal.birth_date ? Date.now() - new Date(animal.birth_date).getTime() : null;
  const ageMonths = ageMs ? Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.44)) : null;

  const prompt = `You are an expert livestock health analyst for an agritech platform. Analyze the following animal data and return a JSON prediction.

ANIMAL:
- ID: ${animal.agraas_id}
- Breed: ${animal.breed ?? "unknown"}
- Sex: ${animal.sex ?? "unknown"}
- Birth date: ${birthDate} (${ageMonths ? `${ageMonths} months old` : "age unknown"})
- Status: ${animal.status ?? "unknown"}

WEIGHT RECORDS (last 5, newest first):
${weights.length > 0 ? weights.join("\n") : "No weight records"}

SANITARY APPLICATIONS (last 12 months):
${applications.length > 0 ? applications.join("\n") : "No applications"}

ACTIVE CERTIFICATIONS:
${certs.length > 0 ? certs.join("\n") : "None"}

RECENT EVENTS (last 6 months):
${events.length > 0 ? events.join("\n") : "No events"}

Based on this data, provide a risk assessment and recommendations. Consider:
1. Weight progression and growth rate adequacy for breed/age
2. Sanitary compliance, active withdrawal periods, vaccination gaps
3. Certification status and upcoming expirations
4. Recent health or management events

Respond ONLY with valid JSON in this exact format:
{
  "risk_level": "low" | "medium" | "high",
  "alerts": ["alert 1", "alert 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "predicted_score_30d": <integer 0-100>,
  "reasoning": "<1-2 sentence summary>"
}

Rules:
- risk_level "high" only for active health issues, withdrawal violations, or expired critical certs
- risk_level "medium" for suboptimal growth, upcoming cert expirations within 30 days, or gaps in sanitary records
- predicted_score_30d should reflect expected Agraas score in 30 days based on trends
- Maximum 3 alerts and 3 recommendations
- Write in English`;

  let prediction: {
    risk_level: "low" | "medium" | "high";
    alerts: string[];
    recommendations: string[];
    predicted_score_30d: number;
    reasoning?: string;
  };

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    // Extract JSON from response (may have surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    prediction = JSON.parse(jsonMatch[0]);

    // Validate
    if (!["low", "medium", "high"].includes(prediction.risk_level)) {
      prediction.risk_level = "medium";
    }
    if (!Array.isArray(prediction.alerts)) prediction.alerts = [];
    if (!Array.isArray(prediction.recommendations)) prediction.recommendations = [];
    if (
      typeof prediction.predicted_score_30d !== "number" ||
      prediction.predicted_score_30d < 0 ||
      prediction.predicted_score_30d > 100
    ) {
      prediction.predicted_score_30d = 50;
    }
  } catch (err) {
    console.error("Claude prediction failed:", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
  }

  // Save to cache
  const { data: saved, error: saveErr } = await supabase
    .from("ai_predictions")
    .insert({
      animal_id: animalId,
      client_id: animal.client_id,
      risk_level: prediction.risk_level,
      alerts: prediction.alerts,
      recommendations: prediction.recommendations,
      predicted_score_30d: prediction.predicted_score_30d,
    })
    .select()
    .single();

  if (saveErr) {
    console.error("Failed to save prediction:", saveErr);
    // Return prediction anyway, just not cached
    return NextResponse.json({ cached: false, prediction: { ...prediction, animal_id: animalId } });
  }

  return NextResponse.json({ cached: false, prediction: saved });
});
