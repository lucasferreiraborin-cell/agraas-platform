import { supabase } from "@/lib/supabase";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
  birth_date: string | null;
  sex: string | null;
  breed: string | null;
  current_property_id: string | null;
  status: string | null;
  category: string | null;
  blood_type: string | null;
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
  batch_id: string | null;
  dose: number | null;
  application_date: string | null;
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
  animal_id: string | null;
  event_type?: string | null;
  type?: string | null;
  event_timestamp?: string | null;
  event_date?: string | null;
  notes?: string | null;
  description?: string | null;
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
};

export default async function AnimalPassaportePage({ params }: PageProps) {
  const { id } = await params;

  const [
    { data: passportData, error: passportError },
    { data: animalData, error: animalError },
    { data: propertiesData },
    { data: applicationsData },
    { data: productsData },
    { data: batchesData },
    { data: animalEventsData },
    { data: farmEventsData },
    { data: weightsData },
    { data: movementsData },
  ] = await Promise.all([
    supabase
      .from("agraas_master_passport_cache")
      .select("*")
      .eq("animal_id", id)
      .single(),

    supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single(),

    supabase.from("properties").select("id, name"),

    supabase
      .from("applications")
      .select("id, animal_id, product_id, batch_id, dose, application_date, created_at")
      .eq("animal_id", id)
      .order("application_date", { ascending: false }),

    supabase.from("products").select("id, name"),

    supabase.from("stock_batches").select("id, batch_number"),

    supabase
      .from("animal_events")
      .select("*")
      .eq("animal_id", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("farm_events")
      .select("*")
      .eq("animal_id", id)
      .order("event_date", { ascending: false }),

    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date, notes")
      .eq("animal_id", id)
      .order("weighing_date", { ascending: false }),

    supabase
      .from("animal_movements")
      .select("id, animal_id, movement_type, origin_ref, destination_ref, movement_date, notes")
      .eq("animal_id", id)
      .order("movement_date", { ascending: false }),
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
  const animalEvents = (animalEventsData ?? []) as EventRow[];
  const farmEvents = (farmEventsData ?? []) as EventRow[];
  const weights = (weightsData ?? []) as WeightRow[];
  const movements = (movementsData ?? []) as MovementRow[];

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

  const sanitaryHistory: SanitaryHistoryRow[] = applications.map((application) => ({
    id: application.id,
    product_name: application.product_id
      ? productMap.get(application.product_id) ?? "Produto"
      : "Produto",
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
        ? productMap.get(application.product_id) ?? "Produto"
        : "Produto"
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

  const timelineAnimalEvents: TimelineRow[] = animalEvents.map((event, index) => ({
    id: `animal-event-${index}-${event.event_date ?? event.event_timestamp ?? "sem-data"}`,
    title: formatEventType(event.event_type ?? event.type ?? ""),
    description: event.notes ?? event.description ?? "Evento registrado.",
    date: event.event_date ?? event.event_timestamp ?? null,
    badge: `${getEventIcon(event.event_type ?? event.type ?? "")} ${formatEventType(
      event.event_type ?? event.type ?? ""
    )}`,
  }));

  const timelineFarmEvents: TimelineRow[] = farmEvents.map((event, index) => ({
    id: `farm-event-${index}-${event.event_date ?? event.event_timestamp ?? "sem-data"}`,
    title: formatEventType(event.type ?? event.event_type ?? ""),
    description: event.description ?? event.notes ?? "Evento operacional registrado.",
    date: event.event_date ?? event.event_timestamp ?? null,
    badge: `${getEventIcon(event.type ?? event.event_type ?? "")} ${formatEventType(
      event.type ?? event.event_type ?? ""
    )}`,
  }));

  const timeline = [
    ...timelineApplications,
    ...timelineWeights,
    ...timelineMovements,
    ...timelineAnimalEvents,
    ...timelineFarmEvents,
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

  const calculatedSanitaryScore =
    score.sanitary_score ?? calculateSanitaryScore(applications.length);

  const calculatedOperationalScore =
    score.operational_score ??
    calculateOperationalScore(movements.length, animalEvents.length + farmEvents.length);

  const calculatedContinuityScore =
    score.continuity_score ??
    calculateContinuityScore(
      weights.length,
      Boolean(birthDate),
      Boolean(animal.agraas_id)
    );

  const calculatedAgraasScore =
    Number(score.total_score ?? 0) > 0
      ? Number(score.total_score)
      : calculateAgraasScore({
          lastWeight: latestWeight,
          applicationsCount: applications.length,
          eventsCount: animalEvents.length + farmEvents.length,
          weightsCount: weights.length,
          ageMonths,
          hasBloodType: Boolean(animal.blood_type),
          hasGenealogy: Boolean(animal.sire_animal_id || animal.dam_animal_id),
          sanitaryScore: Number(calculatedSanitaryScore ?? 0),
          operationalScore: Number(calculatedOperationalScore ?? 0),
          continuityScore: Number(calculatedContinuityScore ?? 0),
        });

  const scorePercent = Math.max(
    6,
    Math.min(100, Math.round(Number(calculatedAgraasScore ?? 0)))
  );

  return (
    <main className="space-y-8">
      <Link
        href="/animais"
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Animais
      </Link>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid xl:grid-cols-[1.05fr_0.95fr]">
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
                  Passaporte digital consolidado do animal.
                </p>

                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Agraas ID:{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {animal.agraas_id ?? "-"}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <HighlightIdentityCard
                label="Agraas ID"
                value={animal.agraas_id ?? "-"}
                subtitle="identidade digital única do animal"
              />

              <HighlightIdentityCard
                label="Nascimento"
                value={formatDate(birthDate)}
                subtitle={
                  ageMonths !== null
                    ? `${ageMonths} meses de idade`
                    : "idade não disponível"
                }
              />
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
                value={animal.sire_animal_id || animal.dam_animal_id ? "Mapeada" : "-"}
                subtitle="pai e mãe vinculados"
              />
            </div>
          </div>

          <div className="border-l border-[var(--border)] bg-[var(--surface-soft)] p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Agraas score
            </p>

            <div className="mt-6 rounded-3xl border bg-white p-6 shadow">
              <p className="text-sm text-[var(--text-muted)]">Score consolidado</p>

              <p className="mt-2 text-5xl font-semibold text-[var(--primary-hover)]">
                {calculatedAgraasScore}
              </p>

              <div className="mt-5 h-3 w-full rounded-full bg-[rgba(93,156,68,0.10)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f,#5d9c44)]"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                {Number(score.total_score ?? 0) > 0
                  ? "Score proveniente do passaporte consolidado"
                  : "Score calculado dinamicamente a partir de peso, histórico e integridade cadastral"}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Propriedade" value={displayProperty} />
              <SnapshotCard label="Lote atual" value={displayLot} />
              <SnapshotCard label="Último peso" value={latestWeight ? `${latestWeight} kg` : "-"} />
              <SnapshotCard label="Carência até" value={formatDate(sanitary.withdrawal_end_date)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <ScoreCard label="Sanitário" value={calculatedSanitaryScore} />
        <ScoreCard label="Operacional" value={calculatedOperationalScore} />
        <ScoreCard label="Continuidade" value={calculatedContinuityScore} />
        <ScoreCard label="Total" value={calculatedAgraasScore} />
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

          <span className="ag-badge ag-badge-dark">
            {timeline.length} registros
          </span>
        </div>

        <div className="mt-8">
          {timeline.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento encontrado para este animal.
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="ag-badge ag-badge-green">{item.badge}</span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {formatDateTime(item.date)}
                    </span>
                  </div>

                  <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="ag-card p-8">
        <h2 className="ag-section-title">Cadeia produtiva</h2>

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
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
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
    <div className="rounded-3xl border p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="ag-card p-6">
      <p className="ag-kpi-label">{label}</p>
      <p className="mt-4 ag-kpi-value">{value ?? "-"}</p>
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
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
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
    <div>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-base font-medium">{value}</p>
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

function calculateSanitaryScore(applicationsCount: number) {
  return Math.min(100, 50 + applicationsCount * 8);
}

function calculateOperationalScore(movementsCount: number, eventsCount: number) {
  return Math.min(100, 45 + movementsCount * 6 + eventsCount * 2);
}

function calculateContinuityScore(
  weightsCount: number,
  hasBirthDate: boolean,
  hasAgraasId: boolean
) {
  let scoreValue = 40;
  scoreValue += Math.min(30, weightsCount * 8);
  if (hasBirthDate) scoreValue += 15;
  if (hasAgraasId) scoreValue += 15;
  return Math.min(100, scoreValue);
}

function calculateAgraasScore({
  lastWeight,
  applicationsCount,
  eventsCount,
  weightsCount,
  ageMonths,
  hasBloodType,
  hasGenealogy,
  sanitaryScore,
  operationalScore,
  continuityScore,
}: {
  lastWeight: number | null;
  applicationsCount: number;
  eventsCount: number;
  weightsCount: number;
  ageMonths: number | null;
  hasBloodType: boolean;
  hasGenealogy: boolean;
  sanitaryScore: number;
  operationalScore: number;
  continuityScore: number;
}) {
  const productive =
    lastWeight && lastWeight > 0
      ? Math.min(100, 35 + Math.round(lastWeight / 10))
      : 35;

  const ageFactor =
    ageMonths !== null ? Math.min(100, 40 + Math.round(ageMonths / 2)) : 50;

  const traceabilityBonus = (hasBloodType ? 3 : 0) + (hasGenealogy ? 4 : 0);

  return Math.min(
    100,
    Math.round(
      productive * 0.28 +
        sanitaryScore * 0.24 +
        operationalScore * 0.18 +
        continuityScore * 0.20 +
        ageFactor * 0.10 +
        traceabilityBonus
    )
  );
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