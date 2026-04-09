"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { showToast } from "@/app/components/Toast";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

const TYPES = [
  { value: "frigorifico", label: "Frigorífico" },
  { value: "trading", label: "Trading" },
  { value: "exportador", label: "Exportador" },
  { value: "produtor", label: "Produtor" },
  { value: "outro", label: "Outro" },
];

export default function BuyerForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [type, setType] = useState("frigorifico");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim()) { showToast("Informe o nome.", "error"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: client } = user ? await supabase.from("clients").select("id").eq("auth_user_id", user.id).single() : { data: null };
    if (!client) { showToast("Não autenticado.", "error"); setSaving(false); return; }

    const { error } = await supabase.from("buyers").insert({
      client_id: client.id, name: name.trim(), cnpj: cnpj.trim() || null,
      type, contact_name: contactName.trim() || null, contact_phone: contactPhone.trim() || null,
    });
    setSaving(false);
    if (error) { showToast("Erro ao cadastrar.", "error"); return; }
    showToast("Comprador cadastrado.");
    setOpen(false); setName(""); setCnpj(""); setType("frigorifico"); setContactName(""); setContactPhone("");
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="ag-button-primary flex items-center gap-2"><Plus size={16} /> Novo Comprador</button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Novo Comprador</h2>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Frigoboi Goiás"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">CNPJ</label>
              <input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
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
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="ag-button-primary flex-1 disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar"}</button>
            <button onClick={() => setOpen(false)} className="ag-button-secondary flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
