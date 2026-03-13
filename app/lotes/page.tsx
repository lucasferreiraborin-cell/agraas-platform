import { supabase } from "@/lib/supabase";

type Lot = {
  id: string;
  lot_code: string | null;
  lot_type: string | null;
  status: string | null;
  property_id: string | null;
};

export default async function LotesPage() {
  const { data, error } = await supabase
    .from("batch_lots")
    .select("id, lot_code, lot_type, status, property_id")
    .order("created_at", { ascending: false });

  const rows: Lot[] = data ?? [];

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Lotes</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Consulte os lotes registrados na operação.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {error ? (
            <p className="text-sm text-red-600">Erro ao carregar lotes.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[#5F6B5F]">Nenhum lote encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-sm text-[#5F6B5F]">
                    <th className="px-4 py-2">Código do lote</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Propriedade</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-[#FDFDFD] text-sm shadow-sm ring-1 ring-black/5"
                    >
                      <td className="rounded-l-lg px-4 py-3 font-medium">
                        {row.lot_code ?? "-"}
                      </td>
                      <td className="px-4 py-3">{row.lot_type ?? "-"}</td>
                      <td className="px-4 py-3">{row.status ?? "-"}</td>
                      <td className="rounded-r-lg px-4 py-3">
                        {row.property_id ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}