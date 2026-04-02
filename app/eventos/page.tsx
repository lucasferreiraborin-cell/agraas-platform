import { supabase } from "@/lib/supabase";
import Link from "next/link";

const PAGE_SIZE = 20;

type FarmEventRow = {
  id: string;
  animal_id: string | null;
  event_type: string | null;
  notes: string | null;
  event_date: string | null;
  created_at: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type DisplayRow = {
  id: string;
  animal_code: string;
  event_type: string;
  notes: string;
  event_date: string | null;
};

type PageProps = { searchParams?: Promise<{ page?: string }> };

export default async function EventosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(0, parseInt(params?.page ?? "0", 10) || 0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [
    { data: eventsData, count: totalCount, error: eventsError },
    { data: animalsData, error: animalsError },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, animal_id, event_type, notes, event_date, created_at", { count: "exact" })
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),

    supabase
      .from("animals")
      .select("id, internal_code"),
  ]);

  if (eventsError) {
    console.error("Erro ao buscar eventos:", eventsError);
  }

  if (animalsError) {
    console.error("Erro ao buscar animais:", animalsError);
  }

  const events = (eventsData ?? []) as FarmEventRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  const rows: DisplayRow[] = events.map((event) => ({
    id: event.id,
    animal_code: event.animal_id
      ? animalMap.get(event.animal_id) ?? event.animal_id
      : "-",
    event_type: event.event_type ?? "-",
    notes: event.notes ?? "-",
    event_date: event.event_date ?? event.created_at ?? null,
  }));

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Timeline da fazenda</div>

            <h1 className="ag-page-title">
              Eventos operacionais
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Histórico consolidado dos principais eventos da operação
              registrados na Agraas.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesagens" className="ag-button-secondary">
                Nova pesagem
              </Link>

              <Link href="/aplicacoes" className="ag-button-secondary">
                Nova aplicação
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Eventos"
                value={total}
                subtitle="trilha operacional registrada"
              />
              <MetricCard
                label="Animais"
                value={
                  new Set(rows.map((row) => row.animal_code)).size -
                  (rows.some((row) => row.animal_code === "-") ? 1 : 0)
                }
                subtitle="com eventos vinculados"
              />
              <MetricCard
                label="Módulo"
                value="timeline"
                subtitle="camada de rastreabilidade"
              />
              <MetricCard
                label="Status"
                value="ativo"
                subtitle="event logging funcionando"
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
              Linha do tempo dos eventos registrados no sistema.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {total} eventos
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum evento encontrado.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Evento</th>
                  <th>Descrição</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.animal_code}</td>
                    <td>{formatEventType(row.event_type)}</td>
                    <td>{row.notes}</td>
                    <td>{formatDate(row.event_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string | number;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="ag-kpi-card">
      <p className="ag-kpi-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    birth: "Nascimento",
    weighing: "Pesagem",
    application: "Aplicação sanitária",
    lot_entry: "Entrada em lote",
    lot_exit: "Saída de lote",
    sale: "Venda",
    slaughter: "Abate",
    death: "Óbito",
  };

  return map[value] ?? value;
}