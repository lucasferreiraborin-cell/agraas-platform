import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Weight, ShieldCheck, Clock } from "lucide-react";
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

type QuarantineRow = {
  id: string;
  start_date: string;
  end_date: string | null;
  veterinarian: string | null;
  status: string;
  observations: string | null;
};

type ScoreConfig = {
  weight_sanidade: number;
  weight_operacional: number;
  weight_rastreabilidade: number;
  weight_produtivo: number;
  weight_certificacoes: number;
};

const SPECIES_LABEL: Record<string, string> = { ovino: "Ovino", caprino: "Caprino", ave: "Ave", bovino: "Bovino" };
const STATUS_LABEL:  Record<string, string> = { active: "Ativo", sold: "Vendido", deceased: "Óbito", quarantine: "Quarentena" };

const QUARANTINE_STYLE: Record<string, { badge: string; label: string; bg: string }> = {
  em_quarentena: { badge: "bg-amber-100 border-amber-300 text-amber-800",  label: "Em quarentena", bg: "bg-amber-50 border-amber-200" },
  aprovado:      { badge: "bg-emerald-100 border-emerald-300 text-emerald-800", label: "Aprovado",  bg: "bg-emerald-50 border-emerald-200" },
  reprovado:     { badge: "bg-red-100 border-red-300 text-red-800",        label: "Reprovado",     bg: "bg-red-50 border-red-200" },
};

function ScoreCircle({ score }: { score: number }) {
  const size = 96;
  const r    = 40;
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

function DimensionBar({ label, weight, score }: { label: string; weight: number; score: number }) {
  const dimScore = Math.round(score * (weight / 100) * (100 / Math.max(weight, 1)));
  const pct      = Math.max(4, dimScore);
  const color    = dimScore >= 75 ? "#2d9b6f" : dimScore >= 50 ? "#d4930a" : "#c0392b";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="tabular-nums text-[var(--text-muted)]">{weight}% do score</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function OvinoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: animalData },
    { data: quarantineData },
    { data: scoreConfigData },
  ] = await Promise.all([
    supabase
      .from("livestock_species")
      .select("id, species, breed, birth_date, sex, weight_kg, status, internal_code, agraas_id, rfid, notes, score, certifications, property_id")
      .eq("id", id)
      .single(),
    supabase
      .from("pre_shipment_quarantine")
      .select("id, start_date, end_date, veterinarian, status, observations")
      .eq("animal_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("livestock_score_config")
      .select("weight_sanidade, weight_operacional, weight_rastreabilidade, weight_produtivo, weight_certificacoes"),
  ]);

  if (!animalData) notFound();

  const animal     = animalData as Animal;
  const quarantines = (quarantineData ?? []) as QuarantineRow[];
  const hasHalal   = animal.certifications?.includes("Halal") ?? false;

  // Score config para a espécie — fallback padrão
  const cfg = (scoreConfigData ?? [])[0] as ScoreConfig | undefined ?? {
    weight_sanidade: 35, weight_operacional: 20, weight_rastreabilidade: 15,
    weight_produtivo: 20, weight_certificacoes: 10,
  };

  const dimensions = [
    { label: "Sanidade",        weight: cfg.weight_sanidade        },
    { label: "Operacional",     weight: cfg.weight_operacional     },
    { label: "Rastreabilidade", weight: cfg.weight_rastreabilidade },
    { label: "Produtivo",       weight: cfg.weight_produtivo       },
    { label: "Certificações",   weight: cfg.weight_certificacoes   },
  ];

  return (
    <main className="space-y-8">
      {/* Breadcrumb */}
      <Link href="/ovinos" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
        <ArrowLeft size={14} /> Ovinos & Caprinos
      </Link>

      {/* Header */}
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
              {animal.agraas_id && (
                <p className="mt-1 font-mono text-sm text-[var(--text-muted)]">{animal.agraas_id}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-5 text-sm text-[var(--text-secondary)]">
                {animal.birth_date && (
                  <span className="flex items-center gap-1.5"><Calendar size={13} />{formatDate(animal.birth_date)}</span>
                )}
                {animal.weight_kg != null && (
                  <span className="flex items-center gap-1.5"><Weight size={13} />{animal.weight_kg} kg</span>
                )}
                {animal.sex && (
                  <span>{animal.sex === "Male" ? "Macho" : "Fêmea"}</span>
                )}
                {animal.rfid && (
                  <span className="font-mono text-xs">RFID: {animal.rfid}</span>
                )}
              </div>
            </div>

            {/* Score circle */}
            {animal.score != null && (
              <div className="flex flex-col items-center gap-2">
                <ScoreCircle score={animal.score} />
                <p className="text-xs text-[var(--text-muted)]">Agraas Score</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score dimensions */}
        {animal.score != null && (
          <section className="ag-card-strong p-8 space-y-5">
            <div>
              <h2 className="ag-section-title">Score por dimensão</h2>
              <p className="ag-section-subtitle">Pesos configuráveis por espécie ({SPECIES_LABEL[animal.species]})</p>
            </div>
            <div className="space-y-4">
              {dimensions.map(d => (
                <DimensionBar key={d.label} label={d.label} weight={d.weight} score={animal.score!} />
              ))}
            </div>
          </section>
        )}

        {/* Certificações */}
        <section className="ag-card-strong p-8 space-y-4">
          <h2 className="ag-section-title">Certificações</h2>
          {animal.certifications && animal.certifications.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {animal.certifications.map(cert =>
                cert === "Halal" ? (
                  <div key={cert} className="flex items-center gap-2">
                    <HalalBadgeSVG size={64} />
                    <div>
                      <p className="font-semibold text-emerald-700">Halal Certified</p>
                      <p className="text-xs text-[var(--text-muted)]">Certificação ativa</p>
                    </div>
                  </div>
                ) : (
                  <span key={cert} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    <ShieldCheck size={12} className="inline mr-1" />{cert}
                  </span>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Nenhuma certificação ativa.</p>
          )}

          {/* Agraas ID / QR */}
          {animal.agraas_id && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Agraas ID</p>
              <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">{animal.agraas_id}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Identificador único de rastreabilidade</p>
            </div>
          )}

          {/* Observações */}
          {animal.notes && (
            <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Observações</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{animal.notes}</p>
            </div>
          )}
        </section>
      </div>

      {/* Quarentena pré-embarque */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Quarentena pré-embarque</h2>
            <p className="ag-section-subtitle">Histórico de inspeções sanitárias para exportação</p>
          </div>
          {quarantines.length === 0 && (
            <span className="ag-badge">Nenhum registro</span>
          )}
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
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style.badge}`}>
                        {style.label}
                      </span>
                      {q.veterinarian && (
                        <span className="text-sm text-[var(--text-secondary)]">{q.veterinarian}</span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">
                      {formatDate(q.start_date)}
                      {q.end_date && ` → ${formatDate(q.end_date)}`}
                    </div>
                  </div>
                  {q.observations && (
                    <p className="text-sm text-[var(--text-secondary)]">{q.observations}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
