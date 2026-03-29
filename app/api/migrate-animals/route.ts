import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

type Row = Record<string, string>;

type ImportPayload = {
  rows: Row[];
  mapping: Record<string, string>; // agraasField -> csvHeader
};

export type ImportResult = {
  created: number;
  updated: number;
  weights_created: number;
  errors: Array<{ row: number; field: string; message: string }>;
  animal_ids: string[];
};

function normalizeSex(v: string): string | null {
  const n = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (["m", "macho", "male", "masculino"].includes(n)) return "Male";
  if (["f", "femea", "female", "feminino"].includes(n)) return "Female";
  return null;
}

function normalizeDate(v: string): string | null {
  v = v.trim();
  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { data: clientData } = await supabase
    .from("clients").select("id").eq("auth_user_id", user.id).single();
  if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

  const clientId = clientData.id;
  const { rows, mapping }: ImportPayload = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: "Nenhum registro enviado" }, { status: 400 });
  }
  if (!mapping.internal_code) {
    return Response.json({ error: "Campo 'código do animal' não mapeado" }, { status: 400 });
  }

  // Carrega todos os animais existentes desse cliente para lookup
  const { data: existing } = await supabase
    .from("animals").select("id, internal_code").eq("client_id", clientId);
  const existingMap = new Map<string, string>(); // internal_code -> uuid
  for (const a of existing ?? []) {
    if (a.internal_code) existingMap.set(a.internal_code, a.id);
  }

  const result: ImportResult = {
    created: 0, updated: 0, weights_created: 0,
    errors: [], animal_ids: [],
  };

  const today = new Date().toISOString().split("T")[0];

  const get = (row: Row, field: string) => {
    const h = mapping[field];
    return h ? (row[h] ?? "").trim() : "";
  };

  // ── Passagem 1: UPSERT de animais ─────────────────────────
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const internalCode = get(row, "internal_code");
    if (!internalCode) {
      result.errors.push({ row: rowNum, field: "internal_code", message: "Código do animal ausente" });
      continue;
    }

    const animalData: Record<string, unknown> = { client_id: clientId, internal_code: internalCode };

    const nickname = get(row, "nickname");
    if (nickname) animalData.nickname = nickname;

    const sexRaw = get(row, "sex");
    if (sexRaw) {
      const sex = normalizeSex(sexRaw);
      if (sex) animalData.sex = sex;
      else result.errors.push({ row: rowNum, field: "sex", message: `Sexo não reconhecido: "${sexRaw}" — campo ignorado` });
    }

    const breed = get(row, "breed");
    if (breed) animalData.breed = breed;

    const birthRaw = get(row, "birth_date");
    if (birthRaw) {
      const d = normalizeDate(birthRaw);
      if (d) animalData.birth_date = d;
      else result.errors.push({ row: rowNum, field: "birth_date", message: `Data inválida: "${birthRaw}" — campo ignorado` });
    }

    const status = get(row, "status");
    if (status) animalData.status = status;

    let animalId: string;

    if (existingMap.has(internalCode)) {
      animalId = existingMap.get(internalCode)!;
      const { client_id: _c, ...updateData } = animalData; // não atualiza client_id
      const { error } = await supabase
        .from("animals").update(updateData).eq("id", animalId).eq("client_id", clientId);
      if (error) {
        result.errors.push({ row: rowNum, field: "animal", message: error.message });
        continue;
      }
      result.updated++;
    } else {
      const { data: newAnimal, error } = await supabase
        .from("animals").insert(animalData).select("id").single();
      if (error || !newAnimal) {
        result.errors.push({ row: rowNum, field: "animal", message: error?.message ?? "Erro ao criar" });
        continue;
      }
      animalId = newAnimal.id;
      existingMap.set(internalCode, animalId);
      result.created++;
    }

    result.animal_ids.push(animalId);

    // Peso
    const weightRaw = get(row, "weight");
    if (weightRaw) {
      const weight = parseFloat(weightRaw.replace(",", "."));
      if (!isNaN(weight) && weight > 0) {
        const { error: we } = await supabase.from("weights").insert({
          animal_id: animalId, weight, weighing_date: today,
        });
        if (we) result.errors.push({ row: rowNum, field: "weight", message: we.message });
        else result.weights_created++;
      } else {
        result.errors.push({ row: rowNum, field: "weight", message: `Peso inválido: "${weightRaw}"` });
      }
    }

    // RFID
    const rfid = get(row, "rfid");
    if (rfid) {
      await supabase.from("animal_rfids")
        .upsert({ animal_id: animalId, rfid_code: rfid }, { onConflict: "animal_id", ignoreDuplicates: false });
    }
  }

  // ── Passagem 2: resolve pai/mãe (após todos os animais inseridos) ──
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const internalCode = get(row, "internal_code");
    if (!internalCode) continue;
    const animalId = existingMap.get(internalCode);
    if (!animalId) continue;

    const sireCode = get(row, "sire_code");
    const damCode = get(row, "dam_code");
    if (!sireCode && !damCode) continue;

    const update: Record<string, string> = {};
    if (sireCode && existingMap.has(sireCode)) update.sire_animal_id = existingMap.get(sireCode)!;
    if (damCode && existingMap.has(damCode)) update.dam_animal_id = existingMap.get(damCode)!;

    if (Object.keys(update).length > 0) {
      await supabase.from("animals").update(update).eq("id", animalId);
    }
  }

  return Response.json(result);
}
