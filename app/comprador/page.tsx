import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import CompradorView from "@/app/components/CompradorView";

export default async function CompradorPage() {
  // ── Auth check ────────────────────────────────────────────────────────────
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientData } = await authClient
    .from("clients")
    .select("id, name, role, email")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientData || clientData.role !== "buyer") redirect("/");

  // ── Service client (bypasses RLS) ────────────────────────────────────────
  const db = createSupabaseServiceClient();

  // ── Lotes vinculados ao buyer ─────────────────────────────────────────────
  const { data: accessRows } = await db
    .from("lot_buyer_access")
    .select("lot_id")
    .eq("buyer_client_id", clientData.id);

  const lotIds = (accessRows ?? []).map((r: { lot_id: string }) => r.lot_id);

  const { data: lotsData } = lotIds.length
    ? await db
        .from("lots")
        .select("id, name, objective, pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, numero_contrato, status")
        .in("id", lotIds)
    : { data: [] };

  const lots = lotsData ?? [];

  // ── Animais dos lotes ─────────────────────────────────────────────────────
  const { data: assignData } = lotIds.length
    ? await db
        .from("animal_lot_assignments")
        .select("animal_id, lot_id")
        .in("lot_id", lotIds)
    : { data: [] };

  const assignments = assignData ?? [];
  const animalIds = [...new Set(assignments.map((a: { animal_id: string }) => a.animal_id))];

  const { data: animalsData } = animalIds.length
    ? await db
        .from("animals")
        .select("id, internal_code, nickname, sex, breed, birth_date")
        .in("id", animalIds)
    : { data: [] };

  // ── Certificações ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const { data: certsData } = animalIds.length
    ? await db
        .from("animal_certifications")
        .select("animal_id, certification_name, status, expires_at")
        .in("animal_id", animalIds)
        .neq("status", "expired")
    : { data: [] };

  // ── Carências ativas ──────────────────────────────────────────────────────
  const { data: appsData } = animalIds.length
    ? await db
        .from("applications")
        .select("animal_id, product_name, withdrawal_date")
        .in("animal_id", animalIds)
        .gt("withdrawal_date", today)
    : { data: [] };

  // ── Scores ────────────────────────────────────────────────────────────────
  const { data: scoresData } = animalIds.length
    ? await db
        .from("agraas_master_passport_cache")
        .select("animal_id, score_json")
        .in("animal_id", animalIds)
    : { data: [] };

  // ── Shipment tracking ─────────────────────────────────────────────────────
  const { data: trackingData } = lotIds.length
    ? await db
        .from("shipment_tracking")
        .select("lot_id, stage, timestamp, animals_confirmed, animals_lost, loss_cause, location_name")
        .in("lot_id", lotIds)
        .order("timestamp", { ascending: true })
    : { data: [] };

  return (
    <CompradorView
      buyerName={clientData.name}
      lots={lots}
      assignments={assignments}
      animals={animalsData ?? []}
      certifications={certsData ?? []}
      activeWithdrawals={appsData ?? []}
      scores={scoresData ?? []}
      trackingCheckpoints={trackingData ?? []}
    />
  );
}
