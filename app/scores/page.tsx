import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ScoreRow = {
  animal_id: string;
  internal_code: string | null;
  total_score: number | null;
  current_property_name: string | null;
  active_certifications: string[] | null;
  animal_status: string | null;
  sex: string | null;
  breed: string | null;
};

type AnimalBaseRow = {
  id: string;
  agraas_id: string | null;
  birth_date: string | null;
};

type DisplayScoreRow = ScoreRow & {
  agraas_id: string | null;
  birth_date: string | null;
};

export default async function ScoresPage() {
  const [
    { data: scoreData, error: scoreError },
    { data: animalBaseData, error: animalBaseError },
  ] = await Promise.all([
    supabase
      .from("agraas_master_passport")
      .select(
        "animal_id, internal_code, total_score, current_property_name, active_certifications, animal_status, sex, breed"
      )
      .order("total_score", { ascending: false })
      .limit(50),

    supabase
      .from("animals")
      .select("id, agraas_id, birth_date"),
  ]);

  const rawRows: ScoreRow[] = (scoreData as ScoreRow[] | null) ?? [];
  const animalBaseRows: AnimalBaseRow[] =
    (animalBaseData as AnimalBaseRow[] | null) ?? [];

  const animalBaseMap = new Map<string, AnimalBaseRow>();
  for (const animal of animalBaseRows) {
    animalBaseMap.set(animal.id, animal);
  }

  const rows: DisplayScoreRow[] = rawRows.map((item) => {
    const base = animalBaseMap.get(item.animal_id);

    return {
      ...item,
      agraas_id: base?.agraas_id ?? null,
      birth_date: base?.birth_date ?? null,
    };
  });

  const validScores = rows.filter(
    (item) => typeof item.total_score === "number"
  );

  const averageScore =
    validScores.length > 0
      ? Math.round(
          validScores.reduce(
            (acc, item) => acc + Number(item.total_score ?? 0),
            0
          ) / validScores.length
        )
      : 0;

  const topScore =
    validScores.length > 0
      ? Math.max(...validScores.map((item) => Number(item.total_score ?? 0)))
      : 0;

  const certifiedCount = rows.filter(
    (item) =>
      Array.isArray(item.active_certifications) &&
      item.active_certifications.length > 0
  ).length;

  const activeCount = rows.filter(
    (item) => (item.animal_status ?? "").toLowerCase() === "active"
  ).length;

  const agraasIdCount = rows.filter((item) => Boolean(item.agraas_id)).length;

  const birthDateCount = rows.filter((item) => Boolean(item.birth_date)).length;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Ranking Agraas</div>

            <h1 className="ag-page-title">
              Ranking de confiança da base
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              O score Agraas transforma a base animal em uma camada de
              inteligência real para priorização operacional, leitura comparativa
              e construção de confiança dentro da cadeia pecuária.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Abrir animais
              </Link>
              <Link href="/" className="ag-button-secondary">
                Voltar ao painel
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              <HeroMetric
                label="Score médio"
                value={averageScore}
                subtitle="média da base analisada"
              />
              <HeroMetric
                label="Melhor score"
                value={topScore}
                subtitle="maior nível de confiança"
              />
              <HeroMetric
                label="Agraas IDs"
                value={agraasIdCount}
                subtitle="identidades digitais emitidas"
              />
              <HeroMetric
                label="Animais avaliados"
                value={rows.length}
                subtitle="ativos no ranking atual"
              />
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar executivo
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Leitura estratégica dos scores
                </h2>
              </div>

              <span className="ag-badge ag-badge-dark">Board view</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Ativos" value={String(activeCount)} />
              <SnapshotCard label="Certificados" value={String(certifiedCount)} />
              <SnapshotCard label="Com score" value={String(validScores.length)} />
              <SnapshotCard label="Nascimento estruturado" value={String(birthDateCount)} />
            </div>

            <div className="mt-6 ag-kpi-card">
              <p className="text-sm text-[var(--text-muted)]">
                O que esta tela prova
              </p>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                A Agraas não é apenas cadastro. Ela organiza confiança,
                identidade digital e leitura comparativa da base em um formato
                visual pronto para operação, governança e apresentação institucional.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <KpiCard
          label="Base ranqueada"
          value={rows.length}
          icon="🏆"
          subtitle="animais incluídos no ranking"
        />
        <KpiCard
          label="Score médio"
          value={averageScore}
          icon="📈"
          subtitle="performance média consolidada"
        />
        <KpiCard
          label="Certificados"
          value={certifiedCount}
          icon="✅"
          subtitle="ativos com conformidade vinculada"
        />
        <KpiCard
          label="Ativos"
          value={activeCount}
          icon="🐂"
          subtitle="status operacional vigente"
        />
        <KpiCard
          label="Agraas IDs"
          value={agraasIdCount}
          icon="🪪"
          subtitle="identidade digital emitida"
        />
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Pódio da base</h2>
            <p className="ag-section-subtitle">
              Os animais com maior score de confiança na leitura atual da plataforma.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">{rows.length} posições</div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const item = rows[index];
            if (!item) {
              return (
                <div
                  key={index}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6"
                >
                  <p className="text-sm text-[var(--text-muted)]">
                    Posição {index + 1}
                  </p>
                  <p className="mt-3 text-base text-[var(--text-secondary)]">
                    Sem animal nesta posição.
                  </p>
                </div>
              );
            }

            return (
              <Link
                key={item.animal_id}
                href={`/animais/${item.animal_id}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-[var(--shadow-soft)]">
                    {getPodiumIcon(index)}
                  </div>
                  <span className="ag-badge ag-badge-green">#{index + 1}</span>
                </div>

                <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {item.internal_code ?? item.animal_id}
                </p>

                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {item.agraas_id ?? "Agraas ID não emitido"}
                </p>

                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {item.current_property_name ?? "Propriedade não informada"}
                </p>

                <p className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--primary-hover)]">
                  {item.total_score ?? "-"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={getStatusBadgeClass(item.animal_status)}>
                    {formatStatus(item.animal_status)}
                  </span>

                  {Array.isArray(item.active_certifications) &&
                  item.active_certifications.length > 0 ? (
                    item.active_certifications.slice(0, 2).map((cert) => (
                      <span key={cert} className="ag-badge ag-badge-dark">
                        {formatLabel(cert)}
                      </span>
                    ))
                  ) : (
                    <span className="ag-badge ag-badge-dark">Base ativa</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Ranking completo</h2>
            <p className="ag-section-subtitle">
              Visualização premium da confiança animal com score, identidade digital,
              status, propriedade e acesso ao passaporte individual.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">Top 50</div>
        </div>

        <div className="mt-8">
          {scoreError || animalBaseError ? (
            <p className="text-sm text-[var(--danger)]">
              Erro ao carregar ranking.
            </p>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum score encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Animal</th>
                    <th>Sexo</th>
                    <th>Raça</th>
                    <th>Propriedade</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((item, index) => {
                    const scoreValue =
                      typeof item.total_score === "number"
                        ? item.total_score
                        : null;

                    const scorePercent =
                      scoreValue !== null
                        ? Math.max(6, Math.min(100, Math.round(scoreValue)))
                        : 0;

                    return (
                      <tr key={item.animal_id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-base shadow-[var(--shadow-soft)]">
                              {getRankingIcon(index)}
                            </div>
                            <span className="font-semibold text-[var(--text-primary)]">
                              #{index + 1}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">
                              {item.internal_code ?? item.animal_id}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {item.agraas_id ?? "Agraas ID não emitido"}
                            </p>
                          </div>
                        </td>

                        <td>{formatSex(item.sex)}</td>
                        <td>{item.breed ?? "-"}</td>
                        <td>{item.current_property_name ?? "-"}</td>

                        <td>
                          <span className={getStatusBadgeClass(item.animal_status)}>
                            {formatStatus(item.animal_status)}
                          </span>
                        </td>

                        <td>
                          {scoreValue !== null ? (
                            <div className="min-w-[180px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-[var(--primary-hover)]">
                                  {scoreValue}
                                </span>
                                <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                  trust score
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
                            <span className="text-sm text-[var(--text-muted)]">
                              -
                            </span>
                          )}
                        </td>

                        <td>
                          <Link
                            href={`/animais/${item.animal_id}`}
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
      <p className="ag-kpi-label">{label}</p>
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
      <p className="ag-kpi-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: string;
  subtitle: string;
}) {
  return (
    <div className="ag-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
          {icon}
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Live
        </span>
      </div>

      <p className="mt-5 ag-kpi-label">{label}</p>
      <p className="mt-3 ag-kpi-value">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function getPodiumIcon(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  return "🥉";
}

function getRankingIcon(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "🏅";
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function getStatusBadgeClass(value: string | null) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "active") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }

  if (normalized === "inactive" || normalized === "archived") {
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