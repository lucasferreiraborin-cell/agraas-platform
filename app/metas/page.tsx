import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Target } from "lucide-react";
import GoalForm from "@/app/components/GoalForm";

type Goal = { id: string; category: string; phase: string; target_weight_kg: number; target_age_days: number; notes: string | null };

const CAT_LABEL: Record<string, string> = { bezerro: "Bezerro", novilha: "Novilha", vaca: "Vaca", touro: "Touro" };
const PHASE_LABEL: Record<string, string> = { nascimento: "Nascimento", desmame: "Desmame", recria: "Recria", venda: "Venda" };

export default async function MetasPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("animal_goals").select("*").order("category").order("target_age_days");
  const goals = (data ?? []) as Goal[];

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
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{goals.length} meta{goals.length !== 1 ? "s" : ""} definida{goals.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <GoalForm />
        </div>
      </section>

      {goals.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><Target size={24} /></div>
          <p className="ag-empty-state-title">Nenhuma meta cadastrada</p>
          <p className="ag-empty-state-text">Defina metas de peso por categoria e fase para acompanhar o desempenho do rebanho.</p>
        </div>
      ) : (
        <section className="ag-card overflow-hidden p-0">
          <table className="ag-table w-full">
            <thead>
              <tr><th>Categoria</th><th>Fase</th><th>Peso alvo</th><th>Idade alvo</th><th>Obs</th></tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id}>
                  <td className="font-semibold text-[var(--text-primary)]">{CAT_LABEL[g.category] ?? g.category}</td>
                  <td>{PHASE_LABEL[g.phase] ?? g.phase}</td>
                  <td className="font-bold text-[var(--primary)]">{g.target_weight_kg} kg</td>
                  <td>{g.target_age_days} dias</td>
                  <td className="text-sm text-[var(--text-muted)]">{g.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
