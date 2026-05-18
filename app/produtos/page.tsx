import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Package } from "lucide-react";
import ProductForm from "@/app/components/ProductForm";

type Product = {
  id: string;
  name: string;
  ncm: string | null;
  unit: string | null;
  category: string | null;
  withdrawal_days: number | null;
  notes: string | null;
  active: boolean;
  supplier: { name: string } | null;
};

const CAT_LABEL: Record<string, string> = {
  vacina: "Vacina", vermifugo: "Vermífugo", antibiotico: "Antibiótico",
  antiparasitario: "Antiparasitário", suplemento: "Suplemento", medicamento: "Medicamento",
  racao: "Ração", fertilizante: "Fertilizante", semente: "Semente", outro: "Outro",
};

const CAT_CLS: Record<string, string> = {
  vermifugo:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  antiparasitario:  "bg-blue-50 text-blue-700 border-blue-200",
  vacina:           "bg-purple-50 text-purple-700 border-purple-200",
  medicamento:      "bg-orange-50 text-orange-700 border-orange-200",
  antibiotico:      "bg-orange-50 text-orange-700 border-orange-200",
  suplemento:       "bg-teal-50 text-teal-700 border-teal-200",
  racao:            "bg-amber-50 text-amber-700 border-amber-200",
  fertilizante:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  semente:          "bg-lime-50 text-lime-700 border-lime-200",
  outro:            "bg-gray-50 text-gray-600 border-gray-200",
};

function getJoin<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, ncm, unit, category, withdrawal_days, notes, active, supplier:suppliers(name)")
    .eq("active", true)
    .order("name");

  const products = (productsData ?? []).map((p: any) => ({
    ...p,
    supplier: getJoin(p.supplier),
  })) as Product[];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Package size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Produtos</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{products.length} cadastrado{products.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <ProductForm />
        </div>
      </section>

      {products.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><Package size={24} /></div>
          <p className="ag-empty-state-title">Nenhum produto cadastrado</p>
          <p className="ag-empty-state-text">Cadastre vacinas, vermífugos e outros produtos para vincular às aplicações.</p>
        </div>
      ) : (
        <section className="ag-card overflow-x-auto p-0 pb-20">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Fornecedor</th>
                <th>Unidade</th>
                <th>Categoria</th>
                <th>Carência</th>
                <th>Registro MAPA</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const catKey = p.category ?? "outro";
                const catCls = CAT_CLS[catKey] ?? CAT_CLS.outro;
                const carenciaCls = p.withdrawal_days
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700";
                const carenciaLabel = p.withdrawal_days ? `${p.withdrawal_days} dias` : "Sem carência";
                return (
                  <tr key={p.id}>
                    <td className="font-semibold text-[var(--text-primary)]">{p.name}</td>
                    <td className="text-sm">{p.supplier?.name ?? "—"}</td>
                    <td className="text-sm">{p.unit ?? "—"}</td>
                    <td>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${catCls}`}>
                        {CAT_LABEL[catKey] ?? p.category ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${carenciaCls}`}>
                        {carenciaLabel}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-[var(--text-muted)]">{p.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
