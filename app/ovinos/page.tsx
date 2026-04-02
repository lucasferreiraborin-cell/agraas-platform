import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Rabbit, Plus } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

const PAGE_SIZE = 20;

type LivestockRow = {
  id: string;
  species: string;
  breed: string | null;
  sex: string | null;
  weight_kg: number | null;
  status: string;
  internal_code: string | null;
  agraas_id: string | null;
  score: number | null;
  certifications: string[];
  property_id: string | null;
};

type PropertyRow = { id: string; name: string };
type QuarantineRow = { animal_id: string; status: string };

const SPECIES_LABEL: Record<string, string> = {
  ovino: "Ovino",
  caprino: "Caprino",
  ave: "Ave",
  bovino: "Bovino",
};

const STATUS_LABEL: Record<string, string> = {
  active:     "Ativo",
  sold:       "Vendido",
  deceased:   "Óbito",
  quarantine: "Quarentena",
};

const STATUS_BADGE: Record<string, string> = {
  active:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  sold:       "bg-gray-50 text-gray-600 border border-gray-200",
  deceased:   "bg-red-50 text-red-700 border border-red-200",
  quarantine: "bg-amber-50 text-amber-700 border border-amber-200",
};

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = score >= 75 ? "#2d9b6f" : score >= 50 ? "#d4930a" : "#c0392b";
  const track = score >= 75 ? "#d1fae5" : score >= 50 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx={22} cy={22} r={r} fill="none" stroke={track} strokeWidth="4" />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 22 22)" />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

type PageProps = { searchParams?: Promise<{ page?: string }> };

export default async function OvinosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(0, parseInt(params?.page ?? "0", 10) || 0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createSupabaseServerClient();

  const [
    { data: animalsData, count: totalCount },
    { data: propertiesData },
    { data: quarantineData },
  ] = await Promise.all([
    supabase
      .from("livestock_species")
      .select("id, species, breed, sex, weight_kg, status, internal_code, agraas_id, score, certifications, property_id", { count: "exact" })
      .in("species", ["ovino", "caprino"])
      .order("score", { ascending: false })
      .range(from, to),
    supabase.from("properties").select("id, name"),
    supabase.from("pre_shipment_quarantine").select("animal_id, status"),
  ]);

  const animals: LivestockRow[] = (animalsData ?? []) as LivestockRow[];
  const properties: PropertyRow[] = (propertiesData ?? []) as PropertyRow[];
  const quarantines: QuarantineRow[] = (quarantineData ?? []) as QuarantineRow[];
  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const propMap = new Map(properties.map(p => [p.id, p.name]));
  const quarantineAnimalIds = new Set(
    quarantines.filter(q => q.status === "em_quarentena").map(q => q.animal_id)
  );

  // KPIs (computed from current page; total from DB count)
  const withScore     = animals.filter(a => a.score != null);
  const avgScore      = withScore.length > 0
    ? Math.round(withScore.reduce((s, a) => s + (a.score ?? 0), 0) / withScore.length)
    : 0;
  const inQuarantine  = animals.filter(a => a.status === "quarantine" || quarantineAnimalIds.has(a.id)).length;
  const halalCert     = animals.filter(a => a.certifications?.includes("Halal")).length;

  const kpis = [
    { label: "Total",           value: total,        sub: "ovinos e caprinos",    color: "text-[var(--text-primary)]" },
    { label: "Score médio",     value: avgScore,      sub: "média da base",         color: avgScore >= 75 ? "text-emerald-600" : "text-amber-600" },
    { label: "Em quarentena",   value: inQuarantine,  sub: "pré-embarque",          color: inQuarantine > 0 ? "text-amber-600" : "text-[var(--text-primary)]" },
    { label: "Halal certificados", value: halalCert,  sub: "certificação ativa",    color: halalCert > 0 ? "text-emerald-600" : "text-[var(--text-muted)]" },
  ];

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Pecuária Expandida</span>
            <h1 className="ag-page-title">Ovinos & Caprinos</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Gestão individual de ovinos e caprinos — score, rastreabilidade, certificações Halal e quarentena pré-embarque.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/ovinos/novo" className="ag-button-primary flex items-center gap-2">
                <Plus size={15} /> Novo animal
              </Link>
            </div>
          </div>
          <div className="ag-hero-panel">
            <div className="grid grid-cols-2 gap-3">
              {kpis.map(k => (
                <div key={k.label} className="ag-kpi-card">
                  <p className="ag-kpi-label">{k.label}</p>
                  <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
                  <p className="sub">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tabela */}
      {animals.length === 0 ? (
        <section className="ag-card-strong p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Rabbit size={36} className="text-[var(--text-muted)] mb-4" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum ovino ou caprino cadastrado.</p>
            <Link href="/ovinos/novo" className="mt-4 ag-button-primary flex items-center gap-2">
              <Plus size={14} /> Cadastrar primeiro animal
            </Link>
          </div>
        </section>
      ) : (
        <section className="ag-card-strong overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
            <h2 className="ag-section-title">Rebanho</h2>
            <span className="ag-badge ag-badge-dark">{total} animais</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Espécie</th>
                  <th>Raça</th>
                  <th>Sexo</th>
                  <th>Peso (kg)</th>
                  <th>Propriedade</th>
                  <th>Status</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Cert.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {animals.map(a => (
                  <tr key={a.id} className="group">
                    <td className="font-semibold text-[var(--text-primary)]">
                      {a.internal_code ?? a.id.slice(0, 8)}
                    </td>
                    <td>{SPECIES_LABEL[a.species] ?? a.species}</td>
                    <td className="text-[var(--text-secondary)]">{a.breed ?? "—"}</td>
                    <td>{a.sex === "Male" ? "Macho" : a.sex === "Female" ? "Fêmea" : "—"}</td>
                    <td className="tabular-nums">{a.weight_kg != null ? `${a.weight_kg} kg` : "—"}</td>
                    <td className="text-[var(--text-secondary)]">{a.property_id ? (propMap.get(a.property_id) ?? "—") : "—"}</td>
                    <td>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[a.status] ?? ""}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {a.score != null ? <ScoreRing score={a.score} /> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="text-center">
                      {a.certifications?.includes("Halal") ? (
                        <HalalBadgeSVG size={32} />
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/ovinos/${a.id}`}
                        className="text-xs font-semibold text-[var(--primary-hover)] hover:underline"
                      >
                        Passaporte →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-8 py-5">
              {page > 0 ? (
                <Link href={`?page=${page - 1}`} className="ag-button-secondary">Anterior</Link>
              ) : (
                <span className="ag-button-secondary opacity-40 pointer-events-none">Anterior</span>
              )}
              <span className="text-sm text-[var(--text-muted)]">
                Mostrando {from + 1}–{Math.min(from + PAGE_SIZE, total)} de {total}
              </span>
              {page < totalPages - 1 ? (
                <Link href={`?page=${page + 1}`} className="ag-button-secondary">Próximo</Link>
              ) : (
                <span className="ag-button-secondary opacity-40 pointer-events-none">Próximo</span>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
