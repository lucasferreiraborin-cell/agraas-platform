"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { showToast } from "@/app/components/Toast";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const CATEGORIES = [
  { value: "vacina", label: "Vacina" },
  { value: "vermifugo", label: "Vermífugo" },
  { value: "antibiotico", label: "Antibiótico" },
  { value: "antiparasitario", label: "Antiparasitário" },
  { value: "suplemento", label: "Suplemento" },
  { value: "racao", label: "Ração" },
  { value: "fertilizante", label: "Fertilizante" },
  { value: "semente", label: "Semente" },
  { value: "outro", label: "Outro" },
];

type Supplier = { id: string; name: string };

export default function ProductForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unit, setUnit] = useState("ml");
  const [category, setCategory] = useState("outro");
  const [withdrawalDays, setWithdrawalDays] = useState("0");
  const router = useRouter();

  useEffect(() => {
    if (open) {
      supabase.from("suppliers").select("id, name").eq("active", true).order("name")
        .then(({ data }) => setSuppliers((data ?? []) as Supplier[]));
    }
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) { showToast("Informe o nome do produto.", "error"); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("Não autenticado.", "error"); setSaving(false); return; }
    const { data: client } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!client) { showToast("Cliente não encontrado.", "error"); setSaving(false); return; }

    const { error } = await supabase.from("products").insert({
      client_id: client.id,
      supplier_id: supplierId || null,
      name: name.trim(),
      unit,
      category,
      withdrawal_days: parseInt(withdrawalDays) || 0,
    });

    setSaving(false);
    if (error) { showToast("Erro ao cadastrar produto.", "error"); return; }

    showToast("Produto cadastrado.");
    setOpen(false);
    setName(""); setSupplierId(""); setUnit("ml"); setCategory("outro"); setWithdrawalDays("0");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="ag-button-primary flex items-center gap-2">
        <Plus size={16} /> Novo Produto
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Novo Produto</h2>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Ivermectina 1%"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Fornecedor</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]">
              <option value="">Nenhum</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Unidade</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]">
                <option value="ml">ml</option>
                <option value="kg">kg</option>
                <option value="dose">dose</option>
                <option value="unidade">unidade</option>
                <option value="litro">litro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Carência (dias)</label>
              <input type="number" value={withdrawalDays} onChange={e => setWithdrawalDays(e.target.value)} min="0"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="ag-button-primary flex-1 disabled:opacity-60">
              {saving ? "Salvando..." : "Cadastrar"}
            </button>
            <button onClick={() => setOpen(false)} className="ag-button-secondary flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
