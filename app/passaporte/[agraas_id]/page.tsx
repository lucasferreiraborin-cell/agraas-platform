import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import PublicPassportView from "./PublicPassportView";
import { checkRateLimitByIp } from "@/lib/rate-limit";

type PageProps = { params: Promise<{ agraas_id: string }> };

// Estágio produtivo a partir da conta contábil (CPC 29, migration 150).
function stageFromContaContabil(conta: string | null | undefined): string | null {
  if (!conta) return null;
  if (conta.startsWith("1.1.06.03")) return "Cria";
  if (conta.startsWith("1.1.06.02")) return "Recria";
  if (conta.startsWith("1.1.06.01")) return "Engorda";
  if (conta.startsWith("1.2.01.01")) return "Matriz";
  if (conta.startsWith("1.2.01.02")) return "Reprodutor";
  return null;
}

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
    .select("id, agraas_id, internal_code, nickname, sex, breed, birth_date, status, current_property_id, rfid_device_type, conta_contabil")
    .eq("agraas_id", agraas_id)
    .single();

  if (!animal) notFound();

  // Estágio produtivo derivado da conta contábil (CPC 29 — classificação limpa,
  // não do campo `category` que tem vocabulário misto). Cria/Recria/Engorda para
  // animais de crescimento; matriz/reprodutor para plantel.
  const stage = stageFromContaContabil(animal.conta_contabil);

  // Dados paralelos
  const [
    { data: passportCache },
    { data: propertyData },
    { data: certsData },
    { data: applicationsData },
    { data: weightsData },
    { data: photoData },
  ] = await Promise.all([
    supabase.from("agraas_master_passport_cache")
      .select("score_json")
      .eq("animal_id", animal.id)
      .single(),

    animal.current_property_id
      ? supabase.from("properties").select("name, city, state, lat, lng").eq("id", animal.current_property_id).single()
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

    supabase.from("animal_photos")
      .select("storage_path")
      .eq("animal_id", animal.id)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  // Photo signed URL (1h expiry)
  const photoPath = photoData?.[0]?.storage_path ?? null;
  const photoUrl = photoPath
    ? (await supabase.storage.from("animal-photos").createSignedUrl(photoPath, 3600)).data?.signedUrl ?? null
    : null;

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
        rfid_device_type: (animal.rfid_device_type ?? "brinco_auricular") as import("@/lib/passport-i18n").RfidDeviceType,
      }}
      property={propertyData ?? null}
      stage={stage}
      score={score}
      certifications={certsData ?? []}
      sanitaryHistory={sanitaryHistory}
      latestWeight={latestWeight}
      generatedAt={generatedAt}
      photoUrl={photoUrl}
    />
  );
}
