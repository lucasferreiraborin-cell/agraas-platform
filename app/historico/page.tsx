import { supabase } from "@/lib/supabase";
import Link from "next/link";

type EventRow = {
  id: string;
  animal_id: string;
  event_type: string | null;
  event_date: string | null;
  notes: string | null;
};

export default async function HistoricoPage() {
  const { data, error } = await supabase
    .from("events")
    .select("id, animal_id, event_type, event_date, notes")
    .order("event_date", { ascending: false })
    .limit(100);

  const rows: EventRow[] = data ?? [];

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Histórico</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Auditoria cronológica da base registrada.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {error ? (
            <p className="text-sm text-red-600">
              Erro ao carregar histórico.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[#5F6B5F]">
              Nenhum evento encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={`${row.animal_id}-${row.event_date}-${index}`}
                  className="rounded-lg bg-[#FDFDFD] p-4 ring-1 ring-black/5"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">
                      {formatEventType(row.event_type ?? "")}
                    </p>
                    <p className="text-sm text-[#5F6B5F]">
                      {row.event_date
                        ? new Date(row.event_date).toLocaleString("pt-BR")
                        : "-"}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-[#5F6B5F]">
                    Animal: {row.animal_id}
                  </p>

                  <p className="mt-1 text-sm text-[#5F6B5F]">
                    {row.notes ?? "-"}
                  </p>

                  <div className="mt-3">
                    <Link
                      href={`/animais/${row.animal_id}`}
                      className="text-sm text-[#4A7C3A] hover:underline"
                    >
                      Ver passaporte
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    birth: "Nascimento",
    rfid_assigned: "Identificação vinculada",
    health_application: "Aplicação registrada",
    weight_recorded: "Pesagem registrada",
    sale: "Venda registrada",
    ownership_transfer: "Transferência de propriedade",
    lot_entry: "Entrada em lote",
    slaughter: "Abate registrado",
  };

  return map[value] ?? value.replaceAll("_", " ");
}