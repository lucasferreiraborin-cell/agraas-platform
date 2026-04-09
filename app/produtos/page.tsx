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
  active: boolean;
  supplier: { name: string } | null;
};

const CAT_LABEL: Record<string, string> = {
  vacina: "Vacina", vermifugo: "Vermífugo", antibiotico: "Antibiótico",
  antiparasitario: "Antiparasitário", suplemento: "Suplemento",
  racao: "Ração", fertilizante: "Fertilizante", semente: "Semente", outro: "Outro",
};

function getJoin<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, ncm, unit, category, withdrawal_days, active, supplier:suppliers(name)")
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
        <section className="ag-card overflow-hidden p-0">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Fornecedor</th>
                <th>Unidade</th>
                <th>Categoria</th>
                <th>Carência</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="font-semibold text-[var(--text-primary)]">{p.name}</td>
                  <td className="text-sm">{p.supplier?.name ?? "—"}</td>
                  <td className="text-sm">{p.unit ?? "—"}</td>
                  <td>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                      {CAT_LABEL[p.category ?? ""] ?? p.category ?? "—"}
                    </span>
                  </td>
                  <td className="text-sm">{p.withdrawal_days ? `${p.withdrawal_days} dias` : "Sem carência"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
