"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
};

type PassportCacheRow = {
  animal_id: string;
  identity_json: {
    internal_code?: string | null;
    sex?: string | null;
    breed?: string | null;
    status?: string | null;
  } | null;
  score_json: {
    total_score?: number | null;
  } | null;
};

type AnimalBaseRow = {
  id: string;
  agraas_id: string | null;
  birth_date: string | null;
};

type AnimalRow = {
  animal_id: string;
  internal_code: string | null;
  agraas_id: string | null;
  sex: string | null;
  breed: string | null;
  animal_status: string | null;
  total_score: number | null;
  birth_date: string | null;
};

export default function AnimaisPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [rows, setRows] = useState<AnimalRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Carrega clientes uma vez
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (data) setClients(data as ClientRow[]);
    }
    loadClients();
  }, []);

  // Recarrega animais quando cliente muda
  useEffect(() => {
    async function loadAnimals() {
      setLoading(true);
      setError(false);

      // Query do passport cache
      let passportQuery = supabase
        .from("agraas_master_passport_cache")
        .select("animal_id, identity_json, score_json");

      if (selectedClientId) {
        passportQuery = passportQuery.eq(
          "client_id",
          selectedClientId
        ) as typeof passportQuery;
      }

      // Query da tabela animals (para agraas_id e birth_date)
      let animalsQuery = supabase
        .from("animals")
        .select("id, agraas_id, birth_date");

      if (selectedClientId) {
        animalsQuery = animalsQuery.eq(
          "client_id",
          selectedClientId
        ) as typeof animalsQuery;
      }

      const [{ data: passportData, error: passportError }, { data: animalsBaseData, error: animalsBaseError }] =
        await Promise.all([passportQuery, animalsQuery]);

      if (passportError || animalsBaseError) {
        setError(true);
        setLoading(false);
        return;
      }

      const rawRows = (passportData as PassportCacheRow[] | null) ?? [];
      const animalsBase = (animalsBaseData as AnimalBaseRow[] | null) ?? [];

      const animalBaseMap = new Map<string, AnimalBaseRow>();
      for (const animal of animalsBase) {
        animalBaseMap.set(animal.id, animal);
      }

      const joined: AnimalRow[] = rawRows.map((item) => {
        const base = animalBaseMap.get(item.animal_id);
        return {
          animal_id: item.animal_id,
          internal_code: item.identity_json?.internal_code ?? null,
          agraas_id: base?.agraas_id ?? null,
          sex: item.identity_json?.sex ?? null,
          breed: item.identity_json?.breed ?? null,
          animal_status: item.identity_json?.status ?? null,
          total_score: item.score_json?.total_score ?? null,
          birth_date: base?.birth_date ?? null,
        };
      });

      setRows(joined);
      setLoading(false);
    }

    loadAnimals();
  }, [selectedClientId]);

  const averageScore =
    rows.length > 0
      ? Math.round(
          rows.reduce((acc, a) => acc + Number(a.total_score ?? 0), 0) /
            rows.length
        )
      : 0;

  const activeCount = rows.filter(
    (a) => (a.animal_status ?? "").toLowerCase() === "active"
  ).length;

  const femaleCount = rows.filter((a) => {
    const v = (a.sex ?? "").toLowerCase();
    return v === "female" || v === "fêmea" || v === "femea";
  }).length;

  const maleCount = rows.filter((a) => {
    const v = (a.sex ?? "").toLowerCase();
    return v === "male" || v === "macho";
  }).length;

  const breedsCount = new Set(
    rows.map((a) => a.breed).filter(Boolean)
  ).size;

  const topScore =
    rows.length > 0
      ? Math.max(...rows.map((a) => Number(a.total_score ?? 0)))
      : 0;

  const agraasIdCount = rows.filter((a) => Boolean(a.agraas_id)).length;
  const birthDateCount = rows.filter((a) => Boolean(a.birth_date)).length;

  return (
    <main className="space-y-8">
      {/* Seletor de cliente */}
      {clients.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Cliente
          </span>

          <button
            type="button"
            onClick={() => setSelectedClientId(null)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedClientId === null
                ? "bg-[var(--primary-hover)] text-white"
                : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--primary-soft)]"
            }`}
          >
            Todos
          </button>

          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedClientId(client.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedClientId === client.id
                  ? "bg-[var(--primary-hover)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--primary-soft)]"
              }`}
            >
              {client.name}
            </button>
          ))}
        </div>
      )}

      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Base animal</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Passaportes vivos da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Consulte os animais registrados, acompanhe score, identidade
              digital e rastreabilidade da base e navegue para passaportes
              individuais com histórico auditável e leitura produtiva.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais/novo" className="ag-button-primary">
                Novo animal
              </Link>
              <Link href="/scores" className="ag-button-secondary">
                Ver ranking
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              <HeroMetric
                label="Animais registrados"
                value={loading ? "—" : rows.length}
                subtitle="base consolidada"
              />
              <HeroMetric
                label="Score médio"
                value={loading ? "—" : averageScore}
                subtitle="qualidade média do rebanho"
              />
              <HeroMetric
                label="Agraas IDs"
                value={loading ? "—" : agraasIdCount}
                subtitle="identidades digitais emitidas"
              />
              <HeroMetric
                label="Raças mapeadas"
                value={loading ? "—" : breedsCount}
                subtitle="diversidade da operação"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar da base
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Leitura executiva do rebanho
                </h2>
              </div>
              <span className="ag-badge ag-badge-dark">Live view</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Ativos" value={loading ? "—" : String(activeCount)} />
              <SnapshotCard label="Machos" value={loading ? "—" : String(maleCount)} />
              <SnapshotCard label="Fêmeas" value={loading ? "—" : String(femaleCount)} />
              <SnapshotCard label="Top score" value={loading ? "—" : String(topScore)} />
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--text-muted)]">
                Visão da plataforma
              </p>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Esta página mostra a base animal com leitura rápida de status,
                score, identidade digital e rastreabilidade, servindo como
                porta de entrada para o passaporte individual de cada ativo.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Identidade digital
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {loading ? "—" : agraasIdCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Nascimento estruturado
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {loading ? "—" : birthDateCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <KpiCard label="Base total"   value={loading ? "—" : rows.length}    icon="🐂" subtitle="animais cadastrados" />
        <KpiCard label="Score médio"  value={loading ? "—" : averageScore}   icon="📈" subtitle="qualidade média da base" />
        <KpiCard label="Ativos"       value={loading ? "—" : activeCount}    icon="✅" subtitle="status operacional vigente" />
        <KpiCard label="Agraas IDs"   value={loading ? "—" : agraasIdCount}  icon="🪪" subtitle="identidade digital emitida" />
        <KpiCard label="Raças"        value={loading ? "—" : breedsCount}    icon="🧬" subtitle="categorias identificadas" />
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Animais registrados</h2>
            <p className="ag-section-subtitle">
              Visão operacional da base pecuária com leitura premium de score,
              identidade digital e navegação para o passaporte individual.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {loading ? "—" : rows.length} registros
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Carregando animais...
            </div>
          ) : error ? (
            <p className="text-sm text-[var(--danger)]">
              Erro ao carregar animais.
            </p>
          ) : rows.length === 0 ? (
            <WelcomeEmpty />
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
                  {rows.map((animal) => {
                    const scoreValue =
                      typeof animal.total_score === "number"
                        ? animal.total_score
                        : null;

                    const scorePercent =
                      scoreValue !== null
                        ? Math.max(6, Math.min(100, Math.round(scoreValue)))
                        : 0;

                    return (
                      <tr key={animal.animal_id}>
                        <td>
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
                              {getAnimalAvatar(animal.sex)}
                            </div>

                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {animal.internal_code ?? animal.animal_id}
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
                          <span className={getStatusBadgeClass(animal.animal_status)}>
                            {formatStatus(animal.animal_status)}
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
                            href={`/animais/${animal.animal_id}`}
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

function WelcomeEmpty() {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-3xl shadow-[var(--shadow-soft)] mx-auto">
        🐂
      </div>

      <div className="ag-badge ag-badge-green mt-6 inline-flex">Bem-vindo à Agraas</div>

      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        Nenhum animal cadastrado ainda
      </h3>

      <p className="mt-3 text-base leading-7 text-[var(--text-secondary)] max-w-md mx-auto">
        Comece cadastrando uma propriedade e depois registre seus animais para
        ativar passaportes, scores e rastreabilidade completa.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/propriedades/novo" className="ag-button-primary">
          Cadastrar minha primeira fazenda
        </Link>
        <Link href="/animais/novo" className="ag-button-secondary">
          Cadastrar animal
        </Link>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, subtitle }: { label: string; value: string | number; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function KpiCard({ label, value, icon, subtitle }: { label: string; value: string | number; icon: string; subtitle: string }) {
  return (
    <div className="ag-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
          {icon}
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Live</span>
      </div>
      <p className="mt-5 ag-kpi-label">{label}</p>
      <p className="mt-3 ag-kpi-value">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function getAnimalAvatar(sex: string | null) {
  const v = (sex ?? "").toLowerCase();
  if (v === "male" || v === "macho") return "🐂";
  if (v === "female" || v === "fêmea" || v === "femea") return "🐄";
  return "🐾";
}

function formatSex(value: string | null) {
  const map: Record<string, string> = { male: "Macho", female: "Fêmea", macho: "Macho", femea: "Fêmea", "fêmea": "Fêmea" };
  if (!value) return "—";
  return map[value.toLowerCase()] ?? value;
}

function formatStatus(value: string | null) {
  if (!value) return "—";
  const map: Record<string, string> = { active: "Ativo", inactive: "Inativo", pending: "Pendente", blocked: "Bloqueado", archived: "Arquivado", sold: "Vendido", slaughtered: "Abatido" };
  return map[value.toLowerCase()] ?? value;
}

function getStatusBadgeClass(value: string | null) {
  const n = (value ?? "").toLowerCase();
  if (n === "active") return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  if (n === "inactive" || n === "archived") return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
  if (n === "pending") return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  if (n === "blocked") return "inline-flex rounded-full bg-[rgba(214,69,69,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)]";
  if (n === "sold" || n === "slaughtered") return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
  return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
}
