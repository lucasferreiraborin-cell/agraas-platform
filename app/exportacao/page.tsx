"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type ExportLot = {
  id: string; name: string;
  pais_destino: string | null; porto_embarque: string | null;
  data_embarque: string | null; certificacoes_exigidas: string[] | null;
  numero_contrato: string | null; status: string | null;
};
type LotAssignment = {
  lot_id: string; animal_id: string;
  nickname: string | null; internal_code: string | null;
  breed: string | null; current_property_id: string | null;
};
type ScoreRow = { animal_id: string; score_json: Record<string, unknown> | null };
type CertRow = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type AppRow = { animal_id: string; withdrawal_date: string | null };
type WeightRow = { animal_id: string; weight: number; weighing_date: string | null };
type PropertyRow = { id: string; name: string };

export default function ExportacaoPage() {
  const [lots, setLots] = useState<ExportLot[]>([]);
  const [assignments, setAssignments] = useState<LotAssignment[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: lotsData } = await supabase
      .from("lots")
      .select("id, name, pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, numero_contrato, status")
      .eq("objective", "Exportação");

    const lotList = (lotsData as ExportLot[]) ?? [];
    setLots(lotList);
    if (lotList.length === 0) { setLoading(false); return; }

    const lotIds = lotList.map(l => l.id);

    // Step 1: get raw lot_id + animal_id without join (join falha silenciosamente se coluna não existe)
    const { data: rawAssign } = await supabase
      .from("animal_lot_assignments")
      .select("lot_id, animal_id")
      .in("lot_id", lotIds)
      .is("exit_date", null);

    const rawList = (rawAssign ?? []) as { lot_id: string; animal_id: string }[];
    const animalIds = [...new Set(rawList.map(a => a.animal_id))];
    if (animalIds.length === 0) { setLoading(false); return; }

    // Step 2: buscar dados dos animais + cache de scores + certs + carências em paralelo
    const [
      { data: animalsData },
      { data: scoreData },
      { data: certData },
      { data: appData },
      { data: weightData },
    ] = await Promise.all([
      supabase.from("animals").select("id, nickname, internal_code, breed, current_property_id").in("id", animalIds),
      supabase.from("agraas_master_passport_cache").select("animal_id, score_json").in("animal_id", animalIds),
      supabase.from("animal_certifications").select("animal_id, certification_name, status, expires_at").in("animal_id", animalIds),
      supabase.from("applications").select("animal_id, withdrawal_date").in("animal_id", animalIds),
      supabase.from("weights").select("animal_id, weight, weighing_date").in("animal_id", animalIds).order("weighing_date", { ascending: false }),
    ]);

    // Montar assignList com dados dos animais
    const animalDataMap = new Map<string, any>((animalsData ?? []).map((a: any) => [a.id, a]));
    const assignList: LotAssignment[] = rawList.map(r => {
      const animal = animalDataMap.get(r.animal_id);
      return {
        lot_id: r.lot_id,
        animal_id: r.animal_id,
        nickname: animal?.nickname ?? null,
        internal_code: animal?.internal_code ?? null,
        breed: animal?.breed ?? null,
        current_property_id: animal?.current_property_id ?? null,
      };
    });
    setAssignments(assignList);

    setScores((scoreData as ScoreRow[]) ?? []);
    setCerts((certData as CertRow[]) ?? []);
    setApps((appData as AppRow[]) ?? []);
    setWeights((weightData as WeightRow[]) ?? []);

    const propIds = [...new Set(assignList.map(a => a.current_property_id).filter(Boolean) as string[])];
    if (propIds.length > 0) {
      const { data: propData } = await supabase.from("properties").select("id, name").in("id", propIds);
      setProperties((propData as PropertyRow[]) ?? []);
    }

    setLoading(false);
  }

  const today = new Date();

  const scoreByAnimal = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scores) {
      const val = (s.score_json as any)?.overall;
      if (val != null) map.set(s.animal_id, Number(val));
    }
    return map;
  }, [scores]);

  const certsByAnimal = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of certs) {
      if (c.status === "active" && (!c.expires_at || new Date(c.expires_at) > today)) {
        const list = map.get(c.animal_id) ?? [];
        list.push(c.certification_name);
        map.set(c.animal_id, list);
      }
    }
    return map;
  }, [certs]);

  const hasCarenciaByAnimal = useMemo(() => {
    const set = new Set<string>();
    for (const a of apps) {
      if (a.withdrawal_date && new Date(a.withdrawal_date) > today) set.add(a.animal_id);
    }
    return set;
  }, [apps]);

  const lastWeightByAnimal = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of weights) {
      if (!map.has(w.animal_id)) map.set(w.animal_id, Number(w.weight));
    }
    return map;
  }, [weights]);

  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) map.set(p.id, p.name);
    return map;
  }, [properties]);

  // Per-lot conformity
  const lotStats = useMemo(() => {
    return lots.map(lot => {
      const lotAnimals = assignments.filter(a => a.lot_id === lot.id);
      const certRequired = lot.certificacoes_exigidas ?? [];
      let aptos = 0; let inaptos = 0; let pendencias = 0;

      for (const a of lotAnimals) {
        const score = scoreByAnimal.get(a.animal_id) ?? 0;
        const animalCerts = certsByAnimal.get(a.animal_id) ?? [];
        const certsFaltando = certRequired.filter(c => !animalCerts.includes(c));
        const carencia = hasCarenciaByAnimal.has(a.animal_id);

        if (score < 60 || carencia) inaptos++;
        else if (certsFaltando.length > 0) pendencias++;
        else aptos++;
      }

      const total = lotAnimals.length;
      const pct = total > 0 ? Math.round((aptos / total) * 100) : 0;
      return { lot, total, aptos, inaptos, pendencias, pct };
    });
  }, [lots, assignments, scoreByAnimal, certsByAnimal, hasCarenciaByAnimal]);

  // Global KPIs
  const globalStats = useMemo(() => {
    const totalLotes = lots.length;
    const totalAnimais = new Set(assignments.map(a => a.animal_id)).size;
    const avgConformidade =
      lotStats.length > 0
        ? Math.round(lotStats.reduce((s, l) => s + l.pct, 0) / lotStats.length)
        : 0;
    const nextLot = lots
      .filter(l => l.data_embarque && new Date(l.data_embarque) >= today)
      .sort((a, b) => new Date(a.data_embarque!).getTime() - new Date(b.data_embarque!).getTime())[0];
    return {
      totalLotes,
      totalAnimais,
      avgConformidade,
      nextLotDate: nextLot ? new Date(nextLot.data_embarque!).toLocaleDateString("pt-BR") : "—",
      nextLotDest: nextLot?.pais_destino ?? "",
    };
  }, [lots, assignments, lotStats]);

  const halalAnimaisCount = useMemo(() => {
    const seen = new Set<string>();
    for (const a of assignments) {
      const animalCerts = certsByAnimal.get(a.animal_id) ?? [];
      if (animalCerts.some(c => c.toLowerCase().includes("halal"))) seen.add(a.animal_id);
    }
    return seen.size;
  }, [assignments, certsByAnimal]);

  // Ranking: score ≥ 60, no carência, deduped, sorted desc, max 10
  const ranking = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{
      animal: LotAssignment;
      score: number;
      lastWeight: number | null;
      propertyName: string;
      isHalal: boolean;
    }> = [];

    for (const a of assignments) {
      if (seen.has(a.animal_id)) continue;
      seen.add(a.animal_id);
      const score = scoreByAnimal.get(a.animal_id);
      if (!score || score < 60) continue;
      if (hasCarenciaByAnimal.has(a.animal_id)) continue;
      const lastWeight = lastWeightByAnimal.get(a.animal_id) ?? null;
      const propName = a.current_property_id ? (propertyNameById.get(a.current_property_id) ?? "—") : "—";
      const animalCerts = certsByAnimal.get(a.animal_id) ?? [];
      const isHalal = animalCerts.some(c => c.toLowerCase().includes("halal"));
      result.push({ animal: a, score, lastWeight, propertyName: propName, isHalal });
    }

    return result.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [assignments, scoreByAnimal, hasCarenciaByAnimal, lastWeightByAnimal, propertyNameById, certsByAnimal]);

  if (loading) {
    return (
      <main className="space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-[var(--surface-soft)]" />
        ))}
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* ── Hero ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.1)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-start gap-3">
            <span className="ag-badge ag-badge-green">✈ Exportação</span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
          <h1 className="ag-page-title mt-4">Central de Exportação</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Monitoramento em tempo real de todos os lotes de exportação
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroKPI label="Lotes ativos" value={globalStats.totalLotes} sub="em exportação" />
            <HeroKPI label="Animais" value={globalStats.totalAnimais} sub="em lotes de exportação" />
            <HeroKPI
              label="Conformidade média"
              value={`${globalStats.avgConformidade}%`}
              sub="média entre lotes"
              color={globalStats.avgConformidade >= 80 ? "emerald" : globalStats.avgConformidade >= 50 ? "amber" : "red"}
            />
            <HeroKPI
              label="Próximo embarque"
              value={globalStats.nextLotDate}
              sub={globalStats.nextLotDest || "sem data definida"}
            />
          </div>
          {halalAnimaisCount > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <HalalBadgeSVG size={56} />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{halalAnimaisCount} animais Halal certified</p>
                <p className="text-xs text-[var(--text-muted)]">com certificação Halal ativa nos lotes de exportação</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Cards de lotes ── */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              Lotes ativos
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {lots.length} lote{lots.length !== 1 ? "s" : ""} com objetivo de exportação
            </p>
          </div>
        </div>

        {lots.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-10 text-center">
            <p className="text-[var(--text-muted)]">Nenhum lote de exportação cadastrado.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lotStats.map(({ lot, total, aptos, inaptos, pendencias, pct }) => {
              const borderCls =
                pct >= 60 ? "border-emerald-400/40" : pct > 0 ? "border-amber-400/40" : "border-red-400/40";
              const barGrad =
                pct >= 60
                  ? "from-emerald-500 to-emerald-400"
                  : pct > 0
                  ? "from-amber-500 to-amber-400"
                  : "from-red-500 to-red-400";
              const pctColor =
                pct >= 60 ? "text-emerald-600" : pct > 0 ? "text-amber-600" : "text-red-600";

              return (
                <div
                  key={lot.id}
                  className={`flex flex-col overflow-hidden rounded-3xl border-2 ${borderCls} bg-white shadow-sm transition-shadow hover:shadow-md`}
                >
                  <div className="flex-1 p-6">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                          {lot.name}
                        </p>
                        {lot.numero_contrato && (
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{lot.numero_contrato}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-2xl font-bold tracking-tight ${pctColor}`}>
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGrad} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-primary)]">{aptos}</span>{" "}
                        aptos de {total}
                        {pendencias > 0 && (
                          <span className="ml-2 font-medium text-amber-600">{pendencias} pend.</span>
                        )}
                        {inaptos > 0 && (
                          <span className="ml-2 font-medium text-red-600">
                            {inaptos} inapto{inaptos !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Destination info */}
                    <div className="mt-4 space-y-1.5 text-sm text-[var(--text-secondary)]">
                      {lot.pais_destino && (
                        <p className="flex items-center gap-2">
                          <span>{flagEmoji(lot.pais_destino)}</span>
                          <span>{lot.pais_destino}</span>
                        </p>
                      )}
                      {lot.porto_embarque && (
                        <p className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">⚓</span>
                          <span>{lot.porto_embarque}</span>
                        </p>
                      )}
                      {lot.data_embarque && (
                        <p className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">📅</span>
                          <span>{new Date(lot.data_embarque).toLocaleDateString("pt-BR")}</span>
                        </p>
                      )}
                    </div>

                    {/* Cert badges */}
                    {lot.certificacoes_exigidas && lot.certificacoes_exigidas.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {lot.certificacoes_exigidas.map(cert => (
                          <span
                            key={cert}
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${certBadgeCls(cert)}`}
                          >
                            {cert === "Halal" ? "☪ Halal" : cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="border-t border-[var(--border)] px-6 py-4">
                    <Link
                      href={`/lotes/${lot.id}`}
                      className="flex items-center justify-between text-sm font-medium text-[var(--primary-hover)] hover:underline"
                    >
                      <span>Ver detalhes</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Ranking de animais aptos ── */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-8 py-6">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Ranking de animais aptos
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Score ≥ 60 · Sem carência ativa · Todos os lotes de exportação
            </p>
          </div>
          <span className="ag-badge ag-badge-dark">{ranking.length} animais</span>
        </div>

        {ranking.length === 0 ? (
          <p className="px-8 py-10 text-sm text-[var(--text-muted)]">
            Nenhum animal elegível encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Animal</th>
                  <th>Raça</th>
                  <th>Score</th>
                  <th>Peso</th>
                  <th>Fazenda</th>
                  <th>Cert</th>
                  <th>Passaporte</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(({ animal, score, lastWeight, propertyName, isHalal }, idx) => (
                  <tr key={animal.animal_id}>
                    <td className="font-bold text-[var(--text-muted)]">#{idx + 1}</td>
                    <td className="font-semibold text-[var(--text-primary)]">
                      {animal.nickname ?? animal.internal_code ?? animal.animal_id.slice(0, 8)}
                    </td>
                    <td className="text-[var(--text-secondary)]">{animal.breed ?? "—"}</td>
                    <td>
                      <span
                        className={`font-bold ${
                          score >= 80
                            ? "text-emerald-600"
                            : score >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {score}
                      </span>
                    </td>
                    <td>{lastWeight ? `${lastWeight} kg` : "—"}</td>
                    <td className="max-w-[150px] truncate text-[var(--text-secondary)]">
                      {propertyName}
                    </td>
                    <td>
                      {isHalal && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          ☪ Halal
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/animais/${animal.animal_id}`}
                        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

// ── Sub-components ──

function HeroKPI({
  label, value, sub, color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: "emerald" | "amber" | "red";
}) {
  const valueColor =
    color === "emerald" ? "text-emerald-600"
    : color === "amber" ? "text-amber-600"
    : color === "red" ? "text-red-600"
    : "text-[var(--text-primary)]";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-[-0.04em] ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

function flagEmoji(country: string): string {
  const map: Record<string, string> = {
    "Arábia Saudita": "🇸🇦",
    "Arabia Saudita": "🇸🇦",
    "Emirados Árabes": "🇦🇪",
    "Turquia": "🇹🇷",
    "China": "🇨🇳",
    "Egito": "🇪🇬",
    "Kuwait": "🇰🇼",
    "Qatar": "🇶🇦",
    "Brasil": "🇧🇷",
    "EUA": "🇺🇸",
  };
  return map[country] ?? "🌍";
}

function certBadgeCls(cert: string): string {
  switch (cert) {
    case "Halal": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "MAPA":  return "border-blue-200 bg-blue-50 text-blue-700";
    case "GTA":   return "border-purple-200 bg-purple-50 text-purple-700";
    case "SIF":   return "border-orange-200 bg-orange-50 text-orange-700";
    default:      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}
