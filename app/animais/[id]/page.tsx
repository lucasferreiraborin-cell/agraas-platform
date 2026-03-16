import { supabase } from "@/lib/supabase";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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
  id?: string;
  animal_id: string;
  event_type: string | null;
  event_timestamp: string | null;
  notes: string | null;
};

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
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
  type: "application" | "event" | "weight";
  title: string;
  description: string;
  date: string | null;
  badge: string;
};

export default async function AnimalPassaportePage({ params }: PageProps) {
  const { id } = await params;

  const [
    { data, error },
    { data: applicationsData, error: applicationsError },
    { data: productsData, error: productsError },
    { data: batchesData, error: batchesError },
    { data: eventsData, error: eventsError },
    { data: weightsData, error: weightsError },
  ] = await Promise.all([
    supabase
      .from("agraas_master_passport_cache")
      .select("*")
      .eq("animal_id", id)
      .single(),

    supabase
      .from("applications")
      .select("id, animal_id, product_id, batch_id, dose, application_date, created_at")
      .eq("animal_id", id)
      .order("application_date", { ascending: false }),

    supabase.from("products").select("id, name"),

    supabase.from("stock_batches").select("id, batch_number"),

    supabase
      .from("animal_events")
      .select("animal_id, event_type, event_timestamp, notes")
      .eq("animal_id", id)
      .order("event_timestamp", { ascending: false }),

    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date, notes")
      .eq("animal_id", id)
      .order("weighing_date", { ascending: false }),
  ]);

  if (error || !data) {
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
            Passaporte não encontrado
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Não foi possível localizar o passaporte digital deste animal.
          </p>
        </div>
      </main>
    );
  }

  const identity = data.identity_json ?? {};
  const score = data.score_json ?? {};
  const trace = data.traceability_json ?? {};
  const sanitary = data.sanitary_json ?? {};
  const chain = data.chain_json ?? {};

  const applications = (applicationsData ?? []) as ApplicationRow[];
  const products = (productsData ?? []) as ProductRow[];
  const batches = (batchesData ?? []) as BatchRow[];
  const events = (eventsData ?? []) as EventRow[];
  const weights = (weightsData ?? []) as WeightRow[];

  if (applicationsError) console.error("Erro ao buscar aplicações:", applicationsError);
  if (productsError) console.error("Erro ao buscar produtos:", productsError);
  if (batchesError) console.error("Erro ao buscar lotes:", batchesError);
  if (eventsError) console.error("Erro ao buscar eventos:", eventsError);
  if (weightsError) console.error("Erro ao buscar pesagens:", weightsError);

  const productMap = new Map<string, string>();
  products.forEach((product) => productMap.set(product.id, product.name));

  const batchMap = new Map<string, string>();
  batches.forEach((batch) => batchMap.set(batch.id, batch.batch_number));

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

  const latestWeight = weights[0] ?? null;
  const previousWeight = weights[1] ?? null;
  const weightDelta =
    latestWeight && previousWeight
      ? Number(latestWeight.weight ?? 0) - Number(previousWeight.weight ?? 0)
      : null;

  const timelineApplications: TimelineRow[] = applications.map((application) => ({
    id: `application-${application.id}`,
    type: "application",
    title: "Aplicação sanitária",
    description: `${
      application.product_id
        ? productMap.get(application.product_id) ?? "Produto"
        : "Produto"
    } • lote ${
      application.batch_id ? batchMap.get(application.batch_id) ?? "-" : "-"
    } • dose ${application.dose ?? "-"}`,
    date: application.application_date ?? application.created_at ?? null,
    badge: "💉 Aplicação",
  }));

  const timelineEvents: TimelineRow[] = events.map((event, index) => ({
    id: `event-${index}-${event.event_timestamp ?? "sem-data"}`,
    type: "event",
    title: formatEventType(event.event_type ?? ""),
    description: event.notes ?? "Sem observações registradas.",
    date: event.event_timestamp ?? null,
    badge: `${getEventIcon(event.event_type ?? "")} ${formatEventType(event.event_type ?? "")}`,
  }));

  const timelineWeights: TimelineRow[] = weights.map((weight) => ({
    id: `weight-${weight.id}`,
    type: "weight",
    title: "Pesagem registrada",
    description: `${weight.weight} kg${weight.notes ? ` • ${weight.notes}` : ""}`,
    date: weight.weighing_date ?? null,
    badge: "⚖️ Pesagem",
  }));

  const timeline = [...timelineApplications, ...timelineEvents, ...timelineWeights].sort(
    (a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    }
  );

  const scorePercent = Math.max(
    6,
    Math.min(100, Math.round(Number(score.total_score ?? 0)))
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
                {getAnimalAvatar(identity.sex)}
              </div>

              <div>
                <h1 className="text-4xl font-semibold text-[var(--text-primary)]">
                  {identity.internal_code ?? data.animal_id}
                </h1>

                <p className="mt-2 text-[var(--text-secondary)]">
                  Passaporte digital consolidado do animal.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMiniCard
                label="Sexo"
                value={formatSex(identity.sex)}
                subtitle="classificação biológica"
              />

              <HeroMiniCard
                label="Raça"
                value={identity.breed ?? "-"}
                subtitle="identificação zootécnica"
              />

              <HeroMiniCard
                label="Status"
                value={formatStatus(identity.status)}
                subtitle="condição operacional"
              />
            </div>
          </div>

          <div className="border-l border-[var(--border)] bg-[var(--surface-soft)] p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Trust score
            </p>

            <div className="mt-6 rounded-3xl border bg-white p-6 shadow">
              <p className="text-sm text-[var(--text-muted)]">Score total</p>

              <p className="mt-2 text-5xl font-semibold text-[var(--primary-hover)]">
                {score.total_score ?? "-"}
              </p>

              <div className="mt-5 h-3 w-full rounded-full bg-[rgba(93,156,68,0.10)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f,#5d9c44)]"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SnapshotCard
                label="Propriedade"
                value={trace.current_property_name ?? "-"}
              />

              <SnapshotCard
                label="Lote atual"
                value={trace.current_lot_code ?? "-"}
              />

              <SnapshotCard
                label="Último peso"
                value={latestWeight ? `${latestWeight.weight} kg` : "-"}
              />

              <SnapshotCard
                label="Carência até"
                value={formatDate(sanitary.withdrawal_end_date)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <ScoreCard label="Sanitário" value={score.sanitary_score} />
        <ScoreCard label="Operacional" value={score.operational_score} />
        <ScoreCard label="Continuidade" value={score.continuity_score} />
        <ScoreCard label="Total" value={score.total_score} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetricPanel
          title="Última pesagem"
          value={latestWeight ? `${latestWeight.weight} kg` : "-"}
          subtitle={latestWeight ? `Data: ${formatDate(latestWeight.weighing_date)}` : "Sem pesagem registrada"}
        />
        <MetricPanel
          title="Pesagem anterior"
          value={previousWeight ? `${previousWeight.weight} kg` : "-"}
          subtitle={previousWeight ? `Data: ${formatDate(previousWeight.weighing_date)}` : "Sem registro anterior"}
        />
        <MetricPanel
          title="Evolução"
          value={
            weightDelta === null
              ? "-"
              : `${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`
          }
          subtitle="diferença entre as duas últimas pesagens"
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
              Linha do tempo consolidada com eventos, aplicações e pesagens deste animal.
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
                    <span className="ag-badge ag-badge-green">
                      {item.badge}
                    </span>

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

function MetricPanel({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="ag-card p-6">
      <p className="text-sm text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
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
  };

  return map[value] ?? "•";
}