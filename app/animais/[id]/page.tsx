import { supabase } from "@/lib/supabase";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PassportCacheRow = {
  animal_id: string;
  identity_json: {
    internal_code?: string | null;
    sex?: string | null;
    breed?: string | null;
    status?: string | null;
    birth_date?: string | null;
    current_property_id?: string | null;
  } | null;
  timeline_json:
    | {
        event_type?: string | null;
        event_timestamp?: string | null;
        notes?: string | null;
        performed_by?: string | null;
        related_entity_type?: string | null;
        related_entity_id?: string | null;
        payload?: Record<string, unknown> | null;
      }[]
    | null;
  health_json: {
    applications?: number | null;
    active_withdrawal?: number | null;
    last_weight?: number | null;
  } | null;
  score_json: {
    sanitary_score?: number | null;
    operational_score?: number | null;
    continuity_score?: number | null;
    total_score?: number | null;
    score_status?: string | null;
  } | null;
  certifications_json:
    | {
        certification_code?: string | null;
        certification_name?: string | null;
        status?: string | null;
        issued_at?: string | null;
      }[]
    | null;
  ownership_json: {
    current_property_id?: string | null;
    status?: string | null;
  } | null;
  last_generated_at?: string | null;
};

type PropertyRow = {
  id: string;
  name: string | null;
};

type EventRow = {
  event_type: string | null;
  event_timestamp: string | null;
  notes: string | null;
};

