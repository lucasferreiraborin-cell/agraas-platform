import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import PublicPassportView from "./PublicPassportView";
import { checkRateLimitByIp } from "@/lib/rate-limit";

type PageProps = { params: Promise<{ agraas_id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agraas_id } = await params;
  return {
    title: `Passaporte Animal ${agraas_id} — Agraas`,
    description: "Passaporte pecuário com rastreabilidade completa e certificações verificadas.",
    robots: "noindex",
  };
}

export default async function PublicPassportPage({ params }: PageProps) {
  const { agraas_id } = await params;

  // Rate limit: 30 req/min por IP
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? hdrs.get("x-real-ip") ?? "unknown";
  const rl = checkRateLimitByIp(ip, `/passaporte/${agraas_id}`, 30, 60_000);
  if (!rl.allowed) {
    return (
      <main style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "2rem" }}>429 — Too Many Requests</h1>
        <p>Muitas requisições. Tente novamente em {rl.retryAfter} segundos.</p>
      </main>
    );
  }

  const supabase = createSupabaseServiceClient();
  const today = new Date();
  const twelveMonthsAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

  // Busca animal pelo agraas_id
  const { data: animal } = await supabase
    .from("animals")
    .select("id, agraas_id, internal_code, nickname, sex, breed, birth_date, status, current_property_id")
    .eq("agraas_id", agraas_id)
    .single();

  if (!animal) notFound();

  // Dados paralelos
  const [
    { data: passportCache },
    { data: propertyData },
    { data: certsData },
    { data: applicationsData },
    { data: weightsData },
  ] = await Promise.all([
    supabase.from("agraas_master_passport_cache")
      .select("score_json")
      .eq("animal_id", animal.id)
      .single(),

    animal.current_property_id
      ? supabase.from("properties").select("name").eq("id", animal.current_property_id).single()
      : Promise.resolve({ data: null }),

    supabase.from("animal_certifications")
      .select("certification_name, issued_at, expires_at, status")
      .eq("animal_id", animal.id),

    supabase.from("applications")
      .select("product_name, application_date")
      .eq("animal_id", animal.id)
      .gte("application_date", twelveMonthsAgo)
      .order("application_date", { ascending: false }),

    supabase.from("weights")
      .select("weight, weighing_date")
      .eq("animal_id", animal.id)
      .order("weighing_date", { ascending: false })
      .limit(1),
  ]);

  const score: number = passportCache?.score_json?.total_score ?? 0;
  const latestWeight = weightsData?.[0] ? Number(weightsData[0].weight) : null;
  const generatedAt = today.toLocaleDateString("pt-BR");

  // Filtra apenas aplicações com product_name (campo novo da migration 014)
  const sanitaryHistory = (applicationsData ?? [])
    .filter((a: any) => a.product_name)
    .map((a: any) => ({ product_name: a.product_name as string, application_date: a.application_date }));

  return (
    <PublicPassportView
      animal={{
        agraas_id: animal.agraas_id,
        internal_code: animal.internal_code,
        nickname: animal.nickname ?? null,
        sex: animal.sex,
        breed: animal.breed,
        birth_date: animal.birth_date,
        status: animal.status,
      }}
      property={propertyData ?? null}
      score={score}
      certifications={certsData ?? []}
      sanitaryHistory={sanitaryHistory}
      latestWeight={latestWeight}
      generatedAt={generatedAt}
    />
  );
}
