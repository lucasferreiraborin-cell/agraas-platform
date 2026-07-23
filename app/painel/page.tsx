import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock4,
  Truck,
  CircleCheck,
  Scale,
  Trophy,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import BrazilMapWrapper from "@/app/components/BrazilMapWrapper";
import NotificationBanner from "@/app/components/NotificationBanner";
import DailyInsightsProdutor from "@/app/components/DailyInsightsProdutor";
import { CotacaoBadge } from "@/app/components/CotacaoBadge";
import { getCotacaoArroba } from "@/lib/cotacao";
import InstituicoesParceirasCard from "@/app/components/InstituicoesParceirasCard";
import AdminSwitcher from "@/app/components/AdminSwitcher";
import { roleToPersona } from "@/lib/persona-themes";

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

  // Redireciona compradores e bancos para suas páginas dedicadas
  if (clientData?.role === "buyer") redirect("/comprador");
  if (clientData?.role === "bank") redirect("/banco");

  // clientId is used to filter every query explicitly —
  // some tables (passport cache, properties) have no RLS.
  // Using a UUID that matches nothing as fallback ensures zero leakage.
  const clientId =
    clientData?.id ?? "00000000-0000-0000-0000-000000000000";

  const isFsjbePilot = clientId === "00000000-0000-0000-0003-000000000001";

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
    { data: halalCertsData, error: halalCertsError },
    { data: expiredCertsData, error: expiredCertsError },
    { data: propertiesData },
    { data: marketData },
    { data: eventsData },
    { data: animalsData },
    { data: weighingsData },
    { data: activeAppsData },
    { data: upcomingLotsData },
    { data: staleTrackingData },
  ] = await Promise.all([
    // Explicit client_id filter on all tables — some have no RLS
    supabaseServer
      .from("agraas_master_passport_cache")
      .select("*")
      .eq("client_id", clientId),

    // Schema drift: animal_certifications NÃO tem client_id. Escopamos por cliente
    // via join animals!inner(client_id) — mesmo padrão do dossiê. Sem isso, esta
    // query vazava Halal cross-tenant no KPI de exportação.
    supabaseServer
      .from("animal_certifications")
      .select("animal_id, certification_name, status, animals!inner(client_id)")
      .ilike("certification_name", "%Halal%")
      .eq("status", "active")
      .eq("animals.client_id", clientId),

    // Schema drift: .eq("client_id", clientId) apontava para coluna inexistente →
    // supabase retornava error e data null (calado), então o alerta de "Certificação
    // vencida" nunca aparecia. Correção: filtrar via animais do cliente.
    supabaseServer
      .from("animal_certifications")
      .select("animal_id, certification_name, status, animals!inner(client_id)")
      .eq("status", "expired")
      .eq("animals.client_id", clientId),

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
      .select("animal_id, event_type, notes, event_date, animals!inner(client_id)")
      .eq("animals.client_id", clientId)
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

    supabaseServer
      .from("lots")
      .select("id, data_embarque")
      .eq("client_id", clientId)
      .gte("data_embarque", todayStr)
      .lte("data_embarque", new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]),

    supabaseServer
      .from("shipment_tracking")
      .select("id, lot_id, stage, created_at")
      .eq("client_id", clientId)
      .neq("stage", "entregue")
      .lt("created_at", new Date(now.getTime() - 5 * 86400000).toISOString()),
  ]);

  // ── Sprint B · Instituições parceiras (banco/cooperativa) ───────────────────
  const { data: instituicoesParceirasRaw } = await supabaseServer
    .from("bank_producer_relationships")
    .select(`
      id, relationship_type, granted_by_producer, granted_at, created_at,
      bank:clients!bank_producer_relationships_bank_client_id_fkey(id, name)
    `)
    .eq("producer_client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const instituicoesParceiras = ((instituicoesParceirasRaw ?? []) as Array<{
    id: string;
    relationship_type: string;
    granted_by_producer: boolean;
    granted_at: string | null;
    created_at: string;
    bank: { id: string; name: string } | { id: string; name: string }[] | null;
  }>).map((row) => ({
    id: row.id,
    bank_name: Array.isArray(row.bank) ? (row.bank[0]?.name ?? "Instituição") : (row.bank?.name ?? "Instituição"),
    relationship_type: row.relationship_type as "credit_analysis" | "portfolio_monitoring" | "loan_active",
    granted_by_producer: row.granted_by_producer,
    granted_at: row.granted_at,
    created_at: row.created_at,
  }));

  const passports = (passportsData as PassportCacheRow[] | null) ?? [];
  const marketRows = (marketData as MarketRow[] | null) ?? [];
  const recentEvents = (eventsData as EventRow[] | null) ?? [];
  const animals = (animalsData as AnimalRow[] | null) ?? [];
  const properties = (propertiesData as PropertyRow[] | null) ?? [];
  const weighings = (weighingsData as WeighingRow[] | null) ?? [];
  const activeApps = (activeAppsData as ActiveAppRow[] | null) ?? [];
  // BUG 3 fix: use direct cert queries instead of certifications_json (never populated)
  // Log de erro do supabase: schema drift antes escondia essas falhas silenciosamente.
  if (halalCertsError) console.error("[painel] animal_certifications (Halal):", halalCertsError);
  if (expiredCertsError) console.error("[painel] animal_certifications (expired):", expiredCertsError);
  const halalCerts = (halalCertsData as unknown as CertRow[] | null) ?? [];
  const expiredCerts = (expiredCertsData as unknown as CertRow[] | null) ?? [];

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  // ── Notification banner counters ────────────────────────────────────────────
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];
  const withdrawals7d = activeApps.filter(a => a.withdrawal_date && a.withdrawal_date <= sevenDaysFromNow).length;

  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
  const animalIdsWithRecentWeight = new Set(
    weighings.filter(w => w.weighing_date && w.weighing_date >= thirtyDaysAgoStr).map(w => w.animal_id)
  );
  const noPesagem30d = animals.filter(a => !animalIdsWithRecentWeight.has(a.id)).length;

  const lotsUpcoming = (upcomingLotsData ?? []).length;
  const shipmentsStale = (staleTrackingData ?? []).length;

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

  // ── Médias dos 5 pilares Embrapa Doc 237 (Score v3) ─────────────────────────
  // productive_score, sanitary_score, operational_score (Rastreabilidade v3),
  // continuity_score (placeholder Reprodutivo PREPARADO) já vêm do passport_cache.
  // certificações: contagem média de certificações ativas × 25 (cap 100).
  const avgPilar = (key: "productive_score" | "sanitary_score" | "operational_score") =>
    totalAnimals > 0
      ? Math.round(
          passports.reduce(
            (acc, item) => acc + Number((item.score_json as Record<string, number>)?.[key] ?? 0),
            0,
          ) / totalAnimals,
        )
      : 0;

  const pilarProdutivo       = avgPilar("productive_score");
  const pilarSanidade        = avgPilar("sanitary_score");
  const pilarRastreabilidade = avgPilar("operational_score"); // col compat: operational_score guarda rastreabilidade v3

  const certificacoesMedia = totalAnimals > 0
    ? Math.min(100, Math.round(
        (passports.reduce((acc, p) => {
          const certs = (p.certifications_json ?? []) as Array<{ status?: string }>;
          return acc + certs.filter(c => (c.status ?? "").toLowerCase() === "active").length;
        }, 0) / totalAnimals) * 25))
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
  const totalArrobas = Math.round(totalWeightKg / 30); // peso vivo: 1 arroba = 30 kg

  // T1.7 (17/06/2026): cotação dinâmica do banco com fallback seguro.
  // Em vez de hardcode R$ 330, agora valoriza pelo último snapshot CEPEA.
  const cotacaoSnap = await getCotacaoArroba();
  const estimatedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(totalArrobas * cotacaoSnap.value);

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
    .slice(0, 10);

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

  // ── Pulse summary (faixa horizontal de operação) ───────────────────────────
  const pulseItems = [
    {
      label: "Carências",
      value: withdrawals7d,
      detail: withdrawals7d > 0 ? "vencendo em 7 dias" : "nenhuma vencendo",
      tone: withdrawals7d > 0 ? "amber" : "neutral",
      href: "/alertas",
      Icon: Clock4,
    },
    {
      label: "Sem pesagem",
      value: noPesagem30d,
      detail: noPesagem30d > 0 ? "há mais de 30 dias" : "rebanho em dia",
      tone: noPesagem30d > 0 ? "amber" : "neutral",
      href: "/animais",
      Icon: Scale,
    },
    {
      label: "Embarques",
      value: shipmentsStale,
      detail: shipmentsStale > 0 ? "sem atualização há 5+ dias" : "tracking saudável",
      tone: shipmentsStale > 0 ? "red" : "neutral",
      href: "/tracking",
      Icon: Truck,
    },
    {
      label: "Cotação @",
      value: `R$ ${cotacaoSnap.value.toFixed(0)}`,
      detail: cotacaoSnap.isStale ? "snapshot desatualizado" : "snapshot CEPEA recente",
      tone: cotacaoSnap.isStale ? "amber" : "neutral",
      href: "/inteligencia",
      Icon: Wheat,
    },
  ] as const;

  return (
    <main className="space-y-10">
      <NotificationBanner
        withdrawals7d={withdrawals7d}
        noPesagem30d={noPesagem30d}
        shipmentsStale={shipmentsStale}
        lotsUpcoming={lotsUpcoming}
      />

      {/* ── 1. Hero institucional ── */}
      <section className="relative ag-card-strong overflow-hidden p-8 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(46,139,62,0.10)_0%,rgba(46,139,62,0.00)_70%)]" />

        <div className="relative flex flex-wrap items-center gap-2">
          <div className="ag-badge ag-badge-green">Painel do produtor</div>
          <CotacaoBadge compact />
          {roleToPersona(clientData?.role) === "admin" && (
            <AdminSwitcher currentViewing="produtor" isViewingAs={false} />
          )}
          {isFsjbePilot && (
            <div
              title="5 animais ilustrativos enquanto o tombamento Multbovinos → Agraas é concluído. Score, peso e eventos são representativos."
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Piloto FSJBE · dados ilustrativos
            </div>
          )}
        </div>

        <div className="relative mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-end">
          <div>
            <p className="text-sm text-[var(--text-muted)]">{dateDisplay}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] [text-wrap:balance] sm:text-4xl sm:tracking-[-0.05em] lg:text-[3.25rem] lg:leading-[1.05]">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-[var(--text-primary)]/80 lg:text-xl">
              Cada animal, um{" "}
              <strong className="font-semibold text-[var(--primary)]">
                ativo digital
              </strong>{" "}
              — rastreável, auditável, mensurável e negociável. O resumo abaixo é a leitura do seu rebanho hoje.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
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

          {/* Hero KPI mestre + 3 satélites */}
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Valor estimado do rebanho
            </p>
            <p
              className="mt-2 truncate text-4xl font-bold leading-none tracking-[-0.05em] text-[var(--primary-hover)] sm:text-5xl"
              title={estimatedValue}
            >
              {estimatedValue}
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              base · R$ {cotacaoSnap.value.toFixed(2).replace(".", ",")}/@
              {cotacaoSnap.isStale ? " (snapshot desatualizado)" : ""}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-5">
              <HeroSatellite label="Animais" value={totalAnimals} />
              <HeroSatellite label="Score médio" value={`${totalScoreAverage}`} sub="/100" />
              <HeroSatellite label="Arrobas" value={`${totalArrobas}`} sub="@" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Pulso operacional · faixa horizontal compacta ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pulseItems.map((item) => (
          <PulseCard key={item.label} {...item} />
        ))}
      </section>

      {/* ── 3. Atenção imediata · alertas por animal ── */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Animais que pedem atenção</h2>
            <p className="ag-section-subtitle">
              Ações pendentes detectadas pelo passaporte vivo da Agraas.
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
              ? `${totalActiveAlerts} item${totalActiveAlerts !== 1 ? "s" : ""}`
              : "Tudo em dia"}
          </span>
        </div>

        {totalActiveAlerts === 0 ? (
          <div className="flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CircleCheck size={20} className="text-emerald-700" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">
                Rebanho dentro dos parâmetros esperados
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Nenhuma carência expirando, pesagem em atraso ou certificação vencida no momento.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.slice(0, 6).map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {/* ── Score v3 · Pilares Embrapa Doc 237 ─────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                v3 · Embrapa Doc 237
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Implementação Agraas da Plataforma +Precoce
              </span>
            </div>
            <h2 className="mt-2 ag-section-title">Score Agraas · pilares do rebanho</h2>
            <p className="ag-section-subtitle">
              Médias agregadas dos 5 pilares ancorados na metodologia Embrapa Gado de Corte (Costa et al., 2018).
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Score médio total</p>
            <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--primary-hover)]">
              {totalScoreAverage}<span className="text-base font-normal text-[var(--text-muted)]">/100</span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Produtivo", value: pilarProdutivo, weight: 36, sub: "GMD + Peso × Idade" },
            { label: "Sanidade", value: pilarSanidade, weight: 25, sub: "histórico + carência + recência" },
            { label: "Rastreabilidade", value: pilarRastreabilidade, weight: 29, sub: "RFID + genealogia + eventos" },
            { label: "Certificações", value: certificacoesMedia, weight: 10, sub: "Boi Verde · BR · GAP" },
          ].map((pilar) => (
            <div key={pilar.label} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {pilar.label}
                </p>
                <span className="text-[10px] font-semibold text-[var(--primary-hover)]">{pilar.weight}%</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">{pilar.value}</span>
                <span className="text-xs text-[var(--text-muted)]">/100</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#3DA54C_0%,#2E8B3E_100%)] transition-all"
                  style={{ width: `${Math.max(2, pilar.value)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">{pilar.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-3">
          <p className="text-xs leading-5 text-amber-900">
            <strong className="font-semibold">Pilar Reprodutivo (15%) preparado</strong> — IEP, taxa de prenhez individual,
            idade ao primeiro parto. Peso redistribuído (40% Produtivo, 60% Rastreabilidade) enquanto os dados estruturados
            não são populados. Ativação prevista pós-mentoria IZ-SP.
          </p>
        </div>
      </section>

      {/* ── Transparência LGPD: instituições parceiras (banco/cooperativa) ── */}
      {instituicoesParceiras.length > 0 && (
        <section>
          <InstituicoesParceirasCard parceiras={instituicoesParceiras} />
        </section>
      )}

      {/* ── 4. Leitura do dia · Insights Agraas (Claude Sonnet 4.6) ── */}
      <DailyInsightsProdutor />

      {/* ── 5. Mapa de propriedades + Top 10 ── */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="ag-card p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Geografia do rebanho</h2>
              <p className="ag-section-subtitle">
                Propriedades ativas mapeadas no Brasil — cor indica o score médio por unidade.
              </p>
            </div>
            <Link href="/propriedades" className="ag-button-secondary">
              Ver todas
            </Link>
          </div>

          <div className="h-[420px] overflow-hidden rounded-3xl">
            {propertiesForMap.length > 0 ? (
              <BrazilMapWrapper properties={propertiesForMap} />
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--surface-soft)] text-sm text-[var(--text-muted)]">
                Nenhuma propriedade com coordenadas registradas.
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-6 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[var(--primary)]" />
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
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                  <Trophy size={14} className="text-[var(--primary-hover)]" />
                </span>
                <h2 className="ag-section-title">Top do rebanho</h2>
              </div>
              <p className="ag-section-subtitle">
                Os 10 maiores scores consolidados pela metodologia v3.
              </p>
            </div>
            <Link href="/scores" className="ag-button-secondary">
              Ranking
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
            <ol className="space-y-2.5">
              {topAnimals.map((animal, index) => {
                const scorePercent = Math.max(
                  6,
                  Math.round(Math.min(100, animal.total_score))
                );
                const isPodium = index < 3;
                return (
                  <li key={animal.animal_id}>
                    <Link
                      href={`/animais/${animal.animal_id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-3.5 transition hover:border-[rgba(46,139,62,0.30)] hover:bg-[var(--primary-soft)]/40"
                    >
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          isPodium
                            ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(46,139,62,0.25)]"
                            : "bg-[var(--surface-soft)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {animal.internal_code}
                          </p>
                          <p className="flex-shrink-0 text-lg font-semibold tracking-[-0.04em] text-[var(--primary-hover)]">
                            {animal.total_score}
                            <span className="ml-0.5 text-[10px] font-normal text-[var(--text-muted)]">
                              /100
                            </span>
                          </p>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(46,139,62,0.10)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#3DA54C_0%,#2E8B3E_100%)]"
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                          {animal.last_weight ? `${animal.last_weight} kg` : "peso n/d"}
                          {" · "}
                          {formatStatus(animal.status)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* ── 6. Eventos recentes + Inteligência de mercado · 2 colunas compactas ── */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Trilha recente</h2>
              <p className="ag-section-subtitle">
                Últimos eventos registrados no passaporte vivo.
              </p>
            </div>
            <Link href="/eventos" className="ag-button-secondary">
              Timeline
            </Link>
          </div>

          <div className="mt-6 divide-y divide-[var(--border)]">
            {recentEvents.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum evento encontrado.
              </div>
            ) : (
              recentEvents.map((event, index) => (
                <div
                  key={`${event.animal_id}-${event.event_date}-${index}`}
                  className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <span className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatEventType(event.event_type ?? "")}
                        <span className="ml-2 font-normal text-[var(--text-muted)]">
                          ·{" "}
                          {event.animal_id
                            ? animalMap.get(event.animal_id) ?? event.animal_id
                            : "-"}
                        </span>
                      </p>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {event.event_date
                          ? new Date(event.event_date).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Ativos em destaque</h2>
              <p className="ag-section-subtitle">
                Animais com leitura comercial imediata no mercado Agraas.
              </p>
            </div>
            <Link href="/market" className="ag-button-secondary">
              Abrir
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {marketRows.length === 0 ? (
              <div className="col-span-full rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum ativo disponível.
              </div>
            ) : (
              marketRows.slice(0, 4).map((animal) => (
                <Link
                  key={animal.animal_id}
                  href={`/animais/${animal.animal_id}`}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4 transition hover:border-[rgba(46,139,62,0.30)] hover:bg-[var(--primary-soft)]/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      {animal.internal_code ?? animal.animal_id}
                    </p>
                    <p className="flex-shrink-0 text-lg font-semibold tracking-[-0.03em] text-[var(--primary-hover)]">
                      {animal.total_score ?? "-"}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                    {animal.property_name ?? "Propriedade n/i"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-hover)]">
                      {animal.last_weight ?? "-"} kg
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                      {formatStatus(animal.status)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroSatellite({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-1.5 truncate text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]"
        title={String(value)}
      >
        {value}
        {sub && (
          <span className="ml-0.5 text-xs font-normal text-[var(--text-muted)]">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

type PulseTone = "neutral" | "amber" | "red";

function PulseCard({
  label,
  value,
  detail,
  tone,
  href,
  Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: PulseTone;
  href: string;
  Icon: LucideIcon;
}) {
  const palette: Record<
    PulseTone,
    { border: string; iconBg: string; iconCl: string; valueCl: string }
  > = {
    neutral: {
      border: "border-[var(--border)] hover:border-[rgba(46,139,62,0.30)]",
      iconBg: "bg-[var(--primary-soft)]",
      iconCl: "text-[var(--primary-hover)]",
      valueCl: "text-[var(--text-primary)]",
    },
    amber: {
      border: "border-amber-200 hover:border-amber-300",
      iconBg: "bg-amber-100",
      iconCl: "text-amber-700",
      valueCl: "text-amber-800",
    },
    red: {
      border: "border-red-200 hover:border-red-300",
      iconBg: "bg-red-100",
      iconCl: "text-red-700",
      valueCl: "text-red-700",
    },
  };
  const p = palette[tone];
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border bg-white p-4 transition ${p.border}`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${p.iconBg}`}
      >
        <Icon size={18} className={p.iconCl} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-xl font-semibold tracking-[-0.03em] ${p.valueCl}`}
          title={String(value)}
        >
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          {detail}
        </p>
      </div>
      <ArrowUpRight
        size={14}
        className="flex-shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100"
      />
    </Link>
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


// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

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
