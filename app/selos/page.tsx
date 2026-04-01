import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";

type CacheRow = {
  animal_id: string;
  score_json: { active_seals?: string[]; total_score?: number } | null;
};
type Animal = { id: string; internal_code: string; nickname: string | null; agraas_id: string | null };

function sealColor(seal: string): string {
  if (seal.includes("Ouro") || seal.includes("Premium")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (seal.includes("Prata")) return "bg-slate-100 text-slate-700 border-slate-300";
  if (seal.includes("Bronze")) return "bg-orange-100 text-orange-700 border-orange-300";
  if (seal.includes("Verde") || seal.includes("Sustent")) return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (seal.includes("Export") || seal.includes("UE")) return "bg-blue-100 text-blue-700 border-blue-300";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-blue-100 text-blue-700" : score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{score}</span>;
}

export default async function SelosPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: cacheData }, { data: animalsData }] = await Promise.all([
    supabase.from("agraas_master_passport_cache").select("animal_id, score_json"),
    supabase.from("animals").select("id, internal_code, nickname, agraas_id").eq("status", "Ativo"),
  ]);

  const cache = (cacheData ?? []) as CacheRow[];
  const animals = (animalsData ?? []) as Animal[];
  const animalMap = new Map(animals.map(a => [a.id, a]));

  const withSeals = cache.filter(c => (c.score_json?.active_seals ?? []).length > 0);
  const totalSeals = withSeals.reduce((s, c) => s + (c.score_json?.active_seals?.length ?? 0), 0);
  const avgScore = cache.length > 0
    ? Math.round(cache.reduce((s, c) => s + (c.score_json?.total_score ?? 0), 0) / cache.length)
    : 0;
  const pct = animals.length > 0 ? Math.round((withSeals.length / animals.length) * 100) : 0;

  // seal distribution
  const sealCount = new Map<string, number>();
  for (const c of withSeals) {
    for (const s of c.score_json?.active_seals ?? []) {
      sealCount.set(s, (sealCount.get(s) ?? 0) + 1);
    }
  }
  const sealList = Array.from(sealCount.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <h1 className="ag-page-title">Selos de Qualidade</h1>
        <p className="ag-section-subtitle mt-1">Certificações automáticas baseadas no Score Agraas</p>
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">Animais com selos</p>
            <p className="ag-kpi-value text-[var(--primary)]">{withSeals.length}</p>
            <p className="sub">de {animals.length} ativos</p>
          </div>
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">Total de selos ativos</p>
            <p className="ag-kpi-value text-blue-600">{totalSeals}</p>
            <p className="sub">emitidos</p>
          </div>
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">Score médio</p>
            <p className="ag-kpi-value text-emerald-600">{avgScore}</p>
            <p className="sub">pontos / 100</p>
          </div>
          <div className="ag-kpi-card">
            <p className="ag-kpi-label">% do rebanho</p>
            <p className="ag-kpi-value text-amber-600">{pct}%</p>
            <p className="sub">com pelo menos 1 selo</p>
          </div>
        </div>
      </section>

      {sealList.length > 0 && (
        <section className="ag-card-strong p-8 space-y-4">
          <h2 className="ag-section-title">Distribuição por Selo</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sealList.map(([seal, count]) => (
              <div key={seal} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 flex items-center justify-between">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${sealColor(seal)}`}>{seal}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{count} animais</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ag-card-strong p-8 space-y-4">
        <h2 className="ag-section-title">Animais Certificados</h2>
        {withSeals.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">Nenhum animal com selos no momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr><th>Código</th><th>Nome</th><th>Agraas ID</th><th>Score</th><th>Selos</th><th></th></tr>
              </thead>
              <tbody>
                {withSeals.map(c => {
                  const a = animalMap.get(c.animal_id);
                  if (!a) return null;
                  const score = c.score_json?.total_score ?? 0;
                  const seals = c.score_json?.active_seals ?? [];
                  return (
                    <tr key={c.animal_id}>
                      <td className="font-mono text-sm">{a.internal_code}</td>
                      <td>{a.nickname ?? "—"}</td>
                      <td className="font-mono text-xs text-[var(--text-muted)]">{a.agraas_id ?? "—"}</td>
                      <td><ScoreBadge score={score} /></td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {seals.map(s => (
                            <span key={s} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sealColor(s)}`}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Link href={`/passaporte/${a.id}`} className="text-xs font-semibold text-[var(--primary-hover)] hover:underline">Ver passaporte</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}