export default async function AnimalPassaportePage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const [{ data, error }, { data: propertiesData }, { data: eventsData }] =
    await Promise.all([
      supabase
        .from("agraas_master_passport_cache")
        .select("*")
        .eq("animal_id", id)
        .maybeSingle(),
      supabase.from("properties").select("id, name"),
      supabase
        .from("animal_events")
        .select("event_type, event_timestamp, notes")
        .eq("animal_id", id)
        .order("event_timestamp", { ascending: false }),
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

          <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <p>
              <strong>animal_id:</strong> {id}
            </p>
            <p>
              <strong>erro:</strong>{" "}
              {error ? JSON.stringify(error) : "nenhum erro retornado"}
            </p>
            <p>
              <strong>registro encontrado:</strong> {data ? "sim" : "não"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const passport = data as PassportCacheRow;
  const identity = passport.identity_json ?? {};
  const score = passport.score_json ?? {};
  const health = passport.health_json ?? {};
  const ownership = passport.ownership_json ?? {};
  const certifications = passport.certifications_json ?? [];
  const timeline = ((eventsData as EventRow[] | null) ?? []).length
    ? ((eventsData as EventRow[] | null) ?? [])
    : ((passport.timeline_json as EventRow[] | null) ?? []);

  const properties = (propertiesData as PropertyRow[] | null) ?? [];

  const propertyMap = new Map<string, string>();
  properties.forEach((property) => {
    propertyMap.set(property.id, property.name ?? "Propriedade sem nome");
  });

  const currentPropertyName =
    propertyMap.get(
      ownership.current_property_id ?? identity.current_property_id ?? ""
    ) ?? "-";

  const totalScore = Number(score.total_score ?? 0);
  const scorePercent = Math.max(6, Math.min(100, Math.round(totalScore)));

  return (
    <main className="space-y-8">
      <Link
        href="/animais"
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Animais
      </Link>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Passaporte Agraas</div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-3xl shadow-[var(--shadow-soft)]">
                {getAnimalAvatar(identity.sex ?? null)}
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-5xl">
                  {identity.internal_code ?? passport.animal_id}
                </h1>

                <p className="mt-3 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
                  Passaporte digital consolidado com score, histórico operacional,
                  sinais de confiança e leitura estruturada da trajetória do animal.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <HeroMiniCard
                label="Sexo"
                value={formatSex(identity.sex ?? null)}
                subtitle="classificação biológica"
              />
              <HeroMiniCard
                label="Raça"
                value={identity.breed ?? "-"}
                subtitle="identificação zootécnica"
              />
              <HeroMiniCard
                label="Status"
                value={formatStatus(
                  (ownership.status ?? identity.status ?? null) as string | null
                )}
                subtitle="condição operacional"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Trust score
            </p>

            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--text-muted)]">Score total</p>

              <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-[var(--primary-hover)]">
                {score.total_score ?? "-"}
              </p>

              <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f,#5d9c44)]"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Leitura consolidada de confiança do animal dentro da lógica Agraas,
                combinando histórico, estrutura operacional e consistência da base.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Propriedade" value={currentPropertyName} />
              <SnapshotCard
                label="Peso atual"
                value={
                  health.last_weight !== null && health.last_weight !== undefined
                    ? `${health.last_weight} kg`
                    : "-"
                }
              />
              <SnapshotCard
                label="Aplicações"
                value={String(health.applications ?? 0)}
              />
              <SnapshotCard
                label="Em carência"
                value={String(health.active_withdrawal ?? 0)}
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

      <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="space-y-6">
          <div className="ag-card p-8">
            <h2 className="ag-section-title">Identificação</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <InfoItem
                label="Código do animal"
                value={identity.internal_code ?? "-"}
              />
              <InfoItem
                label="Sexo"
                value={formatSex(identity.sex ?? null)}
              />
              <InfoItem
                label="Raça"
                value={identity.breed ?? "-"}
              />
              <InfoItem
                label="Nascimento"
                value={formatDate(identity.birth_date ?? null)}
              />
              <InfoItem
                label="Status"
                value={formatStatus(
                  (ownership.status ?? identity.status ?? null) as string | null
                )}
              />
              <InfoItem
                label="Propriedade atual"
                value={currentPropertyName}
              />
            </div>
          </div>

          <div className="ag-card p-8">
            <h2 className="ag-section-title">Certificações ativas</h2>

            <div className="mt-6 flex flex-wrap gap-3">
              {Array.isArray(certifications) && certifications.length > 0 ? (
                certifications.map((item, index) => (
                  <span
                    key={`${item.certification_code ?? "cert"}-${index}`}
                    className="ag-badge ag-badge-green"
                  >
                    {item.certification_name ??
                      item.certification_code ??
                      "Certificação"}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Nenhuma certificação ativa registrada.
                </p>
              )}
            </div>
          </div>

          <div className="ag-card p-8">
            <h2 className="ag-section-title">Resumo da saúde operacional</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <InfoItem
                label="Total de aplicações"
                value={String(health.applications ?? 0)}
              />
              <InfoItem
                label="Com carência ativa"
                value={String(health.active_withdrawal ?? 0)}
              />
              <InfoItem
                label="Último peso"
                value={
                  health.last_weight !== null && health.last_weight !== undefined
                    ? `${health.last_weight} kg`
                    : "-"
                }
              />
              <InfoItem
                label="Última atualização"
                value={formatDateTime(passport.last_generated_at ?? null)}
              />
            </div>
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Timeline auditável</h2>
              <p className="ag-section-subtitle">
                Sequência cronológica de eventos do animal para leitura executiva e
                demonstração de rastreabilidade.
              </p>
            </div>

            <span className="ag-badge ag-badge-green">Histórico vivo</span>
          </div>

          {Array.isArray(timeline) && timeline.length > 0 ? (
            <div className="mt-8 space-y-5">
              {timeline.map((event, index) => (
                <div
                  key={`${event.event_type ?? "event"}-${event.event_timestamp ?? index}-${index}`}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <span className="ag-badge ag-badge-green">
                      {getEventIcon(event.event_type ?? "")}{" "}
                      {formatEventType(event.event_type ?? "")}
                    </span>

                    <span className="text-sm text-[var(--text-muted)]">
                      {formatDateTime(event.event_timestamp ?? null)}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    {event.notes ?? "Sem observações registradas para este evento."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento encontrado para este animal.
            </div>
          )}
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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  return (
    <div className="ag-card p-6">
      <p className="ag-kpi-label">{label}</p>
      <p className="mt-4 ag-kpi-value">{value ?? "-"}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null) {
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
  const map: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    blocked: "Bloqueado",
    archived: "Arquivado",
    sold: "Vendido",
    slaughtered: "Abatido",
  };

  if (!value) return "-";
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
  };

  return map[value] ?? "•";
}