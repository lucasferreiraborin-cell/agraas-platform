import { supabase } from "@/lib/supabase";
import Link from "next/link";

type PassportRow = {
  animal_id: string;
  internal_code: string | null;
  current_property_name: string | null;
  total_score: number | null;
  current_withdrawal_end_date: string | null;
  active_seals: string[] | null;
  active_certifications: string[] | null;
};

export default async function CertificacoesPage() {
  const { data, error } = await supabase
    .from("agraas_master_passport")
    .select(
      "animal_id, internal_code, current_property_name, total_score, current_withdrawal_end_date, active_seals, active_certifications"
    );

  const rows: PassportRow[] =
    data?.filter(
      (item) =>
        Array.isArray(item.active_certifications) &&
        item.active_certifications.length > 0
    ) ?? [];

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Certificações
          </h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Consulte os animais com certificação ativa.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {error ? (
            <p className="text-sm text-red-600">
              Erro ao carregar certificações.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[#5F6B5F]">
              Nenhum animal certificado encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-sm text-[#5F6B5F]">
                    <th className="px-4 py-2">Animal</th>
                    <th className="px-4 py-2">Propriedade</th>
                    <th className="px-4 py-2">Score total</th>
                    <th className="px-4 py-2">Selos</th>
                    <th className="px-4 py-2">Certificação</th>
                    <th className="px-4 py-2">Carência até</th>
                    <th className="px-4 py-2">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.animal_id}
                      className="bg-[#FDFDFD] text-sm shadow-sm ring-1 ring-black/5"
                    >
                      <td className="rounded-l-lg px-4 py-3 font-medium">
                        {row.internal_code ?? row.animal_id}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_property_name ?? "-"}
                      </td>
                      <td className="px-4 py-3">{row.total_score ?? "-"}</td>
                      <td className="px-4 py-3">
                        {row.active_seals?.length
                          ? row.active_seals.join(", ")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {row.active_certifications?.length
                          ? row.active_certifications.join(", ")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_withdrawal_end_date
                          ? new Date(
                              row.current_withdrawal_end_date
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>
                      <td className="rounded-r-lg px-4 py-3">
                        <Link
                          href={`/animais/${row.animal_id}`}
                          className="text-[#4A7C3A] hover:underline"
                        >
                          Ver passaporte
                        </Link>
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