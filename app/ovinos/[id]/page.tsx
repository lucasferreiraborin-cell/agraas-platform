import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Weight, ShieldCheck, Clock, Syringe, Activity } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type Animal = {
  id: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  weight_kg: number | null;
  status: string;
  internal_code: string | null;
  agraas_id: string | null;
  rfid: string | null;
  notes: string | null;
  score: number | null;
  certifications: string[];
  property_id: string | null;
};
type WeightRow        = { id: string; weight_kg: number; weighed_at: string; notes: string | null; operator: string | null };
type ApplicationRow   = { id: string; product_name: string; dose: number | null; unit: string | null; application_date: string; withdrawal_days: number; withdrawal_date: string | null; operator: string | null; batch_number: string | null; notes: string | null };
type EventRow         = { id: string; event_type: string; event_date: string; notes: string | null; operator: string | null };
type CertRow          = { id: string; certification_name: string; issued_at: string | null; expires_at: string | null; status: string; issuer: string | null; notes: string | null };
type QuarantineRow    = { id: string; start_date: string; end_date: string | null; veterinarian: string | null; status: string; observations: string | null };
type ScoreConfig      = { weight_sanidade: number; weight_operacional: number; weight_rastreabilidade: number; weight_produtivo: number; weight_certificacoes: number };

const SPECIES_LABEL: Record<string, string> = { ovino: "Ovino", caprino: "Caprino", ave: "Ave", bovino: "Bovino" };
const STATUS_LABEL:  Record<string, string> = { active: "Ativo", sold: "Vendido", deceased: "Óbito", quarantine: "Quarentena" };

