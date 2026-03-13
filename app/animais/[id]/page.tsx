import { supabase } from "@/lib/supabase";
import Link from "next/link";

type AnimalPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnimalPassaportePage({
  params,
}: AnimalPageProps) {
  const { id } = await params;

  const [
    { data: passaporte, error: passaporteError },
    { data: eventos, error: eventosError },
  ] = await Promise.all([
    supabase
      .from("agraas_master_passport")
      .select("*")
      .eq("animal_id", id)
      .single(),

    supabase
      .from("animal_events")
      .select("event_type, event_timestamp, notes")
      .eq("animal_id", id)
      .order("event_timestamp", { ascending: false }),
  ]);

  if (passaporteError || !passaporte) {
    return (
      <main className="space-y-8">
        <div>
          <Link
            href="/animais"
            className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
          >
            ← Voltar para Animais
          </Link>
        </div>

        <section className="ag-card-strong p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            Passaporte do animal
          </h1>
          <p className="mt-4 text-sm text-[var(--danger)]">
            Não foi possível carregar o passaporte deste animal.
          </p>
        </section>
      </main>
    );
  }

  const scoreCards = [
    { title: "Score sanitário", value: passaporte.sanitary_score ?? "-" },
    { title: "Score operacional", value: passaporte.operational_score ?? "-" },
    { title: "Score continuidade", value: passaporte.continuity_score ?? "-" },
    { title: "Score total", value: passaporte.total_score ?? "-" },
  ];

  const selos: string[] = passaporte.active_seals ?? [];
  const certificacoes: string[] = passaporte.active_certifications ?? [];

  const totalScore = Number(passaporte.total_score ?? 0);
  const totalScorePercent = Math.max(6, Math.min(100, Math.round(totalScore)));

  return (
    <main className="space-y-8">
      <div>
        <Link
          href="/animais"
          className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
        >
          ← Voltar para Animais
        </Link>
      </div>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Passaporte Agraas</div>

            <div className="mt-6 flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-3xl shadow-[var(--shadow-soft)]">
                {getAnimalAvatar(passaporte.sex)}
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-5xl">
                  {passaporte.internal_code ?? "Animal sem código"}
                </h1>

                <p className="mt-3 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
                  Visão consolidada de confiança do animal, com score,
                  rastreabilidade, selos, certificações e cadeia produtiva em
                  uma estrutura pronta para auditoria e decisão.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/aplicacoes?animalId=${id}`}
                className="ag-button-primary"
              >
                Registrar aplicação
              </Link>

              <Link
                href={`/pesagens?animalId=${id}`}
                className="ag-button-secondary"
              >
                Registrar pesagem
              </Link>

              <Link
                href={`/vendas?animalId=${id}`}
                className="ag-button-secondary"
              >
                Registrar venda
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMiniCard
                label="Sexo"
                value={formatSex(passaporte.sex)}
                subtitle="classificação biológica"
              />
              <HeroMiniCard
                label="Raça"
                value={passaporte.breed ?? "-"}
                subtitle="identificação zootécnica"
              />
              <HeroMiniCard
                label="Status"
                value={formatStatus(passaporte.animal_status)}
                subtitle="condição operacional atual"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Snapshot de confiança
            </p>

            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Score total</p>
                  <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-[var(--primary-hover)]">
                    {passaporte.total_score ?? "-"}
                  </p>
                </div>

                <span className="ag-badge ag-badge-green">Trust score</span>
              </div>

              <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                  style={{ width: `${totalScorePercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Este score consolida a leitura de confiança do animal dentro da
                lógica Agraas, reunindo rastreabilidade, continuidade, sanidade
                e estrutura operacional.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SnapshotCard
                label="Propriedade atual"
                value={passaporte.current_property_name ?? "-"}
              />
              <SnapshotCard
                label="Carência até"
                value={formatDate(passaporte.current_withdrawal_end_date)}
              />
              <SnapshotCard
                label="Status"
                value={formatStatus(passaporte.animal_status)}
              />
              <SnapshotCard
                label="Lote atual"
                value={passaporte.current_lot_code ?? "-"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {scoreCards.map((score) => (
          <div key={score.title} className="ag-card p-6">
            <p className="ag-kpi-label">{score.title}</p>
            <p className="mt-4 ag-kpi-value">{score.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <div className="ag-card p-8">
            <h2 className="ag-section-title">Identificação</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <InfoItem label="Código do animal" value={passaporte.internal_code ?? "-"} />
              <InfoItem label="Sexo" value={formatSex(passaporte.sex)} />
              <InfoItem label="Raça" value={passaporte.breed ?? "-"} />
              <InfoItem
                label="Data de nascimento"
                value={formatDate(passaporte.birth_date)}
              />
              <InfoItem
                label="Propriedade atual"
                value={passaporte.current_property_name ?? "-"}
              />
              <InfoItem
                label="Status do animal"
                value={formatStatus(passaporte.animal_status)}
              />
            </div>
          </div>

          <div className="ag-card p-8">
            <h2 className="ag-section-title">Sinais de confiança</h2>

            <div className="mt-6">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Selos ativos
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {selos.length > 0 ? (
                  selos.map((selo) => (
                    <span key={selo} className="ag-badge ag-badge-green">
                      {formatLabel(selo)}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nenhum selo ativo.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Certificações ativas
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {certificacoes.length > 0 ? (
                  certificacoes.map((cert) => (
                    <span key={cert} className="ag-badge ag-badge-dark">
                      {formatLabel(cert)}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nenhuma certificação ativa.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="ag-card p-8">
            <h2 className="ag-section-title">Cadeia produtiva</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <InfoItem
                label="Lote atual"
                value={passaporte.current_lot_code ?? "-"}
              />
              <InfoItem
                label="Frigorífico"
                value={passaporte.slaughterhouse_name ?? "-"}
              />
              <InfoItem
                label="Data de abate"
                value={formatDate(passaporte.slaughter_date)}
              />
              <InfoItem
                label="Peso de carcaça"
                value={
                  passaporte.carcass_weight !== null &&
                  passaporte.carcass_weight !== undefined
                    ? `${passaporte.carcass_weight} kg`
                    : "-"
                }
              />
              <InfoItem
                label="Classificação"
                value={passaporte.carcass_classification ?? "-"}
              />
            </div>
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Timeline auditável</h2>
              <p className="ag-section-subtitle">
                Sequência cronológica de tudo o que aconteceu com o animal,
                consolidando eventos relevantes da sua trajetória.
              </p>
            </div>

            <span className="ag-badge ag-badge-green">Histórico vivo</span>
          </div>

          {eventosError ? (
            <p className="mt-6 text-sm text-[var(--danger)]">
              Erro ao carregar histórico.
            </p>
          ) : !eventos || eventos.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento encontrado.
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {eventos.map((evento, index) => (
                <div
                  key={`${evento.event_type}-${evento.event_timestamp}-${index}`}
                  className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <span className="ag-badge ag-badge-green">
                      {getEventIcon(evento.event_type)}{" "}
                      {formatEventType(evento.event_type)}
                    </span>

                    <span className="text-sm text-[var(--text-muted)]">
                      {formatDateTime(evento.event_timestamp)}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    {evento.notes ?? "Sem observações registradas para este evento."}
                  </p>
                </div>
              ))}
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

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
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

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    birth: "Nascimento",
    rfid_assigned: "Identificação vinculada",
    health_application: "Aplicação registrada",
    weight_recorded: "Pesagem registrada",
    sale: "Venda registrada",
    ownership_transfer: "Transferência de propriedade",
    lot_entry: "Entrada em lote",
    slaughter: "Abate registrado",
  };

  return map[value] ?? formatLabel(value);
}

function getEventIcon(value: string) {
  const map: Record<string, string> = {
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
  };

  return map[value.toLowerCase()] ?? value;
}