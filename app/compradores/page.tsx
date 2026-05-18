import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Users } from "lucide-react";
import BuyerForm from "@/app/components/BuyerForm";

type Buyer = {
  id: string;
  name: string;
  cnpj: string | null;
  type: string;
  contact_name: string | null;
  contact_phone: string | null;
  active: boolean;
  sales: { id: string }[];
};

const TYPE_LABEL: Record<string, string> = {
  frigorifico: "Frigorífico", trading: "Trading", exportador: "Exportador",
  produtor: "Produtor", outro: "Outro",
};
const TYPE_CLS: Record<string, string> = {
  frigorifico: "bg-red-50 text-red-700 border-red-200",
  trading: "bg-blue-50 text-blue-700 border-blue-200",
  exportador: "bg-indigo-50 text-indigo-700 border-indigo-200",
  produtor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  outro: "bg-gray-50 text-gray-600 border-gray-200",
};

export default async function CompradoresPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("buyers")
    .select("id, name, cnpj, type, contact_name, contact_phone, active, sales(id)")
    .eq("active", true)
    .order("name");

  const buyers = (data ?? []) as unknown as Buyer[];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Users size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Compradores</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{buyers.length} ativo{buyers.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <BuyerForm />
        </div>
      </section>

      {buyers.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><Users size={24} /></div>
          <p className="ag-empty-state-title">Nenhum comprador cadastrado</p>
          <p className="ag-empty-state-text">Cadastre frigoríficos, tradings e outros compradores para vincular às vendas.</p>
        </div>
      ) : (
        <section className="ag-card overflow-x-auto p-0">
          <table className="ag-table w-full">
            <thead>
              <tr><th>Nome</th><th>CNPJ</th><th>Tipo</th><th>Contato</th><th>Vendas</th></tr>
            </thead>
            <tbody>
              {buyers.map(b => (
                <tr key={b.id}>
                  <td className="font-semibold text-[var(--text-primary)]">{b.name}</td>
                  <td className="font-mono text-xs">{b.cnpj ?? "—"}</td>
                  <td>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${TYPE_CLS[b.type] ?? TYPE_CLS.outro}`}>
                      {TYPE_LABEL[b.type] ?? b.type}
                    </span>
                  </td>
                  <td className="text-sm">{b.contact_name ?? "—"}{b.contact_phone ? ` · ${b.contact_phone}` : ""}</td>
                  <td className="text-sm font-medium">{b.sales?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
