"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TargetArrobasEditor({
  propertyId,
  initialValue,
}: {
  propertyId: string;
  initialValue: number | null;
}) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    const num = parseFloat(value);
    if (!num || num <= 0) return;
    setSaving(true);
    await supabase
      .from("properties")
      .update({ target_arrobas: num })
      .eq("id", propertyId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={e => { setValue(e.target.value); setSaved(false); }}
        placeholder="Meta em @"
        min="0"
        step="0.1"
        className="w-32 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#4A7C3A]"
      />
      <button
        type="button"
        onClick={salvar}
        disabled={saving || !value}
        className="rounded-xl bg-[var(--primary-hover)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B6B2E] disabled:opacity-50"
      >
        {saving ? "Salvando..." : saved ? "Salvo ✓" : "Definir meta"}
      </button>
    </div>
  );
}
