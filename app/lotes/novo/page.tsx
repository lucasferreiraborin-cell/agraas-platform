"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function NovoLotePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  async function createLot() {
    if (!name.trim()) {
      alert("Informe o nome do lote.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("lots")
      .insert([
        {
          name,
          description: description || null,
          phase: phase || null,
          status,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar lote:", error);
      alert("Erro ao criar lote.");
      setSaving(false);
      return;
    }

    router.push(`/lotes/${data.id}`);
  }

  return (
    <main className="space-y-8">
      <Link
        href="/lotes"
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Lotes
      </Link>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Novo lote</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Criar novo lote operacional
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Estruture grupos de animais por fase produtiva, manejo e operação
              dentro da fazenda.
            </p>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-5">
              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Nome do lote
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Lote Engorda 01"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                />
              </label>

              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Descrição
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo ou característica do lote"
                  rows={4}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                />
              </label>

              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Fase
                </div>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                >
                  <option value="">Selecione a fase</option>
                  <option value="Cria">Cria</option>
                  <option value="Recria">Recria</option>
                  <option value="Engorda">Engorda</option>
                  <option value="Terminação">Terminação</option>
                  <option value="Confinamento">Confinamento</option>
                </select>
              </label>

              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Status
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="closed">Fechado</option>
                </select>
              </label>

              <button
                onClick={createLot}
                disabled={saving}
                className="ag-button-primary mt-2 disabled:opacity-70"
              >
                {saving ? "Salvando..." : "Criar lote"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}