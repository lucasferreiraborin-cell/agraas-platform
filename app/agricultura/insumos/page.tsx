import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Boxes, AlertTriangle } from "lucide-react";

type Input = {
  id: string;
  field_id: string;
  input_type: string;
  product_name: string;
  ncm: string | null;
  manufacturer: string | null;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  total_cost: number | null;
  application_date: string | null;
  operator: string | null;
  nfe_key: string | null;
  withdrawal_days: number | null;
  withdrawal_date: string | null;
  notes: string | null;
};

type Field = {
  id: string;
  field_code: string;
  field_name: string | null;
  culture: string;
  farm_id: string;
};

type Farm = { id: string; name: string };

const TYPE_LABEL: Record<string, string> = {
  semente: "Semente", fertilizante: "Fertilizante", defensivo: "Defensivo", combustivel: "Combustível",
};

const TYPE_STYLE: Record<string, string> = {
  semente:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  fertilizante:"bg-blue-100 text-blue-700 border-blue-200",
  defensivo:   "bg-amber-100 text-amber-700 border-amber-200",
  combustivel: "bg-slate-100 text-slate-600 border-slate-200",
};

const FILTER_TYPES = ["todos", "semente", "fertilizante", "defensivo", "combustivel"] as const;
type FilterType = typeof FILTER_TYPES[number];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtCurrency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function maskNfe(key: string) {
  if (key.length < 10) return key;
  return key.slice(0, 8) + "…" + key.slice(-6);
}

function WithdrawalBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const today = new Date();
  const d = new Date(date);
  const active = d > today;
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        <AlertTriangle size={10} className="shrink-0" /> Ativa até {fmtDate(date)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500">
      Vencida {fmtDate(date)}
    </span>
  );
}

export default async function InsumosAgricolasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const filter: FilterType = FILTER_TYPES.includes(tipo as FilterType) ? (tipo as FilterType) : "todos";

  const supabase = await createSupabaseServerClient();

  const [{ data: inputsData }, { data: fieldsData }, { data: farmsData }] = await Promise.all([
    supabase
      .from("crop_inputs")
      .select("id, field_id, input_type, product_name, ncm, manufacturer, quantity, unit, unit_cost, total_cost, application_date, operator, nfe_key, withdrawal_days, withdrawal_date, notes")
      .order("application_date", { ascending: false }),
    supabase
      .from("crop_fields")
      .select("id, field_code, field_name, culture, farm_id"),
    supabase
      .from("farms_agriculture")
      .select("id, name"),
  ]);

  const allInputs: Input[] = (inputsData ?? []) as Input[];
  const fields: Field[] = (fieldsData ?? []) as Field[];
  const farms: Farm[] = (farmsData ?? []) as Farm[];

  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const farmMap  = new Map(farms.map(f => [f.id, f.name]));

  const inputs = filter === "todos"
    ? allInputs
    : allInputs.filter(i => i.input_type === filter);

  const today = new Date();
  const activeWithdrawalCount = allInputs.filter(i => i.withdrawal_date && new Date(i.withdrawal_date) > today).length;
  const totalCost = allInputs.reduce((s, i) => s + (i.total_cost ?? 0), 0);

  return (
    <main className="space-y-8">
      {/* Header */}
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Boxes size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Insumos Agrícolas</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                {allInputs.length} insumo{allInputs.length !== 1 ? "s" : ""} registrado{allInputs.length !== 1 ? "s" : ""}
                {activeWithdrawalCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    <AlertTriangle size={10} /> {activeWithdrawalCount} carência{activeWithdrawalCount !== 1 ? "s" : ""} ativa{activeWithdrawalCount !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Custo total</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{fmtCurrency(totalCost)}</p>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TYPES.map(t => (
          <a
            key={t}
            href={t === "todos" ? "/agricultura/insumos" : `/agricultura/insumos?tipo=${t}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              filter === t
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                : "border-[var(--border)] bg-white text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "todos" ? "Todos" : TYPE_LABEL[t]}
          </a>
        ))}
      </div>

      {/* Table */}
      <section className="ag-card-strong overflow-hidden">
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Talhão / Fazenda</th>
              <th>Quantidade</th>
              <th>NF-e</th>
              <th>Carência</th>
              <th className="text-right">Custo total</th>
            </tr>
          </thead>
          <tbody>
            {inputs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[var(--text-muted)]">
                  Nenhum insumo encontrado.
                </td>
              </tr>
            )}
            {inputs.map(inp => {
              const field = fieldMap.get(inp.field_id);
              const farmName = field ? (farmMap.get(field.farm_id) ?? "—") : "—";
              const hasActiveWithdrawal = inp.withdrawal_date && new Date(inp.withdrawal_date) > today;

              return (
                <tr
                  key={inp.id}
                  className={hasActiveWithdrawal ? "bg-red-50/60" : undefined}
                >
                  <td>
                    <p className="font-semibold text-[var(--text-primary)]">{inp.product_name}</p>
                    {inp.manufacturer && (
                      <p className="text-xs text-[var(--text-muted)]">{inp.manufacturer}</p>
                    )}
                  </td>
                  <td>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[inp.input_type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {TYPE_LABEL[inp.input_type] ?? inp.input_type}
                    </span>
                  </td>
                  <td>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {field ? (field.field_name ?? field.field_code) : "—"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{farmName}</p>
                  </td>
                  <td className="text-sm text-[var(--text-secondary)]">
                    {inp.quantity.toLocaleString("pt-BR")} {inp.unit}
                  </td>
                  <td>
                    {inp.nfe_key ? (
                      <span className="font-mono text-[11px] bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-muted)] px-2 py-0.5 rounded">
                        {maskNfe(inp.nfe_key)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td>
                    <WithdrawalBadge date={inp.withdrawal_date} />
                    {!inp.withdrawal_date && <span className="text-xs text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="text-right font-semibold text-[var(--text-primary)]">
                    {fmtCurrency(inp.total_cost)}
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
