import { supabase } from "@/lib/supabase";
import Link from "next/link";

type CertificationRow = {
  id: string;
  animal_id: string;
  certification_code: string | null;
  certification_name: string | null;
  issued_at: string | null;
  status: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
};

type PassportRow = {
  animal_id: string;
  current_property_name: string | null;
  total_score: number | null;
  current_withdrawal_end_date: string | null;
  active_seals: string[] | null;
};

type ConsolidatedRow = {
  animal_id: string;
  internal_code: string;
  agraas_id: string;
  current_property_name: string | null;
  total_score: number | null;
  current_withdrawal_end_date: string | null;
  active_seals: string[];
  certifications: string[];
};

export default async function CertificacoesPage() {
  const [
    { data: certificationsData, error: certificationsError },
    { data: animalsData, error: animalsError },
    { data: passportData, error: passportError },
  ] = await Promise.all([
    supabase
      .from("animal_certifications")
      .select(
        "id, animal_id, certification_code, certification_name, issued_at, status"
      )
      .order("issued_at", { ascending: false }),

    supabase.from("animals").select("id, internal_code, agraas_id"),

    supabase
      .from("agraas_master_passport")
      .select(
        "animal_id, current_property_name, total_score, current_withdrawal_end_date, active_seals"
      ),
  ]);

  const certifications = (certificationsData ?? []) as CertificationRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const passports = (passportData ?? []) as PassportRow[];

  const filteredCertifications = certifications.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return status === "active" || status === "ativo" || status === "";
  });

  const animalMap = new Map<string, AnimalRow>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal);
  }

  const passportMap = new Map<string, PassportRow>();
  for (const passport of passports) {
    passportMap.set(passport.animal_id, passport);
  }

  const grouped = new Map<string, ConsolidatedRow>();

  for (const cert of filteredCertifications) {
    const animal = animalMap.get(cert.animal_id);
    const passport = passportMap.get(cert.animal_id);
    const existing = grouped.get(cert.animal_id);

    const certificationLabel =
      cert.certification_name ??
      cert.certification_code ??
      "Certificação";

    if (existing) {
      if (!existing.certifications.includes(certificationLabel)) {
        existing.certifications.push(certificationLabel);
      }
      continue;
    }

    grouped.set(cert.animal_id, {
      animal_id: cert.animal_id,
      internal_code: animal?.internal_code ?? cert.animal_id,
      agraas_id:
        animal?.agraas_id ??
        `AGR-${cert.animal_id.slice(0, 8).toUpperCase()}`,
      current_property_name: passport?.current_property_name ?? null,
      total_score: passport?.total_score ?? null,
      current_withdrawal_end_date:
        passport?.current_withdrawal_end_date ?? null,
      active_seals: passport?.active_seals ?? [],
      certifications: [certificationLabel],
    });
  }

  const rows = [...grouped.values()].sort(
    (a, b) => Number(b.total_score ?? 0) - Number(a.total_score ?? 0)
  );

  const totalCertified = rows.length;

  const averageScore =
    rows.length > 0
      ? Math.round(
          rows.reduce((acc, row) => acc + Number(row.total_score ?? 0), 0) /
            rows.length
        )
      : 0;

  const propertiesCovered = new Set(
    rows.map((row) => row.current_property_name).filter(Boolean)
  ).size;

  const totalSeals = rows.reduce(
    (acc, row) => acc + (row.active_seals?.length ?? 0),
    0
  );

  const topCertifications = new Map<string, number>();
  for (const row of rows) {
    for (const cert of row.certifications) {
      topCertifications.set(cert, (topCertifications.get(cert) ?? 0) + 1);
    }
  }

  const topCertificationList = [...topCertifications.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const hasError = certificationsError || animalsError || passportError;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">
              Camada de certificação
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              Certificação, confiança e leitura institucional da cadeia
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              A Agraas consolida a camada de certificação do rebanho,
              organizando conformidade, score, selos e leitura de confiança
              para operação, auditoria e expansão de mercado.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Camada institucional que transforma dados operacionais em confiança de mercado.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Ver animais
              </Link>
              <Link href="/scores" className="ag-button-secondary">
                Ver scores
              </Link>
              <Link href="/dashboard" className="ag-button-secondary">
                Dashboard executivo
              </Link>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Animais certificados"
                value={totalCertified}
                subtitle="ativos com certificação vigente"
              />
              <MetricCard
                label="Score médio"
                value={averageScore}
                subtitle="confiança média da base certificada"
              />
              <MetricCard
                label="Propriedades cobertas"
                value={propertiesCovered}
                subtitle="unidades com certificação ativa"
              />
              <MetricCard
                label="Selos ativos"
                value={totalSeals}
                subtitle="marcadores de conformidade registrados"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topCertificationList.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
            Nenhuma certificação encontrada na base atual.
          </div>
        ) : (
          topCertificationList.map((item) => (
            <div
              key={item.name}
              className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <p className="text-sm text-[var(--text-muted)]">
                Certificação recorrente
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {formatLabel(item.name)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Presente em {item.count} animal{item.count > 1 ? "is" : ""} da
                base certificada.
              </p>
            </div>
          ))
        )}
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Base certificada</h2>
            <p className="ag-section-subtitle">
              Visão consolidada dos animais com certificação ativa, score,
              propriedade vinculada, selos e janela de carência sanitária.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {rows.length} registros
          </div>
        </div>

        <div className="mt-8">
          {hasError ? (
            <p className="text-sm text-[var(--danger)]">
              Erro ao carregar certificações.
            </p>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum animal certificado encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Agraas ID</th>
                    <th>Propriedade</th>
                    <th>Score</th>
                    <th>Selos</th>
                    <th>Certificações</th>
                    <th>Carência até</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.animal_id}>
                      <td>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {row.internal_code}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {row.certifications.length} certificação
                            {row.certifications.length > 1 ? "s" : ""} Ativo rastreado e validado pela Agraas
                            {row.certifications.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </td>

                      <td>{row.agraas_id}</td>

                      <td>{row.current_property_name ?? "-"}</td>

                      <td>
                        <span className="font-semibold text-[var(--primary-hover)]">
                          {row.total_score ?? "-"}
                        </span>
                      </td>

                      <td>
                        {row.active_seals.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.active_seals.slice(0, 2).map((seal) => (
                              <span
                                key={seal}
                                className="ag-badge ag-badge-green"
                              >
                                {formatLabel(seal)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {row.certifications.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.certifications.slice(0, 3).map((cert) => (
                              <span
                                key={cert}
                                className="ag-badge ag-badge-green"
                              >
                                {formatLabel(cert)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {row.current_withdrawal_end_date
                          ? new Date(
                              row.current_withdrawal_end_date
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>

                      <td>
                        <Link
                          href={`/animais/${row.animal_id}`}
                          className="inline-flex items-center rounded-2xl border border-[rgba(93,156,68,0.24)] px-4 py-2 text-sm font-medium text-[var(--primary-hover)] transition hover:bg-[var(--primary-soft)]"
                        >
                          Ver passaporte
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
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

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}