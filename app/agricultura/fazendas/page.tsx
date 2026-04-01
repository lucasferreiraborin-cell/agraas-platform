import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Wheat, MapPin, ExternalLink } from "lucide-react";

type Farm = {
  id: string;
  name: string;
  state: string;
  city: string | null;
  total_area_ha: number | null;
  car_number: string | null;
  status: string;
};

type Field = {
  id: string;
  farm_id: string;
  culture: string;
  status: string;
};

const CULTURE_LABEL: Record<string, string> = {
  soja: "Soja", milho: "Milho", trigo: "Trigo", acucar: "Açúcar", cafe: "Café",
};

const CULTURE_DOT: Record<string, string> = {
  soja: "bg-emerald-500", milho: "bg-amber-500", trigo: "bg-amber-900",
  acucar: "bg-violet-500", cafe: "bg-amber-950",
};

function fmtArea(ha: number | null) {
  if (ha == null) return "—";
  return ha.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " ha";
}

export default async function FazendasPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: farmsData }, { data: fieldsData }] = await Promise.all([
    supabase
      .from("farms_agriculture")
      .select("id, name, state, city, total_area_ha, car_number, status")
      .order("name"),
    supabase
      .from("crop_fields")
      .select("id, farm_id, culture, status")
      .in("status", ["plantado", "em_desenvolvimento"]),
  ]);

  const farms: Farm[] = (farmsData ?? []) as Farm[];
  const fields: Field[] = (fieldsData ?? []) as Field[];

  // Group cultures per farm
  const farmCultures = new Map<string, Set<string>>();
  for (const f of fields) {
    if (!farmCultures.has(f.farm_id)) farmCultures.set(f.farm_id, new Set());
    farmCultures.get(f.farm_id)!.add(f.culture);
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <section className="ag-card-strong p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                <Wheat size={20} className="text-[var(--primary)]" />
              </span>
              <div>
                <h1 className="ag-page-title leading-none">Fazendas</h1>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">{farms.length} fazenda{farms.length !== 1 ? "s" : ""} cadastrada{farms.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="ag-card-strong overflow-hidden">
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th>Fazenda</th>
              <th>Estado / Cidade</th>
              <th>Área Total</th>
              <th>CAR</th>
              <th>Culturas ativas</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {farms.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[var(--text-muted)]">
                  Nenhuma fazenda cadastrada.
                </td>
              </tr>
            )}
            {farms.map(farm => {
              const cultures = [...(farmCultures.get(farm.id) ?? [])];
              return (
                <tr key={farm.id}>
                  <td>
                    <p className="font-semibold text-[var(--text-primary)]">{farm.name}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                      <MapPin size={13} className="shrink-0 text-[var(--text-muted)]" />
                      {farm.state}{farm.city ? ` — ${farm.city}` : ""}
                    </div>
                  </td>
                  <td className="text-sm font-medium text-[var(--text-primary)]">{fmtArea(farm.total_area_ha)}</td>
                  <td>
                    {farm.car_number ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        Registrado
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {cultures.length === 0 && <span className="text-xs text-[var(--text-muted)]">—</span>}
                      {cultures.map(c => (
                        <span key={c} className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                          <span className={`h-1.5 w-1.5 rounded-full ${CULTURE_DOT[c] ?? "bg-gray-400"}`} />
                          {CULTURE_LABEL[c] ?? c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/agricultura/fazendas/${farm.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)] hover:bg-[var(--primary-soft)]/80 transition"
                    >
                      <ExternalLink size={12} /> Ver detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
