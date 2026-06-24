/**
 * Sprint B — Persona Frigorífico — Oportunidades.
 *
 * Lista lotes disponíveis no marketplace para frigoríficos avaliarem
 * antes de iniciar conversa formal com o produtor. Score quali+quanti
 * agregado por lote, badges de compliance (EUDR/GTA/SIF/sanitário),
 * origem rastreada. Dados não-sensíveis — sem CPF/CNPJ, sem ear tag bruto.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import Link from "next/link";
import PersonaShell from "@/app/components/personas/PersonaShell";
import type { LoteOfertadoCard } from "@/lib/personas";
import { scoreClassification } from "@/lib/personas";
import { requirePersona, FRIGORIFICO_ROUTES } from "@/lib/persona-resolver";
import { ArrowRight, ShieldCheck, AlertCircle, MapPin, Calendar, Beef } from "lucide-react";

export const dynamic = "force-dynamic";

async function fetchLotesAbertos(): Promise<LoteOfertadoCard[]> {
  const db = createSupabaseServiceClient();
  const today = new Date().toISOString().split("T")[0];

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
    .limit(30);

  if (!lots || lots.length === 0) return [];

  const lotIds = lots.map((l) => l.id);
  const propertyIds = [...new Set(lots.map((l) => l.property_id).filter(Boolean))] as string[];

  const { data: existingAccess } = await db
    .from("lot_buyer_access")
    .select("lot_id")
    .in("lot_id", lotIds);
  const fechados = new Set((existingAccess ?? []).map((a) => a.lot_id));
  const lotesAbertos = lots.filter((l) => !fechados.has(l.id));
  if (lotesAbertos.length === 0) return [];

  const abertosIds = lotesAbertos.map((l) => l.id);

  const { data: props } = await db
    .from("properties")
    .select("id, name, city, state")
    .in("id", propertyIds);
  const propsMap = new Map((props ?? []).map((p) => [p.id, p]));

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

  const { data: animalScores } = allAnimalIds.length
    ? await db
        .from("animal_scores")
        .select("animal_id, total_score")
        .eq("algorithm_version", "v3")
        .in("animal_id", allAnimalIds)
    : { data: [] };
  const scoreMap = new Map((animalScores ?? []).map((s) => [s.animal_id, Number(s.total_score)]));

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

  const { data: carencias } = allAnimalIds.length
    ? await db
        .from("applications")
        .select("animal_id")
        .in("animal_id", allAnimalIds)
        .gt("withdrawal_date", today)
    : { data: [] };
  const animaisEmCarencia = new Set((carencias ?? []).map((c) => c.animal_id));

  // Sales com fiscal_invoice_id por animal (NF-e venda emitida — Sprint I migration 140)
  type SaleNfeRow = { animal_id: string; fiscal_invoice_id: string | null };
  let nfeByAnimal = new Set<string>();
  try {
    const { data: salesNfe } = allAnimalIds.length
      ? await db
          .from("sales")
          .select("animal_id, fiscal_invoice_id")
          .in("animal_id", allAnimalIds)
          .not("fiscal_invoice_id", "is", null)
      : { data: [] };
    nfeByAnimal = new Set((salesNfe ?? []).map((s: SaleNfeRow) => s.animal_id));
  } catch { /* schema antigo, ignora */ }

  return lotesAbertos.map((lot) => {
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
      if (animalCerts.some((c) => c.toUpperCase().includes("GTA"))) gtaCount++;
      if (nfeByAnimal.has(aid)) nfeCount++;
    }

    const prop = propsMap.get(lot.property_id);
    const exigidas = (lot.certificacoes_exigidas ?? []) as string[];

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
        eudr_ready: Boolean(prop?.city && prop?.state),
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
}

