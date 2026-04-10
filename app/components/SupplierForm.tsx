"use client";

import { useState } from "react";
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
  { value: "medicamento", label: "Medicamento" },
  { value: "insumo", label: "Insumo" },
  { value: "racao", label: "Ração" },
  { value: "fertilizante", label: "Fertilizante" },
  { value: "semente", label: "Semente" },
  { value: "equipamento", label: "Equipamento" },
  { value: "outro", label: "Outro" },
];

export default function SupplierForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [category, setCategory] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim()) { showToast("Informe o nome do fornecedor.", "error"); return; }
    if (!category) { showToast("Selecione uma categoria.", "error"); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("Não autenticado.", "error"); setSaving(false); return; }
    const { data: client } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!client) { showToast("Cliente não encontrado.", "error"); setSaving(false); return; }

    const { error } = await supabase.from("suppliers").insert({
      client_id: client.id,
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      category,
    });

    setSaving(false);
    if (error) { showToast("Erro ao cadastrar fornecedor.", "error"); return; }

    showToast("Fornecedor cadastrado.");
    setOpen(false);
    setName(""); setCnpj(""); setContactName(""); setContactPhone(""); setCategory("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="ag-button-primary flex items-center gap-2">
        <Plus size={16} /> Novo Fornecedor
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
          type="button"
        >
          ✕
        </button>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Novo Fornecedor</h2>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Ourofino"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">CNPJ</label>
            <input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Contato</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nome"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Telefone</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="(00) 00000-0000"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Categoria *</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]">
              <option value="">Selecione uma categoria</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
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
