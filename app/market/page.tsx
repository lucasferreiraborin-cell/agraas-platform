import { supabase } from "@/lib/supabase";
import Link from "next/link";

type MarketAnimalRow = {
  animal_id: string;
  internal_code: string | null;
  sex: string | null;
  birth_date: string | null;
  property_name: string | null;
  total_score: number | null;
  sanitary_score: number | null;
  operational_score: number | null;
  continuity_score: number | null;
  last_weight: number | null;
  certifications:
    | {
        code: string;
        name: string;
      }[]
    | null;
  status: string | null;
};

export default async function MarketPage() {
  const { data, error } = await supabase
    .from("agraas_market_animals")
    .select("*")
    .order("total_score", { ascending: false });

  const animals: MarketAnimalRow[] = (data as MarketAnimalRow[] | null) ?? [];

  const totalAnimals = animals.length;
  const averageScore =
    totalAnimals > 0
      ? Math.round(
          animals.reduce((acc, item) => acc + Number(item.total_score ?? 0), 0) /
            totalAnimals
        )
      : 0;

  const averageWeight =
    totalAnimals > 0
      ? Math.round(
          animals.reduce((acc, item) => acc + Number(item.last_weight ?? 0), 0) /
            totalAnimals
        )
      : 0;

  const certifiedAnimals = animals.filter(
    (item) => Array.isArray(item.certifications) && item.certifications.length > 0
  ).length;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Agraas Market</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Marketplace rastreável de animais certificados
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Uma camada premium de valorização animal baseada em score,
              certificações, histórico operacional e passaporte digital.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Ver base animal
              </Link>
              <Link href="/scores" className="ag-button-secondary">
                Abrir ranking
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Animais no market"
                value={totalAnimals}
                subtitle="ativos visíveis para leitura comercial"
              />
              <HeroMetric
                label="Score médio"
                value={averageScore}
                subtitle="qualidade média dos ativos exibidos"
              />
              <HeroMetric
                label="Certificados"
                value={certifiedAnimals}
                subtitle="ativos com chancela visível"
              />
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Leitura executiva
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Ativos prontos para valorização
                </h2>
              </div>

              <span className="ag-badge ag-badge-dark">Pitch ready</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Peso médio" value={`${averageWeight} kg`} />
              <SnapshotCard
                label="Maior score"
                value={String(
                  animals.length > 0 ? Number(animals[0]?.total_score ?? 0) : 0
                )}
              />
              <SnapshotCard
                label="Com selo/certificação"
                value={`${certifiedAnimals}/${totalAnimals}`}
              />
              <SnapshotCard
                label="Status predominante"
                value={getDominantStatusLabel(animals)}
              />
            </div>

            <div className="mt-6 ag-kpi-card">
              <p className="text-sm text-[var(--text-muted)]">Leitura comercial</p>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Esta visão traduz dados técnicos da rastreabilidade em percepção
                de valor, confiança e elegibilidade comercial do animal.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Animais elegíveis</h2>
            <p className="ag-section-subtitle">
              Leitura premium de score, peso, propriedade, certificações e status
              para narrativa comercial da Agraas.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">{totalAnimals} ativos</div>
        </div>

        <div className="mt-8">
          {error ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--danger)]">
              Erro ao carregar o marketplace.
            </div>
          ) : animals.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum animal disponível no market.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {animals.map((animal) => {
                const score = Number(animal.total_score ?? 0);
                const scorePercent = Math.max(
                  6,
                  Math.min(100, Math.round(score))
                );

                return (
                  <Link
                    key={animal.animal_id}
                    href={`/animais/${animal.animal_id}`}
                    className="block rounded-[30px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] transition hover:border-[rgba(93,156,68,0.24)] hover:shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-2xl shadow-[var(--shadow-soft)]">
                          {getAnimalAvatar(animal.sex)}
                        </div>

                        <div>
                          <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            {animal.internal_code ?? animal.animal_id}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {animal.property_name ?? "Propriedade não informada"}
                          </p>
                        </div>
                      </div>

                      <span className={getStatusBadgeClass(animal.status)}>
                        {formatStatus(animal.status)}
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <MiniData label="Peso atual" value={`${animal.last_weight ?? "-"} kg`} />
                      <MiniData label="Nascimento" value={formatDate(animal.birth_date)} />
                      <MiniData label="Score total" value={String(animal.total_score ?? "-")} />
                      <MiniData label="Sanitário" value={String(animal.sanitary_score ?? "-")} />
                    </div>

                    <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>

                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Certificações
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.isArray(animal.certifications) &&
                        animal.certifications.length > 0 ? (
                          animal.certifications.map((item) => (
                            <span
                              key={`${animal.animal_id}-${item.code}`}
                              className="ag-badge ag-badge-green"
                            >
                              {item.name}
                            </span>
                          ))
                        ) : (
                          <span className="ag-badge ag-badge-dark">
                            Sem certificação
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
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
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function MiniData({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function getAnimalAvatar(sex: string | null) {
  const value = (sex ?? "").toLowerCase();
  if (value === "male" || value === "macho") return "🐂";
  if (value === "female" || value === "fêmea" || value === "femea") return "🐄";
  return "🐾";
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

function getStatusBadgeClass(value: string | null) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "active") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }

  if (normalized === "sold" || normalized === "slaughtered") {
    return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
  }

  if (normalized === "pending") {
    return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  }

  if (normalized === "blocked") {
    return "inline-flex rounded-full bg-[rgba(214,69,69,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)]";
  }

  return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
}

function getDominantStatusLabel(animals: MarketAnimalRow[]) {
  if (animals.length === 0) return "-";

  const counts = animals.reduce<Record<string, number>>((acc, item) => {
    const key = (item.status ?? "unknown").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  return formatStatus(dominant);
}