export default async function OportunidadesPage() {
  const ctx = await requirePersona(FRIGORIFICO_ROUTES);
  const lotes = await fetchLotesAbertos();

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
          <header className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
              Oportunidades · Lotes disponíveis
            </div>
            <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
              Lotes ofertados no marketplace
            </h1>
            <p className="text-[--text-secondary] mt-3 max-w-2xl">
              Lotes ativos disponíveis pra avaliação. Score médio agregado de Embrapa Doc 237,
              compliance EUDR + GTA + sanitário, origem rastreada por município/CAR.
              Dados granulares só após contrato formal com o produtor.
            </p>
          </header>

          {lotes.length === 0 ? (
            <div className="ag-card p-12 text-center">
              <div className="text-[--text-secondary]">
                Nenhum lote aberto no momento. Lotes ativos com vínculo prévio aparecem em
                <Link href="/comprador" className="text-[--primary] hover:underline mx-1">Visão Geral</Link>.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {lotes.map((lote) => {
                const cls = scoreClassification(lote.score_medio_lote);
                const complianceCount = Object.values(lote.compliance).filter(Boolean).length;
                return (
                  <article key={lote.lot_id} className="ag-card-strong p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">
                          Lote
                        </div>
                        <h3 className="text-xl font-semibold text-[--text-primary] mt-0.5">
                          {lote.lot_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-[--text-secondary] mt-2">
                          <MapPin size={14} />
                          <span>
                            {lote.origem.propriedade_nome}
                            {lote.origem.municipio && (
                              <> · {lote.origem.municipio}/{lote.origem.uf}</>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-3xl font-bold leading-none"
                          style={{ color: cls.color }}
                        >
                          {lote.score_medio_lote.toFixed(0)}
                        </div>
                        <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: cls.color }}>
                          {cls.label}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/8">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">Animais</div>
                        <div className="flex items-center gap-1.5 text-[--text-primary] font-semibold mt-1">
                          <Beef size={14} className="text-[--text-secondary]" />
                          {lote.animals_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">Destino</div>
                        <div className="text-[--text-primary] font-medium mt-1 truncate">
                          {lote.pais_destino ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">Embarque</div>
                        <div className="flex items-center gap-1.5 text-[--text-primary] font-medium mt-1">
                          <Calendar size={14} className="text-[--text-secondary]" />
                          {lote.data_embarque
                            ? new Date(lote.data_embarque).toLocaleDateString("pt-BR")
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[--text-muted] mb-2">
                        Compliance ({complianceCount}/5)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <ComplianceBadge label="EUDR" ok={lote.compliance.eudr_ready} />
                        <ComplianceBadge
                          label={lote.gta_count && lote.gta_count > 0 ? `GTA ${lote.gta_count}/${lote.animals_count}` : "GTA"}
                          ok={lote.compliance.gta_vigente}
                        />
                        <ComplianceBadge label="SIF" ok={lote.compliance.sif_disponivel} />
                        <ComplianceBadge label="Sanitário" ok={lote.compliance.sanitario_ok} />
                        <ComplianceBadge label="Halal" ok={lote.compliance.halal_disponivel} optional />
                      </div>
                      {lote.nfe_emitida !== undefined && lote.nfe_emitida > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <ComplianceBadge
                            label={`NF-e pronta ${lote.nfe_emitida}/${lote.animals_count}`}
                            ok={true}
                          />
                        </div>
                      )}
                    </div>

                    <button className="ag-button-primary mt-2 flex items-center justify-center gap-2">
                      Solicitar contato com produtor
                      <ArrowRight size={14} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
      </div>
    </PersonaShell>
  );
}

function ComplianceBadge({ label, ok, optional = false }: { label: string; ok: boolean; optional?: boolean }) {
  const Icon = ok ? ShieldCheck : AlertCircle;
  const bg = ok
    ? "bg-green-500/10 border-green-500/30 text-green-300"
    : optional
    ? "bg-white/5 border-white/10 text-white/40"
    : "bg-amber-500/10 border-amber-500/30 text-amber-300";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium ${bg}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
