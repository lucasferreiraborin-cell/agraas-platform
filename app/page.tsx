import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BrazilMapWrapper from "@/app/components/BrazilMapWrapper";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

// ─── Types ────────────────────────────────────────────────────────────────────

type PassportCacheRow = {
  animal_id: string;
  identity_json: {
    internal_code?: string | null;
    sex?: string | null;
    breed?: string | null;
    status?: string | null;
  } | null;
  score_json: {
    sanitary_score?: number | null;
    operational_score?: number | null;
    continuity_score?: number | null;
    total_score?: number | null;
  } | null;
  health_json: {
    applications?: number | null;
    active_withdrawal?: number | null;
    last_weight?: number | null;
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

type MarketRow = {
  animal_id: string;
  internal_code: string | null;
  property_name: string | null;
  last_weight: number | null;
  total_score: number | null;
  status: string | null;
  certifications:
    | {
        code: string;
        name: string;
      }[]
    | null;
};

type EventRow = {
  animal_id: string | null;
  event_type: string | null;
  notes: string | null;
  event_date: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id?: string | null;
  birth_date?: string | null;
  current_property_id?: string | null;
};

type PropertyRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
};

type WeighingRow = {
  animal_id: string;
  weight: number;
  weighing_date: string;
};

type CertRow = {
  animal_id: string;
  certification_name: string;
  status: string;
};

type ActiveAppRow = {
  animal_id: string;
  withdrawal_date: string;
  product_name: string | null;
};

type ClientRow = {
  id: string;
  name: string;
};

// ─── Alert type ───────────────────────────────────────────────────────────────

type Alert = {
  animal_id: string;
  code: string;
  problem: string;
  days?: number;
  type: "critical" | "warning" | "withdrawal" | "cert";
  href: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PainelPage() {
  // ── User info (server client for auth) ──────────────────────────────────────
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const { data: clientData } = user
    ? await supabaseServer
        .from("clients")
        .select("id, name, role")
        .eq("auth_user_id", user.id)
        .single()
    : { data: null };

  // Redireciona compradores para a página dedicada
  if (clientData?.role === "buyer") redirect("/comprador");

  // clientId is used to filter every query explicitly —
  // some tables (passport cache, properties) have no RLS.
  // Using a UUID that matches nothing as fallback ensures zero leakage.
  const clientId =
    clientData?.id ?? "00000000-0000-0000-0000-000000000000";

  // ── Greeting & date ─────────────────────────────────────────────────────────
  const now = new Date();
  const brazilHour = (now.getUTCHours() - 3 + 24) % 24;
  const greeting =
    brazilHour < 12 ? "Bom dia" : brazilHour < 18 ? "Boa tarde" : "Boa noite";

  const rawName =
    clientData?.name ?? user?.email?.split("@")[0] ?? "usuário";
  const firstName =
    rawName.split(" ")[0].charAt(0).toUpperCase() +
    rawName.split(" ")[0].slice(1).toLowerCase();

  const dateDisplay = now
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    })
    .replace(/^\w/, (c) => c.toUpperCase());

  // ── Data queries ─────────────────────────────────────────────────────────────
  const todayStr = now.toISOString().split("T")[0];

  const [
    { data: passportsData, error: passportsError },
    { data: halalCertsData },
    { data: expiredCertsData },
    { data: propertiesData },
    { data: marketData },
    { data: eventsData },
    { data: animalsData },
    { data: weighingsData },
    { data: activeAppsData },
  ] = await Promise.all([
    // Explicit client_id filter on all tables — some have no RLS
    supabaseServer
      .from("agraas_master_passport_cache")
      .select("*")
      .eq("client_id", clientId),

    supabaseServer
      .from("animal_certifications")
      .select("animal_id, certification_name, status")
      .ilike("certification_name", "%Halal%")
      .eq("status", "active")
      .eq("client_id", clientId),

    supabaseServer
      .from("animal_certifications")
      .select("animal_id, certification_name, status")
      .eq("status", "expired")
      .eq("client_id", clientId),

    supabaseServer
      .from("properties")
      .select("id, name, city, state, lat, lng")
      .eq("client_id", clientId),

    // Market view — sem client_id direto; filtrado indiretamente pelo passportCache
    supabaseServer
      .from("agraas_market_animals")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(6),

    supabaseServer
      .from("events")
      .select("animal_id, event_type, notes, event_date")
      .eq("client_id", clientId)
      .order("event_date", { ascending: false })
      .limit(6),

    supabaseServer
      .from("animals")
      .select("id, internal_code, agraas_id, birth_date, current_property_id")
      .eq("client_id", clientId),

    // weights não tem client_id — fetch all; alerta só usa animal_ids do passport (já filtrado)
    supabaseServer
      .from("weights")
      .select("animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false }),

    supabaseServer
      .from("applications")
      .select("animal_id, withdrawal_date, product_name")
      .eq("client_id", clientId)
      .gte("withdrawal_date", todayStr),
  ]);

  const passports = (passportsData as PassportCacheRow[] | null) ?? [];
  const marketRows = (marketData as MarketRow[] | null) ?? [];
  const recentEvents = (eventsData as EventRow[] | null) ?? [];
  const animals = (animalsData as AnimalRow[] | null) ?? [];
  const properties = (propertiesData as PropertyRow[] | null) ?? [];
  const weighings = (weighingsData as WeighingRow[] | null) ?? [];
  const activeApps = (activeAppsData as ActiveAppRow[] | null) ?? [];
  // BUG 3 fix: use direct cert queries instead of certifications_json (never populated)
  const halalCerts = (halalCertsData as CertRow[] | null) ?? [];
  const expiredCerts = (expiredCertsData as CertRow[] | null) ?? [];

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  // ── Base metrics ─────────────────────────────────────────────────────────────
  const totalAnimals = passports.length;
  const totalProperties = properties.length;

  const totalScoreAverage =
    totalAnimals > 0
      ? Math.round(
          passports.reduce(
            (acc, item) => acc + Number(item.score_json?.total_score ?? 0),
            0
          ) / totalAnimals
        )
      : 0;

  // BUG 4 fix: build last-weight map from "weights" table (health_json.last_weight never populated)
  const lastWeightMap = new Map<string, number>();
  const lastWeighingDateMap = new Map<string, string>();
  for (const w of weighings) {
    if (!lastWeighingDateMap.has(w.animal_id)) {
      lastWeightMap.set(w.animal_id, w.weight);
      lastWeighingDateMap.set(w.animal_id, w.weighing_date);
    }
  }

  const totalWeightKg = animals.reduce(
    (sum, a) => sum + (lastWeightMap.get(a.id) ?? 0),
    0
  );
  const totalArrobas = Math.round(totalWeightKg / 15);
  const estimatedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(totalArrobas * 330);

  // ── Halal & export KPIs (BUG 3 fix: from direct cert query) ──────────────────
  const halalAnimalIds = new Set(halalCerts.map((c) => c.animal_id));
  const halalCount = halalAnimalIds.size;

  const withdrawalAnimalIds = new Set(activeApps.map((a) => a.animal_id));

  const exportReadyCount = passports.filter((p) => {
    const score = p.score_json?.total_score ?? 0;
    return (
      score >= 75 &&
      halalAnimalIds.has(p.animal_id) &&
      !withdrawalAnimalIds.has(p.animal_id)
    );
  }).length;

  // ── Alert computation ────────────────────────────────────────────────────────
  // BUG 4 fix: use weighing_date (correct column name)
  const weighingMap = new Map<string, Date>();
  for (const w of weighings) {
    const wDate = new Date(w.weighing_date);
    const existing = weighingMap.get(w.animal_id);
    if (!existing || wDate > existing) {
      weighingMap.set(w.animal_id, wDate);
    }
  }

  // BUG 3 fix: expired cert alerts from direct query
  const expiredByAnimal = new Map<string, string[]>();
  for (const c of expiredCerts) {
    const arr = expiredByAnimal.get(c.animal_id) ?? [];
    arr.push(c.certification_name);
    expiredByAnimal.set(c.animal_id, arr);
  }

  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);

  const alerts: Alert[] = [];

  for (const p of passports) {
    const animalId = p.animal_id;
    const code = p.identity_json?.internal_code ?? animalId;
    const href = `/animais/${animalId}`;

    // Weighing alerts
    const lastWeigh = weighingMap.get(animalId);
    if (lastWeigh) {
      const lastWeighDate = new Date(lastWeigh);
      lastWeighDate.setHours(0, 0, 0, 0);
      const daysSince = Math.floor(
        (todayDate.getTime() - lastWeighDate.getTime()) / 86400000
      );
      if (daysSince > 45) {
        alerts.push({
          animal_id: animalId,
          code,
          problem: `Sem pesagem há ${daysSince} dias`,
          days: daysSince,
          type: "critical",
          href,
        });
      } else if (daysSince > 30) {
        alerts.push({
          animal_id: animalId,
          code,
          problem: `Sem pesagem há ${daysSince} dias`,
          days: daysSince,
          type: "warning",
          href,
        });
      }
    }

    // Expired cert alerts (BUG 3 fix: from direct query)
    const expiredNames = expiredByAnimal.get(animalId);
    if (expiredNames && expiredNames.length > 0) {
      alerts.push({
        animal_id: animalId,
        code,
        problem: `Certificação vencida: ${expiredNames.join(", ")}`,
        type: "cert",
        href,
      });
    }
  }

  // Withdrawal alerts
  const processedWithdrawal = new Set<string>();
  for (const app of activeApps) {
    if (processedWithdrawal.has(app.animal_id)) continue;
    processedWithdrawal.add(app.animal_id);
    const p = passports.find((pp) => pp.animal_id === app.animal_id);
    const code = p?.identity_json?.internal_code ?? app.animal_id;
    const href = `/animais/${app.animal_id}`;
    const withdrawalDate = new Date(app.withdrawal_date);
    withdrawalDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil(
      (withdrawalDate.getTime() - todayDate.getTime()) / 86400000
    );
    alerts.push({
      animal_id: app.animal_id,
      code,
      problem: `Carência ativa: ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""} restante${daysRemaining !== 1 ? "s" : ""}`,
      days: daysRemaining,
      type: "withdrawal",
      href,
    });
  }

  const totalActiveAlerts = alerts.length;

  // ── Top animals ──────────────────────────────────────────────────────────────
  const topAnimals = passports
    .map((item) => ({
      animal_id: item.animal_id,
      internal_code: item.identity_json?.internal_code ?? item.animal_id,
      total_score: Number(item.score_json?.total_score ?? 0),
      status: item.identity_json?.status ?? "-",
      // BUG 4 fix: last_weight from weights table
      last_weight: lastWeightMap.get(item.animal_id) ?? null,
      // BUG 3 fix: hasHalal from direct cert query
      hasHalal: halalAnimalIds.has(item.animal_id),
    }))
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 5);

  // ── Map properties (BUG 2 fix: use animals.current_property_id, not ownership_json) ──
  const propertyScores = new Map<string, number[]>();
  for (const animal of animals) {
    const propId = animal.current_property_id;
    if (!propId) continue;
    const passport = passports.find((p) => p.animal_id === animal.id);
    const score = passport?.score_json?.total_score ?? 0;
    const arr = propertyScores.get(propId) ?? [];
    arr.push(score);
    propertyScores.set(propId, arr);
  }

  const propertiesForMap = properties
    .filter((prop) => prop.lat !== null && prop.lng !== null)
    .map((prop) => {
      const scores = propertyScores.get(prop.id) ?? [];
      return {
        id: prop.id,
        name: prop.name,
        city: prop.city ?? "",
        state: prop.state ?? "",
        lat: prop.lat as number,
        lng: prop.lng as number,
        animalsCount: scores.length,
        scoreAvg:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0,
      };
    });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-8">
      {/* ── 1. Hero executivo ── */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.16)_0%,rgba(122,168,76,0.00)_70%)]" />

        <div className="ag-badge ag-badge-green">Painel executivo</div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] lg:text-5xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-base text-[var(--text-secondary)]">
              {dateDisplay}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/animais" className="ag-button-primary">
              Explorar animais
            </Link>
            <Link href="/inteligencia" className="ag-button-secondary">
              Inteligência
            </Link>
            <Link href="/cadeia" className="ag-button-secondary">
              Cadeia
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {halalCount > 0 && (
            <div className="mb-4 flex justify-end">
              <div
                className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2"
                title="Animais com certificação Halal ativa"
              >
                <HalalBadgeSVG size={48} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Halal Certified</p>
                  <p className="text-2xl font-bold tracking-tight text-emerald-700">{halalCount}</p>
                  <p className="text-xs text-emerald-500">animais certificados</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <HeroStat
              label="Animais monitorados"
              value={totalAnimals}
              description="no passaporte vivo da Agraas"
            />
            <HeroStat
              label="Propriedades ativas"
              value={totalProperties}
              description="unidades operacionais mapeadas"
            />
            <HeroStat
              label="Alertas ativos"
              value={totalActiveAlerts}
              description={
                totalActiveAlerts > 0
                  ? "requerem atenção imediata"
                  : "operação em dia"
              }
              alert={totalActiveAlerts > 0}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Alertas críticos ── */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Atenção imediata</h2>
            <p className="ag-section-subtitle">
              Animais que requerem ação agora.
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
              totalActiveAlerts > 0
                ? "bg-red-100 text-red-700"
                : "ag-badge ag-badge-green"
            }`}
          >
            {totalActiveAlerts > 0
              ? `${totalActiveAlerts} alerta${totalActiveAlerts !== 1 ? "s" : ""}`
              : "Tudo certo"}
          </span>
        </div>

        {totalActiveAlerts === 0 ? (
          <div className="flex items-center gap-4 rounded-3xl border border-green-200 bg-green-50 p-6">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <IconCheck />
            </div>
            <div>
              <p className="font-semibold text-green-800">
                Operação em dia — nenhum alerta ativo
              </p>
              <p className="mt-1 text-sm text-green-700">
                Todos os animais estão dentro dos parâmetros esperados.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {/* ── 3. KPIs ── */}
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Animais"
          value={totalAnimals}
          icon={<IconAnimal />}
          subtitle="base animal monitorada"
        />
        <KpiCard
          label="Score médio"
          value={totalScoreAverage}
          icon={<IconScore />}
          subtitle="confiança média do rebanho"
          valueSuffix=" pts"
        />
        <KpiCard
          label="Arrobas totais"
          value={totalArrobas}
          icon={<IconWeight />}
          subtitle="peso vivo estimado da base"
          valueSuffix=" @"
        />
        <KpiCard
          label="Valor estimado"
          value={estimatedValue}
          icon={<IconCurrency />}
          subtitle="base · R$ 330/@"
        />
        <KpiCard
          label="Halal certificados"
          value={halalCount}
          icon={<IconHalal />}
          subtitle="com certificação Halal ativa"
          highlight
        />
        <KpiCard
          label="Aptos exportação"
          value={exportReadyCount}
          icon={<IconPlane />}
          subtitle="score ≥ 75 + Halal + sem carência"
          highlight
        />
      </section>

      {/* ── 4. Mapa + Top 5 ── */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="ag-card p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Fazendas ativas</h2>
              <p className="ag-section-subtitle">
                Distribuição geográfica das propriedades com score médio.
              </p>
            </div>
            <Link href="/propriedades" className="ag-button-secondary">
              Ver todas
            </Link>
          </div>

          <div className="h-[360px] overflow-hidden rounded-3xl">
            {propertiesForMap.length > 0 ? (
              <BrazilMapWrapper properties={propertiesForMap} />
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--surface-soft)] text-sm text-[var(--text-muted)]">
                Nenhuma propriedade com coordenadas registradas.
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#5d9c44]" />
              Score ≥ 70
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#d97706]" />
              50 – 69
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#dc2626]" />
              &lt; 50
            </span>
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Top 5 animais</h2>
              <p className="ag-section-subtitle">
                Maiores scores consolidados da base.
              </p>
            </div>
            <Link href="/scores" className="ag-button-secondary">
              Ver ranking
            </Link>
          </div>

          {passportsError ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-5 text-sm text-[var(--danger)]">
              Erro ao carregar a base.
            </div>
          ) : topAnimals.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
              Nenhum animal encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {topAnimals.map((animal, index) => {
                const scorePercent = Math.max(
                  6,
                  Math.round(Math.min(100, animal.total_score))
                );
                return (
                  <Link
                    key={animal.animal_id}
                    href={`/animais/${animal.animal_id}`}
                    className="block rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:border-[rgba(93,156,68,0.25)] hover:bg-[var(--primary-soft)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-semibold shadow-[var(--shadow-soft)]">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {animal.internal_code}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {animal.hasHalal && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                                Halal
                              </span>
                            )}
                            <span className="text-xs text-[var(--text-muted)]">
                              {animal.last_weight
                                ? `${animal.last_weight} kg`
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--primary-hover)]">
                        {animal.total_score}
                      </p>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.12)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Eventos recentes ── */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Últimos eventos</h2>
            <p className="ag-section-subtitle">
              Trilha operacional registrada na base.
            </p>
          </div>
          <Link href="/eventos" className="ag-button-secondary">
            Ver timeline
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recentEvents.length === 0 ? (
            <div className="col-span-full rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento encontrado.
            </div>
          ) : (
            recentEvents.map((event, index) => (
              <div
                key={`${event.animal_id}-${event.event_date}-${index}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="ag-badge ag-badge-green text-xs">
                    {formatEventType(event.event_type ?? "")}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                  {event.animal_id
                    ? animalMap.get(event.animal_id) ?? event.animal_id
                    : "-"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {event.notes ?? "Sem observações."}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 6. Market intelligence ── */}
      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Market intelligence</h2>
            <p className="ag-section-subtitle">
              Ativos mais fortes com leitura comercial imediata.
            </p>
          </div>
          <Link href="/market" className="ag-button-secondary">
            Abrir market
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {marketRows.length === 0 ? (
            <div className="col-span-full rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum ativo disponível.
            </div>
          ) : (
            marketRows.slice(0, 4).map((animal) => (
              <Link
                key={animal.animal_id}
                href={`/animais/${animal.animal_id}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {animal.internal_code ?? animal.animal_id}
                  </p>
                  <p className="text-xl font-semibold text-[var(--primary-hover)]">
                    {animal.total_score ?? "-"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {animal.property_name ?? "Propriedade não informada"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="ag-badge ag-badge-green text-xs">
                    {animal.last_weight ?? "-"} kg
                  </span>
                  <span className="ag-badge ag-badge-dark text-xs">
                    {formatStatus(animal.status)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  description,
  alert = false,
}: {
  label: string;
  value: string | number;
  description: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        alert
          ? "border-red-200 bg-red-50"
          : "border-[var(--border)] bg-[var(--surface-soft)]"
      }`}
    >
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${
          alert ? "text-red-600" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const styles: Record<
    Alert["type"],
    { border: string; bg: string; badge: string; icon: React.ReactNode }
  > = {
    critical: {
      border: "border-red-200",
      bg: "bg-red-50",
      badge: "bg-red-100 text-red-700",
      icon: <IconAlertCritical />,
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      icon: <IconAlertWarning />,
    },
    withdrawal: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      icon: <IconClock />,
    },
    cert: {
      border: "border-yellow-200",
      bg: "bg-yellow-50",
      badge: "bg-yellow-100 text-yellow-800",
      icon: <IconCertExpired />,
    },
  };

  const s = styles[alert.type];

  return (
    <div className={`rounded-3xl border ${s.border} ${s.bg} p-5`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          {s.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-primary)]">
            {alert.code}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {alert.problem}
          </p>
        </div>
      </div>

      <Link
        href={alert.href}
        className="mt-4 block rounded-2xl border border-white bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:shadow-md"
      >
        Ver passaporte →
      </Link>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  subtitle,
  valueSuffix,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle: string;
  valueSuffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`ag-card flex min-h-[180px] flex-col p-6 ${highlight ? "ring-1 ring-[rgba(93,156,68,0.18)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] shadow-[var(--shadow-soft)]">
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Live
        </span>
      </div>
      <p className="mt-5 ag-kpi-label">{label}</p>
      <p className="mt-2 truncate ag-kpi-value">
        {value}
        {valueSuffix && (
          <span className="text-lg font-medium text-[var(--text-secondary)]">
            {valueSuffix}
          </span>
        )}
      </p>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

function IconAnimal() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5d9c44"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M3 17l3-6 4 7 3-4 4 6" />
      <circle cx="18" cy="5" r="2" />
    </svg>
  );
}

function IconScore() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5d9c44"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconWeight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5d9c44"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M12 2a4 4 0 0 1 4 4H8a4 4 0 0 1 4-4z" />
      <path d="M2 22l2.5-16h15L22 22H2z" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function IconCurrency() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5d9c44"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
      <line x1="12" y1="6" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="18" />
    </svg>
  );
}

function IconHalal() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5d9c44"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconPlane() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5d9c44"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#16a34a"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconAlertCritical() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#dc2626"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconAlertWarning() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d97706"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d97706"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCertExpired() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ca8a04"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M8 10h8M8 14h4" />
    </svg>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

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
    ACTIVE: "Ativo",
  };
  return map[value] ?? map[value.toLowerCase()] ?? value;
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    BIRTH: "Nascimento",
    RFID_LINKED: "RFID vinculado",
    WEIGHT_RECORDED: "Pesagem",
    HEALTH_APPLICATION: "Aplicação",
    LOT_ENTRY: "Entrada em lote",
    OWNERSHIP_TRANSFER: "Transferência",
    SALE: "Venda",
    SLAUGHTER: "Abate",
    CERTIFICATION: "Certificação",
    birth: "Nascimento",
    rfid_assigned: "Identificação",
    health_application: "Aplicação",
    weight_recorded: "Pesagem",
    sale: "Venda",
    ownership_transfer: "Transferência",
    lot_entry: "Lote",
    slaughter: "Abate",
    weighing: "Pesagem",
    application: "Aplicação",
  };
  return map[value] ?? value.replaceAll("_", " ");
}
