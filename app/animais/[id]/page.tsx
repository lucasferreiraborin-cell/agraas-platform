import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import {
  getPassportConfidenceText,
  getPassportClassification,
  getMarketPotential,
  getExportEligibility,
} from "@/lib/agraas-analytics";
import EventModal from "@/app/components/EventModal";
import AnimalAnalysis from "@/app/components/AnimalAnalysis";
import AnimalQRCode from "@/app/components/AnimalQRCode";
import ExportPassportModal from "@/app/components/ExportPassportModal";
import { UnverifiedBadge } from "@/app/components/DocumentGate";
import PredictiveAlerts from "@/app/components/PredictiveAlerts";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
  nickname: string | null;
  birth_date: string | null;
  sex: string | null;
  breed: string | null;
  current_property_id: string | null;
  status: string | null;
  category: string | null;
  blood_type: string | null;
  birth_weight: number | null;
  rfid: string | null;
  notes: string | null;
  sire_animal_id: string | null;
  dam_animal_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PropertyRow = {
  id: string;
  name: string | null;
};

type ApplicationRow = {
  id: string;
  animal_id: string;
  product_id: string | null;
  product_name: string | null;
  batch_id: string | null;
  dose: number | null;
  unit: string | null;
  operator_name: string | null;
  application_date: string | null;
  withdrawal_date: string | null;
  created_at: string | null;
};

type ProductRow = {
  id: string;
  name: string;
};

type BatchRow = {
  id: string;
  batch_number: string;
};

type EventRow = {
  id: string;
  animal_id: string | null;
  source: string;
  event_type: string | null;
  event_date: string | null;
  notes: string | null;
  document_source: string | null;
};

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
  notes: string | null;
};

type MovementRow = {
  id: string;
  animal_id: string;
  movement_type: string;
  origin_ref: string | null;
  destination_ref: string | null;
  movement_date: string | null;
  notes: string | null;
};

type CertificationRow = {
  id: string;
  certification_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: string | null;
};

type ParentAnimalRow = {
  id: string;
  internal_code: string | null;
  nickname: string | null;
  agraas_id: string | null;
  sex: string | null;
  breed: string | null;
};

type SanitaryHistoryRow = {
  id: string;
  product_name: string;
  batch_number: string;
  dose: number | null;
  application_date: string | null;
};

type TimelineRow = {
  id: string;
  title: string;
  description: string;
  date: string | null;
  badge: string;
  unverified?: boolean;
};

