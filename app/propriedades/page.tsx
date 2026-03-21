"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ClientRow = {
  id: string;
  name: string;
};

type PropertyRow = {
  id: string;
  name: string;
  code: string | null;
  region: string | null;
  state: string | null;
  animals_count: number;
  lots_count: number;
  status: string;
  profile: string | null;
  x: number | null;
  y: number | null;
  client_id: string | null;
};

export default function PropriedadesPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  useEffect(() => {
    async function load() {
      const [{ data: clientsData }, { data: propertiesData }, { data: animalsData }] =
        await Promise.all([
          supabase.from("clients").select("id, name").order("name"),
          supabase
            .from("properties")
            .select(
              "id, name, code, region, state, status, profile, x, y, client_id"
            )
            .order("name"),
          supabase.from("animals").select("id, current_property_id"),
        ]);

      // Computa animals_count real por propriedade
      const countByProperty = new Map<string, number>();
      for (const animal of animalsData ?? []) {
        if (animal.current_property_id) {
          countByProperty.set(
            animal.current_property_id,
            (countByProperty.get(animal.current_property_id) ?? 0) + 1
          );
        }
      }

      const propertiesWithCounts = ((propertiesData as PropertyRow[] | null) ?? []).map(
        (p) => ({
          ...p,
          animals_count: countByProperty.get(p.id) ?? 0,
          lots_count: 0, // lots não têm property_id no schema atual
        })
      );

      setClients((clientsData as ClientRow[] | null) ?? []);
      setProperties(propertiesWithCounts);
      setLoading(false);
    }

    load();
  }, []);

  const filteredProperties = useMemo(
    () =>
      selectedClientId
        ? properties.filter((p) => p.client_id === selectedClientId)
        : properties,
    [properties, selectedClientId]
  );

  // Garante que o pin selecionado no mapa é sempre válido para o filtro atual
  const validSelectedId = useMemo(() => {
    if (filteredProperties.find((p) => p.id === selectedPropertyId)) {
      return selectedPropertyId;
    }
    return filteredProperties[0]?.id ?? "";
  }, [filteredProperties, selectedPropertyId]);

  // Quando trocar de cliente, reseta para a primeira propriedade do filtro
  useEffect(() => {
    setSelectedPropertyId(filteredProperties[0]?.id ?? "");
  }, [selectedClientId]);

  // Quando os dados carregarem pela primeira vez, seleciona a primeira
  useEffect(() => {
    if (selectedPropertyId === "" && filteredProperties.length > 0) {
      setSelectedPropertyId(filteredProperties[0].id);
    }
  }, [filteredProperties]);

  const totalAnimals = filteredProperties.reduce(
    (acc, p) => acc + (p.animals_count ?? 0),
    0
  );
  const totalLots = filteredProperties.reduce(
    (acc, p) => acc + (p.lots_count ?? 0),
    0
  );
  const activeProperties = filteredProperties.filter(
    (p) => p.status === "Ativa"
  ).length;
  const monitoredProperties = filteredProperties.filter(
    (p) => p.status === "Monitorada"
  ).length;
  const expansionProperties = filteredProperties.filter(
    (p) => p.status === "Expansão"
  ).length;

  const topProperty =
    [...filteredProperties].sort(
      (a, b) => (b.animals_count ?? 0) - (a.animals_count ?? 0)
    )[0] ?? null;

  const averageAnimals =
    filteredProperties.length > 0
      ? Math.round(totalAnimals / filteredProperties.length)
      : 0;

  const regionsCount = new Set(
    filteredProperties.map((p) => p.region).filter(Boolean)
  ).size;

  const selectedProperty =
    filteredProperties.find((p) => p.id === validSelectedId) ??
    filteredProperties[0] ??
    null;

  const concentrationIndex =
    selectedProperty && topProperty && (topProperty.animals_count ?? 0) > 0
      ? Math.min(
          100,
          Math.round(
            ((selectedProperty.animals_count ?? 0) /
              (topProperty.animals_count ?? 1)) *
              100
          )
        )
      : 0;

  const rankedProperties = useMemo(
    () =>
      [...filteredProperties].sort(
        (a, b) => (b.animals_count ?? 0) - (a.animals_count ?? 0)
      ),
    [filteredProperties]
  );

  return (
    <main className="space-y-8">
      {/* Seletor de cliente */}
      {!loading && clients.length > 0 && (
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
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Base territorial</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Propriedades da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Visualize as propriedades que sustentam a cadeia produtiva da
              Agraas com leitura territorial, concentração de ativos, lotes,
              capacidade operacional e presença geográfica em mapa.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Ver animais
              </Link>
              <Link href="/lotes" className="ag-button-secondary">
                Abrir lotes
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Propriedades"
                value={loading ? "—" : filteredProperties.length}
                subtitle="unidades no mapa operacional"
              />
              <HeroMetric
                label="Animais"
                value={loading ? "—" : totalAnimals}
                subtitle="volume consolidado na base"
              />
              <HeroMetric
                label="Lotes"
                value={loading ? "—" : totalLots}
                subtitle="estruturas produtivas vigentes"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar territorial
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Leitura executiva das fazendas
                </h2>
              </div>

              <span className="ag-badge ag-badge-dark">Territory</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Ativas" value={String(activeProperties)} />
              <SnapshotCard
                label="Monitoradas"
                value={String(monitoredProperties)}
              />
              <SnapshotCard
                label="Expansão"
                value={String(expansionProperties)}
              />
              <SnapshotCard label="Regiões" value={String(regionsCount)} />
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--text-muted)]">
                O papel das propriedades
              </p>

              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                A propriedade é a origem da rastreabilidade. É nela que a Agraas
                conecta território, produção, lotes, animais e eventos em uma
                leitura operacional consistente e apresentável.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          label="Propriedades"
          value={loading ? "—" : filteredProperties.length}
          icon="🌎"
          subtitle="unidades cadastradas"
        />
        <KpiCard
          label="Animais"
          value={loading ? "—" : totalAnimals}
          icon="🐂"
          subtitle="ativos distribuídos"
        />
        <KpiCard
          label="Lotes"
          value={loading ? "—" : totalLots}
          icon="📦"
          subtitle="grupos produtivos"
        />
        <KpiCard
          label="Média por unidade"
          value={loading ? "—" : averageAnimals}
          icon="📊"
          subtitle="animais por propriedade"
        />
      </section>

      {loading ? (
        <div className="ag-card p-8 text-sm text-[var(--text-muted)]">
          Carregando propriedades...
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="ag-card p-8 text-sm text-[var(--text-muted)]">
          Nenhuma propriedade encontrada para este cliente.
        </div>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="ag-card p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="ag-section-title">Mapa operacional</h2>
                  <p className="ag-section-subtitle">
                    Visualização territorial da base com marcação das
                    propriedades estratégicas. Clique nos pontos do mapa ou nos
                    cards ao lado.
                  </p>
                </div>

                <div className="ag-badge ag-badge-dark">
                  {filteredProperties.length} marcações
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,#f7faf5_0%,#eef4ea_100%)] p-4 shadow-[var(--shadow-soft)]">
                <div className="rounded-[24px] border border-[var(--border)] bg-white/70 p-4">
                  <svg viewBox="0 0 800 520" className="h-auto w-full">
                    <defs>
                      <linearGradient
                        id="territoryGlow"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#e8f4e2" />
                        <stop offset="100%" stopColor="#dcefd2" />
                      </linearGradient>
                    </defs>

                    <rect
                      x="20"
                      y="20"
                      width="760"
                      height="480"
                      rx="28"
                      fill="url(#territoryGlow)"
                    />

                    <path
                      d="M260 70 L350 55 L455 70 L545 125 L590 195 L612 275
                         L588 355 L545 420 L455 455 L370 445 L320 470
                         L275 438 L215 430 L180 380 L165 315 L120 250
                         L145 180 L200 115 L260 70Z"
                      fill="rgba(93,156,68,0.10)"
                      stroke="rgba(93,156,68,0.28)"
                      strokeWidth="4"
                      strokeLinejoin="round"
                    />

                    <line x1="250" y1="150" x2="565" y2="150" stroke="rgba(30,42,27,0.06)" strokeDasharray="6 8" />
                    <line x1="220" y1="250" x2="600" y2="250" stroke="rgba(30,42,27,0.06)" strokeDasharray="6 8" />
                    <line x1="210" y1="350" x2="560" y2="350" stroke="rgba(30,42,27,0.06)" strokeDasharray="6 8" />
                    <line x1="290" y1="90"  x2="290" y2="440" stroke="rgba(30,42,27,0.05)" strokeDasharray="6 8" />
                    <line x1="410" y1="80"  x2="410" y2="455" stroke="rgba(30,42,27,0.05)" strokeDasharray="6 8" />
                    <line x1="530" y1="110" x2="530" y2="430" stroke="rgba(30,42,27,0.05)" strokeDasharray="6 8" />

                    <text x="280" y="105" fill="rgba(30,42,27,0.45)" fontSize="13" fontWeight="600">Norte</text>
                    <text x="285" y="205" fill="rgba(30,42,27,0.45)" fontSize="13" fontWeight="600">Centro-Oeste</text>
                    <text x="510" y="315" fill="rgba(30,42,27,0.45)" fontSize="13" fontWeight="600">Sudeste</text>
                    <text x="365" y="455" fill="rgba(30,42,27,0.45)" fontSize="13" fontWeight="600">Sul</text>

                    {filteredProperties.map((property) => {
                      const isSelected = validSelectedId === property.id;
                      const px = property.x ?? 400;
                      const py = property.y ?? 260;

                      return (
                        <g
                          key={property.id}
                          onClick={() => setSelectedPropertyId(property.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <circle
                            cx={px}
                            cy={py}
                            r={isSelected ? "24" : "16"}
                            fill={
                              isSelected
                                ? "rgba(93,156,68,0.22)"
                                : "rgba(93,156,68,0.16)"
                            }
                          />
                          <circle
                            cx={px}
                            cy={py}
                            r={isSelected ? "11" : "9"}
                            fill={isSelected ? "#4f8a38" : "#5d9c44"}
                            stroke="white"
                            strokeWidth="4"
                          />
                          <text
                            x={px + 16}
                            y={py - 14}
                            fill="rgba(30,42,27,0.82)"
                            fontSize="12"
                            fontWeight={isSelected ? "800" : "700"}
                          >
                            {property.code ?? property.name}
                          </text>
                          <text
                            x={px + 16}
                            y={py + 3}
                            fill="rgba(30,42,27,0.56)"
                            fontSize="11"
                          >
                            {property.state ?? ""}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <LegendItem label="Ativa" tone="ativa" />
                <LegendItem label="Monitorada" tone="monitorada" />
                <LegendItem label="Expansão" tone="expansao" />
              </div>
            </div>

            <div className="space-y-6">
              {selectedProperty && (
                <div className="ag-card p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="ag-section-title">Propriedade selecionada</h2>
                      <p className="ag-section-subtitle">
                        Painel dinâmico com foco na unidade destacada no mapa.
                      </p>
                    </div>
                    <span className={getStatusBadgeClass(selectedProperty.status)}>
                      {selectedProperty.status}
                    </span>
                  </div>

                  <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-[var(--shadow-soft)]">
                        🏡
                      </div>

                      <span className="ag-badge ag-badge-green">
                        {selectedProperty.code ?? "—"}
                      </span>
                    </div>

                    <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {selectedProperty.name}
                    </p>

                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {selectedProperty.region ?? "—"} • {selectedProperty.state ?? "—"}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <MiniData label="Animais" value={selectedProperty.animals_count ?? 0} />
                      <MiniData label="Lotes" value={selectedProperty.lots_count ?? 0} />
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        Perfil
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                        {selectedProperty.profile ?? "—"}
                      </p>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Concentração territorial
                        </p>
                        <p className="text-sm font-semibold text-[var(--primary-hover)]">
                          {concentrationIndex}%
                        </p>
                      </div>

                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                          style={{ width: `${concentrationIndex}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/propriedades/${selectedProperty.id}`}
                        className="ag-button-secondary w-full text-center"
                      >
                        Ver fazenda completa →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="ag-card p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="ag-section-title">Ranking territorial</h2>
                    <p className="ag-section-subtitle">
                      Propriedades ordenadas por volume animal.
                    </p>
                  </div>
                  <span className="ag-badge ag-badge-dark">Ranking</span>
                </div>

                <div className="mt-6 space-y-4">
                  {rankedProperties.map((property, index) => (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => setSelectedPropertyId(property.id)}
                      className={`w-full rounded-3xl border p-5 text-left transition ${
                        validSelectedId === property.id
                          ? "border-[rgba(93,156,68,0.30)] bg-[var(--primary-soft)]"
                          : "border-[var(--border)] bg-[var(--surface-soft)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-base shadow-[var(--shadow-soft)]">
                            {getRankingIcon(index)}
                          </div>

                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">
                              {property.name}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {property.code ?? "—"} • {property.state ?? "—"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                            Animais
                          </p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--primary-hover)]">
                            {property.animals_count ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                          style={{
                            width: `${Math.max(
                              10,
                              topProperty
                                ? Math.round(
                                    ((property.animals_count ?? 0) /
                                      (topProperty.animals_count ?? 1)) *
                                      100
                                  )
                                : 10
                            )}%`,
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="ag-card p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="ag-section-title">Mapa de propriedades</h2>
                <p className="ag-section-subtitle">
                  Leitura premium da base territorial com visão por unidade,
                  capacidade produtiva e perfil operacional.
                </p>
              </div>

              <div className="ag-badge ag-badge-dark">
                {filteredProperties.length} propriedades
              </div>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-2">
              {filteredProperties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => setSelectedPropertyId(property.id)}
                  className={`rounded-3xl border p-6 text-left transition ${
                    validSelectedId === property.id
                      ? "border-[rgba(93,156,68,0.30)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-[var(--shadow-soft)]">
                      🏡
                    </div>

                    <span className={getStatusBadgeClass(property.status)}>
                      {property.status}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {property.name}
                  </h3>

                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {property.code ?? "—"} • {property.region ?? "—"} •{" "}
                    {property.state ?? "—"}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MiniData label="Animais" value={property.animals_count ?? 0} />
                    <MiniData label="Lotes" value={property.lots_count ?? 0} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Perfil
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                      {property.profile ?? "—"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={`/propriedades/${property.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
                    >
                      Ver fazenda →
                    </Link>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="ag-card p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="ag-section-title">Estrutura territorial</h2>
                <p className="ag-section-subtitle">
                  Visão tabular das unidades para leitura comparativa rápida.
                </p>
              </div>

              <div className="ag-badge ag-badge-dark">Board ready</div>
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Propriedade</th>
                    <th>Código</th>
                    <th>Estado</th>
                    <th>Região</th>
                    <th>Animais</th>
                    <th>Lotes</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProperties.map((property) => (
                    <tr key={property.id}>
                      <td className="font-medium text-[var(--text-primary)]">
                        {property.name}
                      </td>
                      <td>{property.code ?? "—"}</td>
                      <td>{property.state ?? "—"}</td>
                      <td>{property.region ?? "—"}</td>
                      <td className="font-semibold text-[var(--text-primary)]">
                        {property.animals_count ?? 0}
                      </td>
                      <td>{property.lots_count ?? 0}</td>
                      <td>{property.profile ?? "—"}</td>
                      <td>
                        <span className={getStatusBadgeClass(property.status)}>
                          {property.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/propriedades/${property.id}`}
                          className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
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
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
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

function MiniData({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function LegendItem({
  label,
  tone,
}: {
  label: string;
  tone: "ativa" | "monitorada" | "expansao";
}) {
  const className =
    tone === "ativa"
      ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]"
      : tone === "monitorada"
      ? "bg-[rgba(74,144,226,0.14)] text-[var(--info)]"
      : "bg-[rgba(217,163,67,0.14)] text-[var(--warning)]";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-current opacity-80" />
      {label}
    </div>
  );
}

function getRankingIcon(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "🏅";
}

function getStatusBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "ativa") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }

  if (normalized === "monitorada") {
    return "inline-flex rounded-full bg-[rgba(74,144,226,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--info)]";
  }

  if (normalized === "expansão" || normalized === "expansao") {
    return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  }

  return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
}
