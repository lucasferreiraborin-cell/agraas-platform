"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { showToast } from "@/app/components/Toast";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

type Product = { id: string; name: string };

export default function CalendarForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("todos");
  const [interval, setInterval] = useState("90");
  const [lastApplied, setLastApplied] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (open) {
      supabase.from("products").select("id, name").eq("active", true).order("name")
        .then(({ data }) => setProducts((data ?? []) as Product[]));
    }
  }, [open]);

  async function handleSubmit() {
    const name = productId ? products.find(p => p.id === productId)?.name ?? productName : productName;
    if (!name.trim()) { showToast("Informe o produto.", "error"); return; }
    if (!interval || Number(interval) <= 0) { showToast("Informe o intervalo.", "error"); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: client } = user ? await supabase.from("clients").select("id").eq("auth_user_id", user.id).single() : { data: null };
    if (!client) { showToast("Não autenticado.", "error"); setSaving(false); return; }

    const { error } = await supabase.from("sanitary_calendar").insert({
      client_id: client.id,
      product_id: productId || null,
      product_name: name.trim(),
      animal_category: category,
      interval_days: Number(interval),
      last_applied: lastApplied || null,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (error) { showToast("Erro ao cadastrar.", "error"); return; }
    showToast("Adicionado ao calendário.");
    setOpen(false); setProductId(""); setProductName(""); setCategory("todos"); setInterval("90"); setLastApplied(""); setNotes("");
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="ag-button-primary flex items-center gap-2"><Plus size={16} /> Adicionar</button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Adicionar ao Calendário</h2>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Produto</label>
            {products.length > 0 ? (
              <select value={productId} onChange={e => { setProductId(e.target.value); const p = products.find(p => p.id === e.target.value); if (p) setProductName(p.name); }}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]">
                <option value="">Selecione ou digite abaixo</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ex.: Vacina Aftosa"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Categoria animal</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]">
                <option value="todos">Todos</option><option value="bezerros">Bezerros</option>
                <option value="bezerras">Bezerras</option><option value="novilhas">Novilhas</option>
                <option value="vacas">Vacas</option><option value="touros">Touros</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Intervalo (dias)</label>
              <input type="number" value={interval} onChange={e => setInterval(e.target.value)} min="1"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Última aplicação</label>
            <input type="date" value={lastApplied} onChange={e => setLastApplied(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Observações</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: Campanha obrigatória"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="ag-button-primary flex-1 disabled:opacity-60">{saving ? "Salvando..." : "Adicionar"}</button>
            <button onClick={() => setOpen(false)} className="ag-button-secondary flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
