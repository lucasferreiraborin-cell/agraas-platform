import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { KpiCard } from "@/app/components/ui/KpiCard";

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
  notes: string | null;
  created_at: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
};

type DisplayRow = {
  id: string;
  animal_code: string;
  agraas_id: string | null;
  weight: number;
  weighing_date: string | null;
  notes: string;
};

export default async function PesagensHistoricoPage() {
  const supabase = await createSupabaseServerClient();
  const [
    { data: weightsData, error: weightsError },
    { data: animalsData, error: animalsError },
  ] = await Promise.all([
    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date, notes, created_at")
      .order("weighing_date", { ascending: false }),

    supabase
      .from("animals")
      .select("id, internal_code, agraas_id"),
  ]);

  if (weightsError) {
    console.error("Erro ao buscar pesagens:", weightsError);
  }

  if (animalsError) {
    console.error("Erro ao buscar animais:", animalsError);
  }

  const weights = (weightsData ?? []) as WeightRow[];
  const animals = (animalsData ?? []) as AnimalRow[];

  const animalMap = new Map<string, AnimalRow>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal);
  }

  const rows: DisplayRow[] = weights.map((item) => {
    const a = animalMap.get(item.animal_id);
    return {
      id: item.id,
      animal_code: a?.internal_code ?? item.animal_id,
      agraas_id: a?.agraas_id ?? null,
      weight: Number(item.weight ?? 0),
      weighing_date: item.weighing_date ?? item.created_at ?? null,
      notes: item.notes ?? "",
    };
  });

  const showNotes = rows.some(r => r.notes && r.notes.trim() !== "");

  const totalWeights = rows.length;
  const animalsWeighed = new Set(rows.map((row) => row.animal_code)).size;
  const averageWeight =
    rows.length > 0
      ? rows.reduce((acc, row) => acc + Number(row.weight ?? 0), 0) / rows.length
      : 0;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Histórico produtivo</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Pesagens registradas
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Histórico consolidado das pesagens do rebanho para leitura
              produtiva e acompanhamento da evolução animal.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesagens" className="ag-button-primary">
                Nova pesagem
              </Link>

              <Link href="/animais" className="ag-button-secondary">
                Ver animais
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="Pesagens"
                value={totalWeights}
                sub="registros produtivos"
              />
              <KpiCard
                label="Animais"
                value={animalsWeighed}
                sub="com pelo menos uma pesagem"
              />
              <KpiCard
                label="Peso médio"
                value={averageWeight > 0 ? `${averageWeight.toFixed(1)} kg` : "-"}
                sub="média dos registros"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Tabela consolidada</h2>
            <p className="ag-section-subtitle">
              Relação completa das pesagens registradas no sistema.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {rows.length} registros
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhuma pesagem encontrada.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Peso</th>
                  <th>Data</th>
                  {showNotes && <th>Observações</th>}
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-[var(--text-primary)]">{row.animal_code}</td>
                    <td>{`${row.weight} kg`}</td>
                    <td>{formatDate(row.weighing_date)}</td>
                    {showNotes && <td className="text-sm text-[var(--text-muted)]">{row.notes || "—"}</td>}
                    <td className="text-right">
                      {row.agraas_id ? (
                        <Link href={`/passaporte/${row.agraas_id}`} className="text-sm font-semibold text-[var(--primary-hover)] hover:underline">
                          Ver →
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}


function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}