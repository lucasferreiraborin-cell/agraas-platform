import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Truck, Plus } from "lucide-react";
import SupplierForm from "@/app/components/SupplierForm";

type Supplier = {
  id: string;
  name: string;
  cnpj: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  category: string;
  active: boolean;
  products: { id: string }[];
};

const CAT_LABEL: Record<string, string> = {
  insumo: "Insumo", vacina: "Vacina", medicamento: "Medicamento",
  racao: "Ração", fertilizante: "Fertilizante", semente: "Semente",
  equipamento: "Equipamento", outro: "Outro",
};

const CAT_CLS: Record<string, string> = {
  vacina: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medicamento: "bg-blue-50 text-blue-700 border-blue-200",
  insumo: "bg-amber-50 text-amber-700 border-amber-200",
  racao: "bg-orange-50 text-orange-700 border-orange-200",
  outro: "bg-gray-50 text-gray-600 border-gray-200",
};

export default async function FornecedoresPage() {
  const supabase = await createSupabaseServerClient();

  const { data: suppliersData } = await supabase
    .from("suppliers")
    .select("id, name, cnpj, contact_name, contact_phone, contact_email, category, active, products(id)")
    .eq("active", true)
    .order("name");

  const suppliers = (suppliersData ?? []) as unknown as Supplier[];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Truck size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Fornecedores</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{suppliers.length} ativo{suppliers.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <SupplierForm />
        </div>
      </section>

      {suppliers.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><Truck size={24} /></div>
          <p className="ag-empty-state-title">Nenhum fornecedor cadastrado</p>
          <p className="ag-empty-state-text">Cadastre seus fornecedores para vincular a produtos e notas fiscais.</p>
        </div>
      ) : (
        <section className="ag-card overflow-hidden p-0">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Categoria</th>
                <th>Produtos</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td className="font-semibold text-[var(--text-primary)]">{s.name}</td>
                  <td className="font-mono text-xs">{s.cnpj ?? "—"}</td>
                  <td className="text-sm">{s.contact_name ?? "—"}{s.contact_phone ? ` · ${s.contact_phone}` : ""}</td>
                  <td>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${CAT_CLS[s.category] ?? CAT_CLS.outro}`}>
                      {CAT_LABEL[s.category] ?? s.category}
                    </span>
                  </td>
                  <td className="text-sm font-medium">{s.products?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
