"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { showToast } from "@/app/components/Toast";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export default function GoalForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("bezerro");
  const [phase, setPhase] = useState("desmame");
  const [weight, setWeight] = useState("");
  const [ageDays, setAgeDays] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!weight || !ageDays) { showToast("Informe peso e idade alvo.", "error"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: client } = user ? await supabase.from("clients").select("id").eq("auth_user_id", user.id).single() : { data: null };
    if (!client) { showToast("Não autenticado.", "error"); setSaving(false); return; }

    const { error } = await supabase.from("animal_goals").insert({
      client_id: client.id, category, phase,
      target_weight_kg: Number(weight), target_age_days: Number(ageDays),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { showToast(error.message.includes("unique") ? "Meta já existe para essa categoria/fase." : "Erro ao cadastrar.", "error"); return; }
    showToast("Meta cadastrada.");
    setOpen(false); setWeight(""); setAgeDays(""); setNotes("");
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="ag-button-primary flex items-center gap-2"><Plus size={16} /> Nova Meta</button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Nova Meta</h2>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]">
                <option value="bezerro">Bezerro</option><option value="novilha">Novilha</option>
                <option value="vaca">Vaca</option><option value="touro">Touro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Fase</label>
              <select value={phase} onChange={e => setPhase(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]">
                <option value="nascimento">Nascimento</option><option value="desmame">Desmame</option>
                <option value="recria">Recria</option><option value="venda">Venda</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Peso alvo (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="180"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Idade alvo (dias)</label>
              <input type="number" value={ageDays} onChange={e => setAgeDays(e.target.value)} placeholder="210"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Observações</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: Meta desmame Nelore"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
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