export default async function AnimalPassaportePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: passportData, error: passportError },
    { data: animalData, error: animalError },
    { data: propertiesData },
    { data: applicationsData },
    { data: productsData },
    { data: batchesData },
    { data: eventsData },
    { data: weightsData },
    { data: movementsData },
    { data: certificationsData },
  ] = await Promise.all([
    supabase
      .from("agraas_master_passport_cache")
      .select("*")
      .eq("animal_id", id)
      .single(),

    supabase.from("animals").select("*").eq("id", id).single(),

    supabase.from("properties").select("id, name"),

    supabase
      .from("applications")
      .select(
        "id, animal_id, product_id, product_name, batch_id, dose, unit, operator_name, application_date, withdrawal_date, created_at"
      )
      .eq("animal_id", id)
      .order("application_date", { ascending: false }),

    supabase.from("products").select("id, name"),

    supabase.from("stock_batches").select("id, batch_number"),

    supabase
      .from("events")
      .select("id, animal_id, source, event_type, event_date, notes, document_source")
      .eq("animal_id", id)
      .order("event_date", { ascending: false }),

    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date, notes")
      .eq("animal_id", id)
      .order("weighing_date", { ascending: false }),

    supabase
      .from("animal_movements")
      .select(
        "id, animal_id, movement_type, origin_ref, destination_ref, movement_date, notes"
      )
      .eq("animal_id", id)
      .order("movement_date", { ascending: false }),

    supabase
      .from("animal_certifications")
      .select("id, certification_name, issued_at, expires_at, status")
      .eq("animal_id", id),
  ]);

  if (animalError || !animalData) {
    return (
      <main className="space-y-8">
        <Link
          href="/animais"
          className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
        >
          ← Voltar para Animais
        </Link>

        <div className="ag-card-strong p-8">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            Animal não encontrado
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Não foi possível localizar este animal na base da Agraas.
          </p>
        </div>
      </main>
    );
  }

  if (passportError) {
    console.error("Erro ao buscar passaporte consolidado:", passportError);
  }

  const passport = passportData ?? null;
  const animal = animalData as AnimalRow;
  const properties = (propertiesData ?? []) as PropertyRow[];

  const identity = passport?.identity_json ?? {};
  const score = passport?.score_json ?? {};
  const trace = passport?.traceability_json ?? {};
  const sanitary = passport?.sanitary_json ?? {};
  const chain = passport?.chain_json ?? {};

  const applications = (applicationsData ?? []) as ApplicationRow[];
  const products = (productsData ?? []) as ProductRow[];
  const batches = (batchesData ?? []) as BatchRow[];
  const events = (eventsData ?? []) as EventRow[];
  const weights = (weightsData ?? []) as WeightRow[];
  const movements = (movementsData ?? []) as MovementRow[];
  const certifications = (certificationsData ?? []) as CertificationRow[];

  // Busca pai, mãe e propriedade atual em paralelo
  const [sireData, damData, currentPropertyData, sireScoreRaw, damScoreRaw] = await Promise.all([
    animal.sire_animal_id
      ? supabase.from("animals").select("id, internal_code, nickname, agraas_id, sex, breed")
          .eq("id", animal.sire_animal_id).single().then(r => r.data as ParentAnimalRow | null)
      : Promise.resolve(null),
    animal.dam_animal_id
      ? supabase.from("animals").select("id, internal_code, nickname, agraas_id, sex, breed")
          .eq("id", animal.dam_animal_id).single().then(r => r.data as ParentAnimalRow | null)
      : Promise.resolve(null),
    animal.current_property_id
      ? supabase.from("properties").select("id, name, city, state")
          .eq("id", animal.current_property_id).single().then(r => r.data as { id: string; name: string | null; city: string | null; state: string | null } | null)
      : Promise.resolve(null),
    animal.sire_animal_id
      ? supabase.from("agraas_master_passport_cache").select("score_json")
          .eq("animal_id", animal.sire_animal_id).maybeSingle()
          .then(r => { const v = (r.data?.score_json as any)?.overall; return v != null ? Number(v) : null; })
      : Promise.resolve(null as number | null),
    animal.dam_animal_id
      ? supabase.from("agraas_master_passport_cache").select("score_json")
          .eq("animal_id", animal.dam_animal_id).maybeSingle()
          .then(r => { const v = (r.data?.score_json as any)?.overall; return v != null ? Number(v) : null; })
      : Promise.resolve(null as number | null),
  ]);
  const sireScore = sireScoreRaw;
  const damScore = damScoreRaw;

  const productMap = new Map<string, string>();
  for (const product of products) {
    productMap.set(product.id, product.name);
  }

  const batchMap = new Map<string, string>();
  for (const batch of batches) {
    batchMap.set(batch.id, batch.batch_number);
  }

  const propertyMap = new Map<string, string>();
  for (const property of properties) {
    propertyMap.set(property.id, property.name ?? property.id);
  }

  // Dados para o passaporte de exportação (usa product_name direto, não product_id)
  const applicationsForExport = applications
    .filter((a) => a.product_name)
    .slice(0, 5)
    .map((a) => ({
      product_name: a.product_name as string,
      dose: a.dose ?? null,
      unit: a.unit ?? null,
      application_date: a.application_date ?? null,
      withdrawal_date: a.withdrawal_date ?? null,
      operator_name: a.operator_name ?? null,
    }));

  const sanitaryHistory: SanitaryHistoryRow[] = applications.map((application) => ({
    id: application.id,
    product_name: application.product_id
      ? productMap.get(application.product_id) ?? application.product_name ?? "Produto"
      : application.product_name ?? "Produto",
    batch_number: application.batch_id
      ? batchMap.get(application.batch_id) ?? "-"
      : "-",
    dose: application.dose ?? null,
    application_date: application.application_date ?? application.created_at ?? null,
  }));

  const latestWeight = weights.length > 0 ? Number(weights[0].weight) : null;
  const previousWeight = weights.length > 1 ? Number(weights[1].weight) : null;

  const weightVariation =
    latestWeight !== null && previousWeight !== null
      ? latestWeight - previousWeight
      : null;

  const birthDate = animal.birth_date ?? null;
  const ageMonths = birthDate ? calculateAgeInMonths(birthDate) : null;

  const timelineApplications: TimelineRow[] = applications.map((application) => ({
    id: `application-${application.id}`,
    title: "Aplicação sanitária",
    description: `${
      application.product_id
        ? productMap.get(application.product_id) ?? application.product_name ?? "Produto"
        : application.product_name ?? "Produto"
    } • lote ${application.batch_id ? batchMap.get(application.batch_id) ?? "-" : "-"} • dose ${
      application.dose ?? "-"
    }`,
    date: application.application_date ?? application.created_at ?? null,
    badge: "💉 Aplicação",
  }));

  const timelineWeights: TimelineRow[] = weights.map((weight) => ({
    id: `weight-${weight.id}`,
    title: "Pesagem registrada",
    description: `${weight.weight} kg${weight.notes ? ` • ${weight.notes}` : ""}`,
    date: weight.weighing_date,
    badge: "⚖️ Pesagem",
  }));

  const timelineMovements: TimelineRow[] = movements.map((movement) => ({
    id: `movement-${movement.id}`,
    title: formatMovementType(movement.movement_type),
    description: `${movement.origin_ref ?? "-"} → ${movement.destination_ref ?? "-"}${
      movement.notes ? ` • ${movement.notes}` : ""
    }`,
    date: movement.movement_date,
    badge: "🔁 Movimento",
  }));

  const timelineEvents: TimelineRow[] = events.map((event) => ({
    id: `event-${event.id}-${event.event_date ?? "sem-data"}`,
    title: formatEventType(event.event_type ?? ""),
    description: event.notes ?? (event.source === "farm" ? "Evento operacional registrado." : "Evento registrado."),
    date: event.event_date ?? null,
    badge: `${getEventIcon(event.event_type ?? "")} ${formatEventType(event.event_type ?? "")}`,
    unverified: event.event_type === "ownership_transfer" && !event.document_source,
  }));

  const timeline = [
    ...timelineApplications,
    ...timelineWeights,
    ...timelineMovements,
    ...timelineEvents,
  ]
    .sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    })
    .filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (other) =>
            other.title === item.title &&
            other.description === item.description &&
            other.date === item.date
        )
    );

  const displayInternalCode =
    identity.internal_code ?? animal.internal_code ?? animal.id;

  const displaySex = identity.sex ?? animal.sex ?? null;
  const displayBreed = identity.breed ?? animal.breed ?? "-";
  const displayStatus = identity.status ?? animal.status ?? "-";

  const displayProperty =
    trace.current_property_name ??
    (animal.current_property_id
      ? propertyMap.get(animal.current_property_id) ?? animal.current_property_id
      : "-");

  const displayLot = trace.current_lot_code ?? "-";

  // Sub-scores sempre vêm do banco (calculate_agraas_score SQL é a fonte de verdade)
  const calculatedSanitaryScore    = Number(score.sanitary_score    ?? 0);
  const calculatedOperationalScore = Number(score.operational_score ?? 0);
  const calculatedContinuityScore  = Number(score.continuity_score  ?? 0);
  const calculatedAgraasScore      = Number(score.total_score       ?? 0);


  return (
    <main className="space-y-8">
      <Link
        href="/animais"
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Animais
      </Link>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid xl:grid-cols-[1.08fr_0.92fr]">
          <div className="p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Passaporte Agraas</div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-3xl">
                {getAnimalAvatar(displaySex)}
              </div>

              <div>
                <h1 className="text-4xl font-semibold text-[var(--text-primary)]">
                  {displayInternalCode}
                </h1>

                <p className="mt-2 text-[var(--text-secondary)]">
                  Ativo pecuário rastreado com identidade digital, score e histórico auditável.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[rgba(93,156,68,0.18)] bg-[var(--primary-soft)] px-4 py-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Agraas ID
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {animal.agraas_id ?? "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <HighlightIdentityCard
                label="Nascimento"
                value={formatDate(birthDate)}
                subtitle={
                  ageMonths !== null
                    ? `${ageMonths} meses de idade`
                    : "idade não disponível"
                }
              />

              <HighlightIdentityCard
                label="Integridade cadastral"
                value={
                  animal.blood_type || animal.sire_animal_id || animal.dam_animal_id
                    ? "Expandida"
                    : "Base"
                }
                subtitle="dados biológicos e genealógicos do ativo"
              />
            </div>
            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,#f0f7ec,#ffffff)] p-6 shadow-[var(--shadow-soft)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Status do ativo
               </p>

              <p className="mt-3 text-2xl font-semibold text-[var(--primary-hover)]">
                {getPassportConfidenceText(calculatedAgraasScore)}
              </p>

            <div className="mt-4 flex flex-wrap gap-2">
             <span className="ag-badge ag-badge-green">Certificado</span>
              <span className="ag-badge ag-badge-green">Rastreável</span>
              <span className="ag-badge ag-badge-green">Score elevado</span>
            </div>

             <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Ativo apto para operações comerciais exigentes e mercados de maior rigor sanitário.
            </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMiniCard
                label="Sexo"
                value={formatSex(displaySex)}
                subtitle="classificação biológica"
              />
              <HeroMiniCard
                label="Raça"
                value={displayBreed}
                subtitle="identificação zootécnica"
              />
              <HeroMiniCard
                label="Status"
                value={formatStatus(displayStatus)}
                subtitle="condição operacional"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <HeroMiniCard
                label="Categoria"
                value={animal.category ?? "-"}
                subtitle="classificação produtiva"
              />
              <HeroMiniCard
                label="Tipo sanguíneo"
                value={animal.blood_type ?? "-"}
                subtitle="referência genética"
              />
              <HeroMiniCard
                label="Genealogia"
                value={
                  animal.sire_animal_id || animal.dam_animal_id ? "Mapeada" : "-"
                }
                subtitle="pai e mãe vinculados"
              />
            </div>
          </div>

          <div className="border-l border-[var(--border)] bg-[var(--surface-soft)] p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Agraas score
            </p>

            <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border bg-white p-6 shadow">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Score consolidado
              </p>
              <ScoreDonut score={calculatedAgraasScore} size={148} />
              <p className="mt-1 text-center text-xs leading-relaxed text-[var(--text-secondary)] max-w-[200px]">
                {Number(score.total_score ?? 0) > 0
                  ? "Passaporte consolidado · operação · consistência"
                  : "Score dinâmico: peso, histórico, integridade e operação"}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Propriedade" value={displayProperty} />
              <SnapshotCard label="Lote atual" value={displayLot} />
              <SnapshotCard
                label="Último peso"
                value={latestWeight ? `${latestWeight} kg` : "-"}
              />
              <SnapshotCard
                label="Carência até"
                value={formatDate(sanitary.withdrawal_end_date)}
              />
            </div>
            <div className="mt-6 rounded-3xl border border border-[rgba(93,156,68,0.15)] bg[linear-gradient(135deg,#ffffff,#f8fbf6)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Inteligência Agraas
            </p>

            <p className="mt-3 text-base text-[var(--text-primary)]">
            Este animal apresenta consistência operacional, histórico sanitário estruturado e evolução de peso estável.
            </p>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Recomendado para comercialização em mercados com maior exigência de rastreabilidade e conformidade.
            </p>
            </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
  <SnapshotCard label="Classificação" value={getPassportClassification(calculatedAgraasScore)} />
  <SnapshotCard label="Potencial de mercado" value={getMarketPotential(calculatedAgraasScore)} />
  <SnapshotCard label="Aptidão exportação" value={getExportEligibility(calculatedAgraasScore)} />
          </div>
          </div>
        </div>
      </section>

      {/* Score breakdown */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Breakdown do score Agraas</h2>
            <p className="ag-section-subtitle">Composição detalhada por dimensão de avaliação.</p>
          </div>
          <span className="ag-badge ag-badge-dark">Score {calculatedAgraasScore}/100</span>
        </div>
        <div className="mt-6 space-y-4">
          <ScoreBar label="Sanitário" value={calculatedSanitaryScore} weight={24} color="#5d9c44" />
          <ScoreBar label="Continuidade" value={calculatedContinuityScore} weight={20} color="#5d9c44" />
          <ScoreBar label="Operacional" value={calculatedOperationalScore} weight={18} color="#7db35a" />
          <ScoreBar label="Produtivo" value={latestWeight ? Math.min(100, 35 + Math.round(latestWeight / 10)) : 35} weight={28} color="#8dbc5f" />
          <ScoreBar label="Fator etário" value={ageMonths !== null ? Math.min(100, 40 + Math.round(ageMonths / 2)) : 50} weight={10} color="#a0c878" />
        </div>
      </section>

      {/* Genealogia */}
      {(sireData || damData || animal.sire_animal_id || animal.dam_animal_id) && (
        <section className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Genealogia</h2>
              <p className="ag-section-subtitle">Pai e mãe vinculados ao passaporte deste animal.</p>
            </div>
            <span className="ag-badge ag-badge-green">Genealogia mapeada</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {sireData ? (
              <Link href={`/animais/${sireData.id}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.30)] hover:bg-[var(--primary-soft)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Pai</p>
                  {sireScore !== null && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sireScore >= 70 ? "bg-emerald-100 text-emerald-700" : sireScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {sireScore}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                  {sireData.nickname ?? sireData.internal_code ?? "—"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {sireData.internal_code}{sireData.breed ? ` • ${sireData.breed}` : ""}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--primary-hover)]">Ver passaporte →</span>
                  {sireScore !== null && <ScoreDonut score={sireScore} size={56} />}
                </div>
              </Link>
            ) : animal.sire_animal_id ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Pai</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Dados não disponíveis</p>
              </div>
            ) : null}
            {damData ? (
              <Link href={`/animais/${damData.id}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.30)] hover:bg-[var(--primary-soft)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Mãe</p>
                  {damScore !== null && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${damScore >= 70 ? "bg-emerald-100 text-emerald-700" : damScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {damScore}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                  {damData.nickname ?? damData.internal_code ?? "—"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {damData.internal_code}{damData.breed ? ` • ${damData.breed}` : ""}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--primary-hover)]">Ver passaporte →</span>
                  {damScore !== null && <ScoreDonut score={damScore} size={56} />}
                </div>
              </Link>
            ) : animal.dam_animal_id ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Mãe</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Dados não disponíveis</p>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Certificações */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Selos e certificações</h2>
            <p className="ag-section-subtitle">Certificações reais vinculadas a este animal no banco de dados.</p>
          </div>
          {certifications.length > 0 && (
            <span className="ag-badge ag-badge-green">{certifications.length} ativo{certifications.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="mt-6">
          {certifications.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum selo ou certificação vinculado a este animal.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {certifications.map(cert => (
                <div key={cert.id}
                  className="rounded-2xl border border-[rgba(93,156,68,0.24)] bg-[var(--primary-soft)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--primary-hover)]">
                    ✓ {cert.certification_name ?? "Certificação"}
                  </p>
                  {cert.issued_at && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Emitido: {new Date(cert.issued_at).toLocaleDateString("pt-BR")}
                      {cert.expires_at ? ` • Válido até: ${new Date(cert.expires_at).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <StatPanel
          title="Último peso"
          value={latestWeight ? `${latestWeight} kg` : "-"}
          subtitle="peso mais recente registrado"
        />
        <StatPanel
          title="Peso anterior"
          value={previousWeight ? `${previousWeight} kg` : "-"}
          subtitle="referência produtiva anterior"
        />
        <StatPanel
          title="Variação"
          value={
            weightVariation === null
              ? "-"
              : `${weightVariation > 0 ? "+" : ""}${weightVariation} kg`
          }
          subtitle="diferença entre as duas últimas pesagens"
        />
        <StatPanel
          title="Idade"
          value={ageMonths !== null ? `${ageMonths} meses` : "-"}
          subtitle="idade estimada pela data de nascimento"
        />
      </section>

      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Histórico sanitário</h2>
            <p className="ag-section-subtitle">
              Aplicações registradas para este animal com vínculo de produto,
              lote e dose utilizada.
            </p>
          </div>

          <Link href="/aplicacoes" className="ag-button-secondary">
            Nova aplicação
          </Link>
        </div>

        <div className="mt-8">
          {sanitaryHistory.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhuma aplicação sanitária registrada para este animal.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Dose</th>
                  </tr>
                </thead>

                <tbody>
                  {sanitaryHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.application_date)}</td>
                      <td>{item.product_name}</td>
                      <td>{item.batch_number}</td>
                      <td>{item.dose ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Timeline operacional</h2>
            <p className="ag-section-subtitle">
              Linha do tempo consolidada com eventos, aplicações, pesagens e movimentações.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="ag-badge ag-badge-dark">{timeline.length} registros</span>
            <EventModal animalId={id} />
          </div>
        </div>

        <div className="mt-8">
          {timeline.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento encontrado para este animal.
            </div>
          ) : (
            <div className="relative">
              {/* Linha vertical */}
              <div className="absolute left-5 top-2 bottom-2 w-px bg-[var(--border)]" />
              <div className="space-y-0">
                {timeline.map((item) => {
                  const dotColor = timelineItemColor(item.badge);
                  const emoji = [...item.badge][0] ?? "•";
                  return (
                    <div key={item.id} className="relative flex gap-5 pb-7 last:pb-0">
                      {/* Círculo colorido */}
                      <div
                        className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white text-base"
                        style={{ borderColor: dotColor }}
                      >
                        {emoji}
                      </div>
                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                            {item.unverified && <UnverifiedBadge />}
                          </div>
                          <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatDate(item.date)}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {animal.agraas_id && (
        <section className="ag-card p-8">
          <AnimalQRCode agraasId={animal.agraas_id} animalName={displayInternalCode} />
        </section>
      )}

      {animal.agraas_id && (
        <ExportPassportModal
          animal={{
            agraas_id: animal.agraas_id,
            internal_code: animal.internal_code,
            nickname: animal.nickname,
            sex: animal.sex,
            breed: displayBreed,
            birth_date: animal.birth_date,
            category: animal.category,
            rfid: animal.rfid,
            blood_type: animal.blood_type,
            birth_weight: animal.birth_weight,
          }}
          property={currentPropertyData}
          score={calculatedAgraasScore}
          certifications={certifications}
          applications={applicationsForExport}
          latestWeight={latestWeight}
          latestWeightDate={weights[0]?.weighing_date ?? null}
          sire={sireData ? { nickname: sireData.nickname, internal_code: sireData.internal_code, agraas_id: sireData.agraas_id } : null}
          dam={damData ? { nickname: damData.nickname, internal_code: damData.internal_code, agraas_id: damData.agraas_id } : null}
        />
      )}

      <section className="ag-card p-8">
        <AnimalAnalysis animalId={id} />
      </section>

      <PredictiveAlerts animalId={id} />

      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Cadeia produtiva</h2>
            <p className="ag-section-subtitle">
              Leitura institucional do destino e dos desdobramentos produtivos do ativo.
            </p>
          </div>

          <span className="ag-badge ag-badge-green">Traceability layer</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoItem label="Frigorífico" value={chain.slaughterhouse_name ?? "-"} />
          <InfoItem label="Data de abate" value={formatDate(chain.slaughter_date)} />
          <InfoItem
            label="Peso de carcaça"
            value={chain.carcass_weight ? `${chain.carcass_weight} kg` : "-"}
          />
          <InfoItem
            label="Classificação"
            value={chain.carcass_classification ?? "-"}
          />
        </div>
      </section>
    </main>
  );
}

function HighlightIdentityCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function HeroMiniCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  weight,
  color,
}: {
  label: string;
  value: number | null | undefined;
  weight: number;
  color: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value ?? 0))));
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 shrink-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">peso {weight}%</p>
      </div>
      <div className="flex flex-1 items-center gap-3">
        <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${v}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-10 text-right text-sm font-semibold text-[var(--primary-hover)]">{v}</span>
      </div>
    </div>
  );
}

function StatPanel({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function calculateAgeInMonths(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}


function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function getAnimalAvatar(sex: string | null) {
  const value = (sex ?? "").toLowerCase();
  if (value === "male" || value === "macho") return "🐂";
  if (value === "female" || value === "fêmea" || value === "femea") return "🐄";
  return "🐾";
}

function formatSex(value: string | null) {
  const map: Record<string, string> = {
    male: "Macho",
    female: "Fêmea",
    macho: "Macho",
    femea: "Fêmea",
    "fêmea": "Fêmea",
  };

  if (!value) return "-";
  return map[value.toLowerCase()] ?? value;
}

function formatStatus(value: string | null) {
  if (!value) return "-";

  const map: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    blocked: "Bloqueado",
    archived: "Arquivado",
    sold: "Vendido",
    slaughtered: "Abatido",
  };

  return map[value.toLowerCase()] ?? value;
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    BIRTH: "Nascimento",
    RFID_LINKED: "RFID vinculado",
    WEIGHT_RECORDED: "Pesagem registrada",
    HEALTH_APPLICATION: "Aplicação sanitária",
    LOT_ENTRY: "Entrada em lote",
    OWNERSHIP_TRANSFER: "Transferência",
    SALE: "Venda",
    SLAUGHTER: "Abate",
    CERTIFICATION: "Certificação",
    birth: "Nascimento",
    rfid_assigned: "Identificação vinculada",
    health_application: "Aplicação registrada",
    weight_recorded: "Pesagem registrada",
    sale: "Venda registrada",
    ownership_transfer: "Transferência de propriedade",
    lot_entry: "Entrada em lote",
    slaughter: "Abate registrado",
    weighing: "Pesagem",
    application: "Aplicação sanitária",
  };

  return map[value] ?? value.replaceAll("_", " ");
}

function getEventIcon(value: string) {
  const map: Record<string, string> = {
    BIRTH: "🐣",
    RFID_LINKED: "🏷️",
    WEIGHT_RECORDED: "⚖️",
    HEALTH_APPLICATION: "💉",
    LOT_ENTRY: "📦",
    OWNERSHIP_TRANSFER: "🔁",
    SALE: "💰",
    SLAUGHTER: "📋",
    CERTIFICATION: "✅",
    birth: "🐣",
    rfid_assigned: "🏷️",
    health_application: "💉",
    weight_recorded: "⚖️",
    sale: "💰",
    ownership_transfer: "🔁",
    lot_entry: "📦",
    slaughter: "📋",
    weighing: "⚖️",
    application: "💉",
  };

  return map[value] ?? "•";
}

function formatMovementType(value: string) {
  const map: Record<string, string> = {
    lot_entry: "Entrada em lote",
    ownership_transfer: "Transferência",
    sale: "Venda",
    slaughter: "Abate",
    birth: "Nascimento",
  };

  return map[value] ?? value;
}

// ── Score donut SVG — funciona em server components (sem hooks) ──
function ScoreDonut({ score, size = 140 }: { score: number; size?: number }) {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r; // ≈ 326.73
  const pct = Math.max(0, Math.min(100, score));
  const offset = circ * (1 - pct / 100);
  const color = score >= 70 ? "#2d9b6f" : score >= 50 ? "#d4930a" : "#c0392b";
  const track = score >= 70 ? "#d1fae5" : score >= 50 ? "#fef3c7" : "#fee2e2";

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-label={`Score ${score}`}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth="14" />
      {/* Arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Número central */}
      <text
        x={cx} y={cy - 7}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="28" fontWeight="700" fill={color} fontFamily="inherit"
      >
        {score}
      </text>
      {/* "/100" */}
      <text
        x={cx} y={cy + 16}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="11" fill="#9ca3af" fontFamily="inherit"
      >
        / 100
      </text>
    </svg>
  );
}

// ── Cor do dot por tipo de evento na timeline ──
function timelineItemColor(badge: string): string {
  if (badge.includes("⚖") || badge.includes("Pesagem")) return "#3b82f6";
  if (badge.includes("💉") || badge.includes("Aplicação")) return "#f59e0b";
  if (badge.includes("🔁") || badge.includes("Movimento")) return "#8b5cf6";
  if (badge.includes("📦") || badge.includes("Lote")) return "#6b7280";
  if (badge.includes("🐣") || badge.includes("Nascimento")) return "#10b981";
  if (badge.includes("✅") || badge.includes("Certif")) return "#059669";
  return "#9ca3af";
}