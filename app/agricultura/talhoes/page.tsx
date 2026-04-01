import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Layers } from "lucide-react";

type Field = {
  id: string;
  field_code: string;
  field_name: string | null;
  area_ha: number | null;
  culture: string;
  crop_season: string | null;
  status: string;
  expected_harvest_date: string | null;
  farm_id: string;
};

type Farm = { id: string; name: string };

const CULTURE_LABEL: Record<string, string> = {
  soja: "Soja", milho: "Milho", trigo: "Trigo", acucar: "Açúcar", cafe: "Café",
};

const CULTURE_DOT: Record<string, string> = {
  soja: "bg-emerald-500", milho: "bg-amber-500", trigo: "bg-amber-900",
  acucar: "bg-violet-500", cafe: "bg-amber-950",
};

const STATUS_STYLE: Record<string, string> = {
  planejado:        "bg-gray-100 text-gray-600 border-gray-200",
  plantado:         "bg-emerald-100 text-emerald-700 border-emerald-200",
  em_desenvolvimento: "bg-blue-100 text-blue-700 border-blue-200",
  colhido:          "bg-amber-100 text-amber-700 border-amber-200",
  em_repouso:       "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado", plantado: "Plantado", em_desenvolvimento: "Em desenvolvimento",
  colhido: "Colhido", em_repouso: "Em repouso",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function TalhoesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: fieldsData }, { data: farmsData }] = await Promise.all([
    supabase
      .from("crop_fields")
      .select("id, field_code, field_name, area_ha, culture, crop_season, status, expected_harvest_date, farm_id")
      .order("field_code"),
    supabase
      .from("farms_agriculture")
      .select("id, name"),
  ]);

  const fields: Field[] = (fieldsData ?? []) as Field[];
  const farms: Farm[] = (farmsData ?? []) as Farm[];
  const farmMap = new Map(farms.map(f => [f.id, f.name]));

  return (
    <main className="space-y-8">
      {/* Header */}
      <section className="ag-card-strong p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <Layers size={20} className="text-[var(--primary)]" />
          </span>
          <div>
            <h1 className="ag-page-title leading-none">Talhões</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{fields.length} talhão{fields.length !== 1 ? "ões" : ""} cadastrado{fields.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="ag-card-strong overflow-hidden">
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th>Talhão</th>
              <th>Fazenda</th>
              <th>Cultura</th>
              <th>Área</th>
              <th>Safra</th>
              <th>Status</th>
              <th>Colheita prevista</th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[var(--text-muted)]">
                  Nenhum talhão cadastrado.
                </td>
              </tr>
            )}
            {fields.map(field => (
              <tr key={field.id}>
                <td>
                  <p className="font-semibold text-[var(--text-primary)]">{field.field_name ?? field.field_code}</p>
                  <p className="text-xs text-[var(--text-muted)]">{field.field_code}</p>
                </td>
                <td className="text-sm text-[var(--text-secondary)]">
                  {farmMap.get(field.farm_id) ?? "—"}
                </td>
                <td>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${CULTURE_DOT[field.culture] ?? "bg-gray-400"}`} />
                    {CULTURE_LABEL[field.culture] ?? field.culture}
                  </span>
                </td>
                <td className="text-sm font-medium text-[var(--text-primary)]">
                  {field.area_ha != null ? field.area_ha.toLocaleString("pt-BR") + " ha" : "—"}
                </td>
                <td className="text-sm text-[var(--text-muted)]">{field.crop_season ?? "—"}</td>
                <td>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[field.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {STATUS_LABEL[field.status] ?? field.status}
                  </span>
                </td>
                <td className="text-sm text-[var(--text-secondary)]">{fmtDate(field.expected_harvest_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
