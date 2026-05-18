import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Target } from "lucide-react";
import GoalForm from "@/app/components/GoalForm";

type Goal = {
  id: string;
  client_id: string;
  category: string;
  phase: string;
  target_weight_kg: number;
  target_age_days: number;
  notes: string | null;
};
type AnimalRow = { id: string; sex: string | null; birth_date: string | null; status: string | null };
type WeightRow = { animal_id: string; weight: number; weighing_date: string | null };

const CAT_LABEL: Record<string, string> = { bezerro: "Bezerro", novilha: "Novilha", vaca: "Vaca", touro: "Touro" };
const PHASE_LABEL: Record<string, string> = { nascimento: "Nascimento", desmame: "Desmame", recria: "Recria", venda: "Venda" };

function inferCategory(animal: AnimalRow): string | null {
  if (!animal.birth_date) return null;
  const ageDays = Math.floor((Date.now() - new Date(animal.birth_date).getTime()) / 86400000);
  if (ageDays < 365) return "bezerro";
  if (animal.sex === "Female") return "novilha";
  return "touro";
}

export default async function MetasPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: goalsData }, { data: animalsData }, { data: weightsData }] = await Promise.all([
    supabase.from("animal_goals").select("*").order("category").order("target_age_days"),
    supabase.from("animals").select("id, sex, birth_date, status").eq("status", "Ativo"),
    supabase.from("weights").select("animal_id, weight, weighing_date").order("weighing_date", { ascending: false }),
  ]);

  const goals = (goalsData ?? []) as Goal[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const weights = (weightsData ?? []) as WeightRow[];

  // Latest weight per animal
  const latestWeight = new Map<string, number>();
  for (const w of weights) {
    if (!latestWeight.has(w.animal_id)) latestWeight.set(w.animal_id, w.weight);
  }

  // Goal lookup by category (closest to current age)
  const goalByCategory = new Map<string, Goal>();
  for (const g of goals) {
    if (!goalByCategory.has(g.category)) goalByCategory.set(g.category, g);
  }

  // Compute status per animal
  let dentroDaMeta = 0;
  let abaixo = 0;
  let proximo = 0;
  // Average current weight per category for progress bar
  const weightsByCategory = new Map<string, number[]>();

  for (const a of animals) {
    const cat = inferCategory(a);
    if (!cat) continue;
    const goal = goalByCategory.get(cat);
    if (!goal) continue;
    const w = latestWeight.get(a.id);
    if (w == null) continue;

    const list = weightsByCategory.get(cat) ?? [];
    list.push(w);
    weightsByCategory.set(cat, list);

    const target = goal.target_weight_kg;
    const ratio = w / target;
    if (ratio >= 1) dentroDaMeta++;
    else if (ratio >= 0.85) proximo++;
    else abaixo++;
  }

  // Average weight per goal category for progress bar
  const avgByCategory = new Map<string, number>();
  for (const [cat, ws] of weightsByCategory) {
    avgByCategory.set(cat, ws.reduce((s, v) => s + v, 0) / ws.length);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Target size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Metas de Peso</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">Acompanhamento de performance do rebanho</p>
            </div>
          </div>
          <GoalForm />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="ag-kpi-card p-5">
            <p className="ag-kpi-label">Total de metas</p>
            <p className="ag-kpi-value">{goals.length}</p>
          </div>
          <div className="ag-kpi-card p-5 bg-emerald-50">
            <p className="ag-kpi-label">Dentro da meta</p>
            <p className="ag-kpi-value text-emerald-600">{dentroDaMeta}</p>
            <p className="text-xs text-[var(--text-muted)]">peso ≥ 100% do alvo</p>
          </div>
          <div className="ag-kpi-card p-5 bg-amber-50">
            <p className="ag-kpi-label">Próximos da meta</p>
            <p className="ag-kpi-value text-amber-600">{proximo}</p>
            <p className="text-xs text-[var(--text-muted)]">entre 85% e 99%</p>
          </div>
          <div className="ag-kpi-card p-5 bg-red-50">
            <p className="ag-kpi-label">Abaixo da meta</p>
            <p className="ag-kpi-value text-red-600">{abaixo}</p>
            <p className="text-xs text-[var(--text-muted)]">peso &lt; 85% do alvo</p>
          </div>
        </div>
      </section>

      {goals.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><Target size={24} /></div>
          <p className="ag-empty-state-title">Nenhuma meta cadastrada</p>
          <p className="ag-empty-state-text">Defina metas de peso por categoria e fase para acompanhar o desempenho do rebanho.</p>
        </div>
      ) : (
        <section className="ag-card overflow-x-auto p-0 pb-20">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Fase</th>
                <th>Peso alvo</th>
                <th>Progresso médio</th>
                <th>Idade alvo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => {
                const avg = avgByCategory.get(g.category) ?? 0;
                const pct = avg > 0 ? Math.min(100, Math.round((avg / g.target_weight_kg) * 100)) : 0;
                const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 85 ? "bg-amber-500" : "bg-red-500";
                return (
                  <tr key={g.id} title={g.notes ?? ""}>
                    <td className="font-semibold text-[var(--text-primary)]">{CAT_LABEL[g.category] ?? g.category}</td>
                    <td>{PHASE_LABEL[g.phase] ?? g.phase}</td>
                    <td className="font-bold text-[var(--primary)]">{g.target_weight_kg} kg</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)] w-16">{avg > 0 ? `${avg.toFixed(0)} kg` : "—"}</span>
                        <div className="flex-1 max-w-[140px] h-1 rounded-full bg-[var(--border)] overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-secondary)] w-10">{avg > 0 ? `${pct}%` : "—"}</span>
                      </div>
                    </td>
                    <td>{g.target_age_days} dias</td>
                    <td className="text-right">
                      <button className="text-sm font-medium text-[var(--primary-hover)] hover:underline" type="button">
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
