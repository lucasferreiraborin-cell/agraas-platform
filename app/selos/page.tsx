import { supabase } from "@/lib/supabase";
import Link from "next/link";

type SealRow = {
  animal_id: string;
  internal_code: string | null;
  active_seals: string[] | null;
};

export default async function SelosPage() {
  const { data, error } = await supabase
    .from("agraas_master_passport")
    .select("animal_id, internal_code, active_seals");

  const rows: SealRow[] =
    data?.filter(
      (item) => Array.isArray(item.active_seals) && item.active_seals.length > 0
    ) ?? [];

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Selos</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Consulte os selos ativos por animal.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {error ? (
            <p className="text-sm text-red-600">Erro ao carregar selos.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[#5F6B5F]">Nenhum selo encontrado.</p>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.animal_id}
                  className="rounded-xl bg-[#FDFDFD] p-5 ring-1 ring-black/5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {row.internal_code ?? row.animal_id}
                      </p>
                    </div>

                    <Link
                      href={`/animais/${row.animal_id}`}
                      className="text-sm text-[#4A7C3A] hover:underline"
                    >
                      Ver passaporte
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {row.active_seals?.map((seal) => (
                      <span
                        key={seal}
                        className="rounded-full bg-[#E8F3E3] px-3 py-1 text-sm font-medium text-[#2F5E26]"
                      >
                        {formatLabel(seal)}
                      </span>
                    ))}
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

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}