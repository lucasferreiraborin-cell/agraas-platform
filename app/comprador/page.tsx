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

  // ── Ovinos / Caprinos (todas as espécies — service client, sem RLS) ────────
  const { data: livestockData } = await db
    .from("livestock_species")
    .select("id, species, breed, birth_date, internal_code, score, certifications, status")
    .in("species", ["ovino", "caprino"]);

  // ── Lotes avícolas ─────────────────────────────────────────────────────────
  const { data: poultryData } = await db
    .from("poultry_batches")
    .select("id, batch_code, species, breed, current_count, mortality_count, initial_count, feed_conversion, status, halal_certified, integrator_name")
    .order("housing_date", { ascending: false });

  // ── Agricultura — embarques + tracking + fazendas ─────────────────────────
  const { data: grainShipmentsData } = await db
    .from("crop_shipments")
    .select("id, contract_number, culture, quantity_tons, destination_country, destination_port, origin_port, vessel_name, departure_date, arrival_date, status, field_id")
    .order("departure_date", { ascending: true });

  const { data: grainTrackingData } = await db
    .from("crop_shipment_tracking")
    .select("shipment_id, stage, stage_date, quantity_confirmed_tons, quantity_lost_tons")
    .order("stage_date", { ascending: false });

  const { data: grainFarmsData } = await db
    .from("farms_agriculture")
    .select("id, name, car_number");

  const { data: grainFieldsData } = await db
    .from("crop_fields")
    .select("id, farm_id, culture");

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
      livestockAnimals={livestockData ?? []}
      poultryBatches={poultryData ?? []}
      grainShipments={grainShipmentsData ?? []}
      grainTracking={grainTrackingData ?? []}
      grainFarms={grainFarmsData ?? []}
      grainFields={grainFieldsData ?? []}
    />
  );
}