const EVENT_COLOR: Record<string, string> = {
  manejo:    "bg-amber-500",
  pesagem:   "bg-blue-500",
  vacinacao: "bg-emerald-500",
  parto:     "bg-pink-500",
  diagnostico: "bg-red-500",
  entrada:   "bg-teal-500",
  saida:     "bg-orange-500",
};
const EVENT_LABEL: Record<string, string> = {
  manejo: "Manejo", pesagem: "Pesagem", vacinacao: "Vacinação",
  parto: "Parto", diagnostico: "Diagnóstico", entrada: "Entrada", saida: "Saída",
};
const CERT_STATUS: Record<string, string> = {
  ativa:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  vencida:  "bg-red-100 text-red-700 border-red-200",
  suspensa: "bg-amber-100 text-amber-700 border-amber-200",
};
const QUARANTINE_STYLE: Record<string, { badge: string; bg: string; label: string }> = {
  em_quarentena: { badge: "bg-amber-100 border-amber-300 text-amber-800",    bg: "bg-amber-50 border-amber-200",    label: "Em quarentena" },
  aprovado:      { badge: "bg-emerald-100 border-emerald-300 text-emerald-800", bg: "bg-emerald-50 border-emerald-200", label: "Aprovado" },
  reprovado:     { badge: "bg-red-100 border-red-300 text-red-800",           bg: "bg-red-50 border-red-200",        label: "Reprovado" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function ScoreCircle({ score }: { score: number }) {
  const size = 96; const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = score >= 75 ? "#2d9b6f" : score >= 50 ? "#d4930a" : "#c0392b";
  const track = score >= 75 ? "#d1fae5" : score >= 50 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <span className="absolute text-2xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function DimensionBar({ label, weight }: { label: string; weight: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="tabular-nums text-[var(--text-muted)]">{weight}% do score</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${weight}%` }} />
      </div>
    </div>
  );
}

export default async function OvinoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: animalData },
    { data: weightsData },
    { data: applicationsData },
    { data: eventsData },
    { data: certsData },
    { data: quarantineData },
    { data: scoreConfigData },
  ] = await Promise.all([
    supabase.from("livestock_species")
      .select("id, species, breed, birth_date, sex, weight_kg, status, internal_code, agraas_id, rfid, notes, score, certifications, property_id")
      .eq("id", id).single(),
    supabase.from("livestock_weights")
      .select("id, weight_kg, weighed_at, notes, operator")
      .eq("animal_id", id).order("weighed_at", { ascending: false }),
    supabase.from("livestock_applications")
      .select("id, product_name, dose, unit, application_date, withdrawal_days, withdrawal_date, operator, batch_number, notes")
      .eq("animal_id", id).order("application_date", { ascending: false }),
    supabase.from("livestock_events")
      .select("id, event_type, event_date, notes, operator")
      .eq("animal_id", id).order("event_date", { ascending: false }),
    supabase.from("livestock_certifications")
      .select("id, certification_name, issued_at, expires_at, status, issuer, notes")
      .eq("animal_id", id).order("issued_at", { ascending: false }),
    supabase.from("pre_shipment_quarantine")
      .select("id, start_date, end_date, veterinarian, status, observations")
      .eq("animal_id", id).order("start_date", { ascending: false }),
    supabase.from("livestock_score_config").select("weight_sanidade, weight_operacional, weight_rastreabilidade, weight_produtivo, weight_certificacoes"),
  ]);

  if (!animalData) notFound();

  const animal      = animalData as Animal;
  const weights     = (weightsData ?? []) as WeightRow[];
  const applications = (applicationsData ?? []) as ApplicationRow[];
  const events      = (eventsData ?? []) as EventRow[];
  const certs       = (certsData ?? []) as CertRow[];
  const quarantines = (quarantineData ?? []) as QuarantineRow[];
  const hasHalal    = animal.certifications?.includes("Halal") ?? false;
  const today       = new Date().toISOString().split("T")[0];

  const cfg = ((scoreConfigData ?? [])[0] as ScoreConfig | undefined) ?? {
    weight_sanidade: 35, weight_operacional: 20, weight_rastreabilidade: 15,
    weight_produtivo: 20, weight_certificacoes: 10,
  };
  const dimensions = [
    { label: "Sanidade",        weight: cfg.weight_sanidade },
    { label: "Produtivo",       weight: cfg.weight_produtivo },
    { label: "Operacional",     weight: cfg.weight_operacional },
    { label: "Rastreabilidade", weight: cfg.weight_rastreabilidade },
    { label: "Certificações",   weight: cfg.weight_certificacoes },
  ];

  // GMD — ganho médio diário entre 1ª e última pesagem
  let gmd: number | null = null;
  if (weights.length >= 2) {
    const newest = weights[0];
    const oldest = weights[weights.length - 1];
    const days = Math.max(1, (new Date(newest.weighed_at).getTime() - new Date(oldest.weighed_at).getTime()) / 86400000);
    gmd = Math.round(((newest.weight_kg - oldest.weight_kg) * 1000) / days);
  }

  return (
    <main className="space-y-8">
      <Link href="/ovinos" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
        <ArrowLeft size={14} /> Ovinos & Caprinos
      </Link>

      {/* ── Header ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="ag-badge ag-badge-green">{SPECIES_LABEL[animal.species] ?? animal.species}</span>
                {hasHalal && <HalalBadgeSVG size={48} />}
                <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                  animal.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"
                }`}>{STATUS_LABEL[animal.status] ?? animal.status}</span>
              </div>
              <h1 className="ag-page-title mt-4">
                {animal.internal_code ?? "Animal"}{animal.breed ? ` — ${animal.breed}` : ""}
              </h1>
              {animal.agraas_id && <p className="mt-1 font-mono text-sm text-[var(--text-muted)]">{animal.agraas_id}</p>}
              <div className="mt-4 flex flex-wrap gap-5 text-sm text-[var(--text-secondary)]">
                {animal.birth_date && <span className="flex items-center gap-1.5"><Calendar size={13} />{fmtDate(animal.birth_date)}</span>}
                {animal.weight_kg != null && <span className="flex items-center gap-1.5"><Weight size={13} />{animal.weight_kg} kg</span>}
                {animal.sex && <span>{animal.sex === "Male" ? "Macho" : "Fêmea"}</span>}
                {animal.rfid && <span className="font-mono text-xs">RFID: {animal.rfid}</span>}
                {gmd !== null && (
                  <span className={`font-semibold ${gmd >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    GMD: {gmd >= 0 ? "+" : ""}{gmd} g/dia
                  </span>
                )}
              </div>
            </div>
            {animal.score != null && (
              <div className="flex flex-col items-center gap-2">
                <ScoreCircle score={animal.score} />
                <p className="text-xs text-[var(--text-muted)]">Agraas Score</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Score + Certificações ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {animal.score != null && (
          <section className="ag-card-strong p-8 space-y-5">
            <div>
              <h2 className="ag-section-title">Score por dimensão</h2>
              <p className="ag-section-subtitle">Pesos configurados para {SPECIES_LABEL[animal.species]}</p>
            </div>
            <div className="space-y-4">
              {dimensions.map(d => <DimensionBar key={d.label} label={d.label} weight={d.weight} />)}
            </div>
          </section>
        )}

        <section className="ag-card-strong p-8 space-y-4">
          <h2 className="ag-section-title">Certificações</h2>
          {certs.length > 0 ? (
            <div className="space-y-3">
              {certs.map(c => (
                <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {c.certification_name === "Halal" ? (
                        <HalalBadgeSVG size={36} />
                      ) : (
                        <ShieldCheck size={18} className="text-emerald-600" />
                      )}
                      <span className="font-semibold text-[var(--text-primary)]">{c.certification_name}</span>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${CERT_STATUS[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.issuer && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{c.issuer}</p>}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Emitida: {fmtDate(c.issued_at)} · Vence: {fmtDate(c.expires_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : animal.certifications?.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {animal.certifications.map(cert => (
                <span key={cert} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                  <ShieldCheck size={12} className="inline mr-1" />{cert}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Nenhuma certificação ativa.</p>
          )}

          {animal.agraas_id && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Agraas ID</p>
              <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">{animal.agraas_id}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Identificador único de rastreabilidade</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Pesagens ── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Histórico de Pesagens</h2>
            <p className="ag-section-subtitle">{weights.length} registro{weights.length !== 1 ? "s" : ""}</p>
          </div>
          {gmd !== null && (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${gmd >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
              GMD {gmd >= 0 ? "+" : ""}{gmd} g/dia
            </span>
          )}
        </div>
        {weights.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Weight size={28} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhuma pesagem registrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr><th>Data</th><th>Peso (kg)</th><th>Ganho</th><th>Operador</th><th>Notas</th></tr>
              </thead>
              <tbody>
                {weights.map((w, i) => {
                  const prev = weights[i + 1];
                  const delta = prev ? Math.round((w.weight_kg - prev.weight_kg) * 10) / 10 : null;
                  return (
                    <tr key={w.id}>
                      <td className="whitespace-nowrap">{fmtDate(w.weighed_at)}</td>
                      <td className="font-semibold tabular-nums">{w.weight_kg} kg</td>
                      <td>
                        {delta !== null ? (
                          <span className={`text-sm font-semibold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {delta >= 0 ? "+" : ""}{delta} kg
                          </span>
                        ) : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="text-[var(--text-secondary)]">{w.operator ?? "—"}</td>
                      <td className="text-[var(--text-secondary)] text-sm max-w-xs truncate">{w.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Aplicações Sanitárias ── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Aplicações Sanitárias</h2>
            <p className="ag-section-subtitle">Medicamentos e vacinas aplicados</p>
          </div>
          {applications.filter(a => a.withdrawal_date && a.withdrawal_date > today).length > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {applications.filter(a => a.withdrawal_date && a.withdrawal_date > today).length} em carência
            </span>
          )}
        </div>
        {applications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Syringe size={28} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhuma aplicação registrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr><th>Produto</th><th>Dose</th><th>Data</th><th>Carência</th><th>Lote</th><th>Operador</th></tr>
              </thead>
              <tbody>
                {applications.map(a => {
                  const emCarencia = a.withdrawal_date && a.withdrawal_date > today;
                  return (
                    <tr key={a.id}>
                      <td className="font-medium text-[var(--text-primary)]">{a.product_name}</td>
                      <td className="tabular-nums text-[var(--text-secondary)]">
                        {a.dose != null ? `${a.dose} ${a.unit ?? ""}` : "—"}
                      </td>
                      <td className="whitespace-nowrap">{fmtDate(a.application_date)}</td>
                      <td>
                        {a.withdrawal_days === 0 ? (
                          <span className="text-[var(--text-muted)] text-xs">Sem carência</span>
                        ) : emCarencia ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                            Em carência · vence {fmtDate(a.withdrawal_date)}
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            Carência vencida
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-[var(--text-muted)]">{a.batch_number ?? "—"}</td>
                      <td className="text-[var(--text-secondary)]">{a.operator ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Eventos ── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div>
          <h2 className="ag-section-title">Eventos</h2>
          <p className="ag-section-subtitle">Timeline de ocorrências do animal</p>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Activity size={28} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum evento registrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={e.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full mt-1 shrink-0 ${EVENT_COLOR[e.event_type] ?? "bg-gray-400"}`} />
                  {i < events.length - 1 && <div className="w-px flex-1 bg-[var(--border)] mt-1" />}
                </div>
                <div className="pb-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {EVENT_LABEL[e.event_type] ?? e.event_type}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{fmtDate(e.event_date)}</span>
                    {e.operator && <span className="text-xs text-[var(--text-muted)]">· {e.operator}</span>}
                  </div>
                  {e.notes && <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{e.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quarentena pré-embarque ── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Quarentena pré-embarque</h2>
            <p className="ag-section-subtitle">Histórico de inspeções sanitárias para exportação</p>
          </div>
          {quarantines.length === 0 && <span className="ag-badge">Nenhum registro</span>}
        </div>
        {quarantines.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Clock size={28} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhuma quarentena registrada para este animal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quarantines.map(q => {
              const style = QUARANTINE_STYLE[q.status] ?? QUARANTINE_STYLE.em_quarentena;
              return (
                <div key={q.id} className={`rounded-2xl border p-5 space-y-3 ${style.bg}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style.badge}`}>{style.label}</span>
                      {q.veterinarian && <span className="text-sm text-[var(--text-secondary)]">{q.veterinarian}</span>}
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">
                      {fmtDate(q.start_date)}{q.end_date && ` → ${fmtDate(q.end_date)}`}
                    </div>
                  </div>
                  {q.observations && <p className="text-sm text-[var(--text-secondary)]">{q.observations}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {animal.notes && (
        <section className="ag-card-strong p-8">
          <h2 className="ag-section-title mb-3">Observações</h2>
          <p className="text-sm text-[var(--text-secondary)]">{animal.notes}</p>
        </section>
      )}
    </main>
  );
}
