import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import TargetArrobasEditor from "@/app/components/TargetArrobasEditor";

type PageProps = {
  params: Promise<{ id: string }>;
};

type PropertyRow = {
  id: string;
  name: string | null;
  code: string | null;
  region: string | null;
  state: string | null;
  animals_count: number | null;
  lots_count: number | null;
  status: string | null;
  profile: string | null;
  area_hectares: number | null;
  client_id: string | null;
  target_arrobas: number | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
  status: string | null;
  sex: string | null;
  breed: string | null;
  birth_date: string | null;
};

type PassportRow = {
  animal_id: string;
  score_json: { total_score?: number | null } | null;
  identity_json: {
    internal_code?: string | null;
    sex?: string | null;
    status?: string | null;
  } | null;
};

type EventRow = {
  id: string;
  animal_id: string | null;
  source: string;
  event_type: string | null;
  event_date: string | null;
  notes: string | null;
};

export default async function PropriedadeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: propertyData, error: propertyError } = await supabase
    .from("properties")
    .select(
      "id, name, code, region, state, animals_count, lots_count, status, profile, area_hectares, client_id, target_arrobas"
    )
    .eq("id", id)
    .single();

  if (propertyError || !propertyData) {
    return (
      <main className="space-y-8">
        <Link
          href="/propriedades"
          className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
        >
          ← Voltar para Propriedades
        </Link>

        <div className="ag-card-strong p-8">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            Propriedade não encontrada
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Não foi possível localizar esta propriedade na base da Agraas.
          </p>
        </div>
      </main>
    );
  }

  const property = propertyData as PropertyRow;

  // Animais vinculados a esta propriedade
  const { data: animalsData } = await supabase
    .from("animals")
    .select("id, internal_code, agraas_id, status, sex, breed, birth_date")
    .eq("current_property_id", id)
    .order("internal_code", { ascending: true });

  const animals = (animalsData as AnimalRow[] | null) ?? [];
  const animalIds = animals.map((a) => a.id);

  // Lotes vinculados a esta propriedade
  const { data: lotsData } = await supabase
    .from("lots")
    .select("id")
    .eq("property_id", id);
  const lotsCount = lotsData?.length ?? 0;

  // Cotação e pesos para valor do rebanho
  const [{ data: cotacaoData }, weightsResult] = await Promise.all([
    supabase.from("platform_settings").select("value").eq("key", "cotacao_arroba").single(),
    animalIds.length > 0
      ? supabase.from("weights").select("animal_id, weight, weighing_date")
          .in("animal_id", animalIds)
          .order("weighing_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const cotacao = parseFloat(cotacaoData?.value ?? "330");
  const weightsData = (weightsResult.data ?? []) as { animal_id: string; weight: number; weighing_date: string | null }[];

  // Última pesagem por animal
  const lastWeightByAnimal = new Map<string, number>();
  for (const w of weightsData) {
    if (!lastWeightByAnimal.has(w.animal_id)) {
      lastWeightByAnimal.set(w.animal_id, Number(w.weight));
    }
  }

  const KG_POR_ARROBA = 15;
  const totalArrobas = Array.from(lastWeightByAnimal.values()).reduce((s, w) => s + w / KG_POR_ARROBA, 0);
  const valorRebanho = totalArrobas * cotacao;
  const targetArrobas = property?.target_arrobas ?? null;
  const animaisNaMeta = targetArrobas
    ? Array.from(lastWeightByAnimal.values()).filter(w => w / KG_POR_ARROBA >= targetArrobas).length
    : 0;
  const strikePct = animals.length > 0 && targetArrobas
    ? Math.round((animaisNaMeta / animals.length) * 100)
    : null;

  // Score do passaporte por animal (evita query .in() vazia)
  const passports: PassportRow[] =
    animalIds.length > 0
      ? ((
          await supabase
            .from("agraas_master_passport_cache")
            .select("animal_id, score_json, identity_json")
            .in("animal_id", animalIds)
        ).data as PassportRow[] | null) ?? []
      : [];

  const scoreMap = new Map<string, number | null>();
  for (const p of passports) {
    scoreMap.set(p.animal_id, p.score_json?.total_score ?? null);
  }

  // Score médio dos animais com score disponível
  const scores = animals
    .map((a) => scoreMap.get(a.id))
    .filter((s): s is number => s !== null && s !== undefined);

  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length)
      : null;

  const topScore = scores.length > 0 ? Math.max(...scores) : null;

  // Eventos recentes dos animais desta propriedade
  const events: EventRow[] =
    animalIds.length > 0
      ? ((
          await supabase
            .from("events")
            .select("id, animal_id, source, event_type, event_date, notes")
            .in("animal_id", animalIds)
            .order("event_date", { ascending: false })
            .limit(10)
        ).data as EventRow[] | null) ?? []
      : [];

  const activeCount = animals.filter(
    (a) => (a.status ?? "").toLowerCase() === "active"
  ).length;

  const breedsCount = new Set(
    animals.map((a) => a.breed).filter(Boolean)
  ).size;

  return (
    <main className="space-y-8">
      <Link
        href="/propriedades"
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Propriedades
      </Link>

      {/* Hero */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid xl:grid-cols-[1.08fr_0.92fr]">
          <div className="p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Fazenda</div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-3xl">
                🏡
              </div>

              <div>
                <h1 className="text-4xl font-semibold text-[var(--text-primary)]">
                  {property.name ?? "—"}
                </h1>

                <p className="mt-2 text-[var(--text-secondary)]">
                  {property.region ?? "—"} • {property.state ?? "—"}
                </p>

                {property.code && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[rgba(93,156,68,0.18)] bg-[var(--primary-soft)] px-4 py-2">
                    <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Código
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {property.code}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <HighlightCard
                label="Perfil"
                value={property.profile ?? "—"}
                subtitle="classificação operacional"
              />
              <HighlightCard
                label="Área"
                value={
                  property.area_hectares
                    ? `${property.area_hectares} ha`
                    : "—"
                }
                subtitle="hectares registrados"
              />
              <HighlightCard
                label="Status"
                value={property.status ?? "—"}
                subtitle="condição atual da unidade"
              />
            </div>
          </div>

          <div className="border-l border-[var(--border)] bg-[var(--surface-soft)] p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Resumo operacional
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SnapshotCard
                label="Animais vinculados"
                value={String(animals.length)}
              />
              <SnapshotCard label="Ativos" value={String(activeCount)} />
              <SnapshotCard
                label="Score médio"
                value={averageScore !== null ? String(averageScore) : "—"}
              />
              <SnapshotCard
                label="Top score"
                value={topScore !== null ? String(topScore) : "—"}
              />
              <SnapshotCard
                label="Lotes"
                value={String(lotsCount)}
              />
              <SnapshotCard
                label="Raças"
                value={String(breedsCount)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 xl:grid-cols-4">
        <StatPanel
          title="Animais"
          value={animals.length}
          subtitle="vinculados à propriedade"
        />
        <StatPanel
          title="Score médio"
          value={averageScore !== null ? averageScore : "—"}
          subtitle="qualidade média do rebanho"
        />
        <StatPanel
          title="Ativos"
          value={activeCount}
          subtitle="status operacional vigente"
        />
        <StatPanel
          title="Raças"
          value={breedsCount}
          subtitle="diversidade identificada"
        />
      </section>

      {/* Animais vinculados */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Animais da propriedade</h2>
            <p className="ag-section-subtitle">
              Ativos pecuários com localização atual nesta unidade, com acesso
              direto ao passaporte individual.
            </p>
          </div>

          <span className="ag-badge ag-badge-dark">
            {animals.length} registros
          </span>
        </div>

        <div className="mt-8">
          {animals.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum animal vinculado a esta propriedade no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Sexo</th>
                    <th>Raça</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {animals.map((animal) => {
                    const score = scoreMap.get(animal.id) ?? null;
                    const scorePercent =
                      score !== null
                        ? Math.max(6, Math.min(100, Math.round(score)))
                        : 0;

                    return (
                      <tr key={animal.id}>
                        <td>
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
                              {getAnimalAvatar(animal.sex)}
                            </div>

                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {animal.internal_code ?? animal.id}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {animal.agraas_id ?? "Agraas ID não emitido"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {formatSex(animal.sex)}
                          </span>
                        </td>

                        <td>
                          <span className="text-sm text-[var(--text-secondary)]">
                            {animal.breed ?? "—"}
                          </span>
                        </td>

                        <td>
                          <span className={getStatusBadgeClass(animal.status)}>
                            {formatStatus(animal.status)}
                          </span>
                        </td>

                        <td>
                          {score !== null ? (
                            <div className="min-w-[160px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-[var(--primary-hover)]">
                                  {score}
                                </span>
                                <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                  score
                                </span>
                              </div>

                              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                                  style={{ width: `${scorePercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--text-muted)]">—</span>
                          )}
                        </td>

                        <td>
                          <Link
                            href={`/animais/${animal.id}`}
                            className="inline-flex items-center rounded-2xl border border-[rgba(93,156,68,0.24)] px-4 py-2 text-sm font-medium text-[var(--primary-hover)] transition hover:bg-[var(--primary-soft)]"
                          >
                            Ver passaporte
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Valor do rebanho */}
      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="ag-section-title">Valor estimado do rebanho</h2>
            <p className="ag-section-subtitle">
              Calculado com cotação atual: R$ {cotacao.toFixed(2)}/@ · {KG_POR_ARROBA} kg por arroba
            </p>
          </div>
          <span className="ag-badge ag-badge-green">Cotação ao vivo</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <p className="text-sm text-[var(--text-muted)]">Total arrobas</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {totalArrobas > 0 ? `${totalArrobas.toFixed(1)} @` : "—"}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{lastWeightByAnimal.size} animais com pesagem</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <p className="text-sm text-[var(--text-muted)]">Valor estimado</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {valorRebanho > 0 ? `R$ ${Math.round(valorRebanho).toLocaleString("pt-BR")}` : "—"}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">R$ {cotacao.toFixed(2)} por @</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <p className="text-sm text-[var(--text-muted)]">Strike tracker</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {strikePct !== null ? `${strikePct}%` : "—"}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {targetArrobas ? `${animaisNaMeta} animais ≥ ${targetArrobas} @` : "Meta não definida"}
            </p>
            {strikePct !== null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f,#5d9c44)]"
                  style={{ width: `${strikePct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">Meta de arrobas por animal</p>
          <TargetArrobasEditor propertyId={id} initialValue={targetArrobas} />
        </div>
      </section>

      {/* Eventos recentes */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Eventos recentes</h2>
            <p className="ag-section-subtitle">
              Últimos 10 eventos registrados nos animais desta propriedade.
            </p>
          </div>

          <span className="ag-badge ag-badge-dark">
            {events.length} eventos
          </span>
        </div>

        <div className="mt-8">
          {events.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento recente encontrado para os animais desta
              propriedade.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => {
                const date = event.event_date ?? null;

                return (
                  <div
                    key={index}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.20)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="ag-badge ag-badge-green">
                        {getEventIcon(event.event_type ?? "")}
                        {" "}
                        {formatEventType(event.event_type ?? "")}
                      </span>

                      <span className="text-sm text-[var(--text-muted)]">
                        {formatDate(date)}
                      </span>
                    </div>

                    {event.notes && (
                      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                        {event.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function HighlightCard({
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
  if (!value) return "—";
  return map[value.toLowerCase()] ?? value;
}

function formatStatus(value: string | null) {
  if (!value) return "—";
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

function getStatusBadgeClass(value: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "active") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }
  if (normalized === "sold" || normalized === "slaughtered" || normalized === "inactive" || normalized === "archived") {
    return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
  }
  if (normalized === "pending") {
    return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  }
  return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    BIRTH: "Nascimento",
    RFID_LINKED: "RFID vinculado",
    WEIGHT_RECORDED: "Pesagem",
    HEALTH_APPLICATION: "Aplicação sanitária",
    LOT_ENTRY: "Entrada em lote",
    OWNERSHIP_TRANSFER: "Transferência",
    SALE: "Venda",
    SLAUGHTER: "Abate",
    CERTIFICATION: "Certificação",
    birth: "Nascimento",
    rfid_assigned: "Identificação vinculada",
    health_application: "Aplicação registrada",
    weight_recorded: "Pesagem",
    sale: "Venda",
    ownership_transfer: "Transferência",
    lot_entry: "Entrada em lote",
    slaughter: "Abate",
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}
