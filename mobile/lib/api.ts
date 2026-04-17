import { supabase } from "./supabase";

export type AnimalBasic = {
  id: string;
  internal_code: string | null;
  nickname: string | null;
  breed: string | null;
  sex: string | null;
  score?: number | null;
};

export async function findAnimal(code: string): Promise<AnimalBasic | null> {
  // Try internal_code first, then agraas_id
  const { data } = await supabase
    .from("animals")
    .select("id, internal_code, nickname, breed, sex")
    .or(`internal_code.ilike.%${code}%,agraas_id.ilike.%${code}%`)
    .limit(1)
    .single();

  if (!data) return null;

  const { data: scoreData } = await supabase
    .from("animal_scores")
    .select("total_score")
    .eq("animal_id", data.id)
    .single();

  return { ...data, score: scoreData?.total_score ?? null };
}

export async function registerWeight(animalId: string, weight: number) {
  const { error } = await supabase.from("weights").insert({
    animal_id: animalId,
    weight,
    weighing_date: new Date().toISOString().split("T")[0],
  });
  if (error) throw new Error(error.message);
}

export async function registerApplication(
  animalId: string,
  productName: string,
  dose: number,
  unit: string
) {
  const { error } = await supabase.from("applications").insert({
    animal_id: animalId,
    product_name: productName,
    dose,
    unit,
    application_date: new Date().toISOString().split("T")[0],
    operator_name: "Agraas Campo",
  });
  if (error) throw new Error(error.message);
}

export async function registerEvent(
  animalId: string,
  eventType: string,
  notes: string
) {
  const { error } = await supabase.from("events").insert({
    animal_id: animalId,
    source: "animal",
    event_type: eventType,
    event_date: new Date().toISOString(),
    notes,
  });
  if (error) throw new Error(error.message);
}

export async function registerMovement(
  animalId: string,
  destination: string
) {
  const { error } = await supabase.from("animal_movements").insert({
    animal_id: animalId,
    movement_type: "ownership_transfer",
    origin_ref: "Campo atual",
    destination_ref: destination,
    movement_date: new Date().toISOString().split("T")[0],
    notes: "Registrado via Agraas Campo",
  });
  if (error) throw new Error(error.message);
}

export async function getStockProducts() {
  const { data } = await supabase
    .from("stock_batches")
    .select("id, batch_number, quantity, product:products(name)")
    .gt("quantity", 0)
    .order("batch_number");
  return data ?? [];
}

export async function getProperties() {
  const { data } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");
  return data ?? [];
}
