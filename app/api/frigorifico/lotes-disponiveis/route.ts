/**
 * Endpoint agregador para Persona Frigorífico — Oportunidades.
 *
 * Lista lotes ABERTOS (status='active', sem buyer vinculado em lot_buyer_access)
 * com score quali+quanti agregado, flags de compliance (EUDR/GTA/SIF/sanitário)
 * e origem rastreada. Tudo dados não-sensíveis: serve pra frigorífico decidir
 * abrir conversa formal com o produtor.
 *
 * Auth: requer client.role IN ('buyer', 'admin'). NÃO expõe CPF/CNPJ nem
 * ear tag bruto. Dados granulares só após contrato.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { LoteOfertadoCard } from "@/lib/personas";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clientData } = await auth
    .from("clients")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientData || !["buyer", "admin"].includes(clientData.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createSupabaseServiceClient();

  // Lotes ativos sem buyer fixo (oportunidades abertas)
  const { data: lots } = await db
    .from("lots")
    .select(`
      id, name, objective, status, target_weight,
      pais_destino, porto_embarque, data_embarque,
      certificacoes_exigidas, property_id, client_id,
      created_at
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!lots || lots.length === 0) {
    return NextResponse.json({ ok: true, lotes: [] });
  }

  const lotIds = lots.map((l) => l.id);
  const propertyIds = [...new Set(lots.map((l) => l.property_id).filter(Boolean))];

  // Quais lotes JÁ têm buyer vinculado (filtra pra mostrar só os realmente abertos)
  const { data: existingAccess } = await db
    .from("lot_buyer_access")
    .select("lot_id")
    .in("lot_id", lotIds);

  const fechados = new Set((existingAccess ?? []).map((a) => a.lot_id));
  const lotesAbertos = lots.filter((l) => !fechados.has(l.id));
  if (lotesAbertos.length === 0) return NextResponse.json({ ok: true, lotes: [] });

  const abertosIds = lotesAbertos.map((l) => l.id);

  // Propriedades (origem)
  const { data: props } = await db
    .from("properties")
    .select("id, name, city, state")
    .in("id", propertyIds);
  const propsMap = new Map((props ?? []).map((p) => [p.id, p]));

  // Animais nos lotes
  const { data: assignments } = await db
    .from("animal_lot_assignments")
    .select("animal_id, lot_id")
    .in("lot_id", abertosIds);

  const lotToAnimals = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    if (!lotToAnimals.has(a.lot_id)) lotToAnimals.set(a.lot_id, []);
    lotToAnimals.get(a.lot_id)!.push(a.animal_id);
  }
  const allAnimalIds = [...new Set((assignments ?? []).map((a) => a.animal_id))];

  // Scores v3 por animal
  const { data: animalScores } = allAnimalIds.length
    ? await db
        .from("animal_scores")
        .select("animal_id, total_score")
        .eq("algorithm_version", "v3")
        .in("animal_id", allAnimalIds)
    : { data: [] };
  const scoreMap = new Map((animalScores ?? []).map((s) => [s.animal_id, Number(s.total_score)]));

  // Certificações vigentes
  const today = new Date().toISOString().split("T")[0];
  const { data: certs } = allAnimalIds.length
    ? await db
        .from("animal_certifications")
        .select("animal_id, certification_name, status, expires_at")
        .in("animal_id", allAnimalIds)
        .neq("status", "expired")
    : { data: [] };

  const certsByAnimal = new Map<string, string[]>();
  for (const c of certs ?? []) {
    if (c.expires_at && c.expires_at < today) continue;
    if (!certsByAnimal.has(c.animal_id)) certsByAnimal.set(c.animal_id, []);
    certsByAnimal.get(c.animal_id)!.push(c.certification_name);
  }

  // Carências ativas (sanitário NOK se algum animal em carência)
  const { data: carencias } = allAnimalIds.length
    ? await db
        .from("applications")
        .select("animal_id")
        .in("animal_id", allAnimalIds)
        .gt("withdrawal_date", today)
    : { data: [] };
  const animaisEmCarencia = new Set((carencias ?? []).map((c) => c.animal_id));

  // NF-e emitida por animal (sales com fiscal_invoice_id preenchido)
  type SaleNfeRow = { animal_id: string; fiscal_invoice_id: string | null };
  let nfeByAnimal: Set<string> = new Set();
  try {
    const { data: salesNfe } = allAnimalIds.length
      ? await db
          .from("sales")
          .select("animal_id, fiscal_invoice_id")
          .in("animal_id", allAnimalIds)
          .not("fiscal_invoice_id", "is", null)
      : { data: [] };
    nfeByAnimal = new Set((salesNfe ?? []).map((s: SaleNfeRow) => s.animal_id));
  } catch { /* tabela ou coluna ainda não existe */ }

  // Monta cards
  const cards: LoteOfertadoCard[] = lotesAbertos.map((lot) => {
    const animalIds = lotToAnimals.get(lot.id) ?? [];
    const scores = animalIds.map((id) => scoreMap.get(id)).filter((s): s is number => typeof s === "number");
    const scoreMedio = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const certsLote = new Set<string>();
    let sanitarioOk = true;
    let gtaCount = 0;
    let nfeCount = 0;
    for (const aid of animalIds) {
      const animalCerts = certsByAnimal.get(aid) ?? [];
      animalCerts.forEach((c) => certsLote.add(c));
      if (animaisEmCarencia.has(aid)) sanitarioOk = false;
      // GTA vigente por animal (cert com nome contendo "GTA")
      if (animalCerts.some((c) => c.toUpperCase().includes("GTA"))) gtaCount++;
      if (nfeByAnimal.has(aid)) nfeCount++;
    }

    const prop = propsMap.get(lot.property_id);
    const exigidas = (lot.certificacoes_exigidas ?? []) as string[];

    const cartonaEUDR = Boolean(prop?.city && prop?.state); // proxy: origem rastreada

    return {
      lot_id: lot.id,
      lot_name: lot.name,
      pais_destino: lot.pais_destino ?? null,
      porto_embarque: lot.porto_embarque ?? null,
      data_embarque: lot.data_embarque ?? null,
      status: lot.status,
      animals_count: animalIds.length,
      score_medio_lote: Number(scoreMedio.toFixed(1)),
      gta_count: gtaCount,
      nfe_emitida: nfeCount,
      compliance: {
        eudr_ready: cartonaEUDR,
        gta_vigente: certsLote.has("GTA") || gtaCount > 0,
        sif_disponivel: certsLote.has("SIF") || exigidas.includes("SIF"),
        halal_disponivel: certsLote.has("Halal"),
        sanitario_ok: sanitarioOk,
      },
      origem: {
        propriedade_nome: prop?.name ?? "—",
        municipio: prop?.city ?? null,
        uf: prop?.state ?? null,
      },
    };
  });

  return NextResponse.json({ ok: true, lotes: cards, total: cards.length });
}
