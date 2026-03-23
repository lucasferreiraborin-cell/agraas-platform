"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type LotRow = {
  id: string;
  name: string;
};

export default function AdicionarAnimalAoLotePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const lotId = params.id;

  const [lot, setLot] = useState<LotRow | null>(null);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [entryDate, setEntryDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBase() {
      setLoading(true);

      const { data: lotData, error: lotError } = await supabase
        .from("lots")
        .select("id, name")
        .eq("id", lotId)
        .single();

      if (lotError) {
        console.error("Erro ao buscar lote:", lotError);
      }

      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, internal_code")
        .order("internal_code", { ascending: true });

      if (animalsError) {
        console.error("Erro ao buscar animais:", animalsError);
      }

      setLot((lotData as LotRow | null) ?? null);
      setAnimals((animalsData as AnimalRow[] | null) ?? []);
      setLoading(false);
    }

    loadBase();
  }, [lotId]);

  async function addAnimalToLot() {
    if (!animalId) {
      alert("Selecione um animal.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("animal_lot_assignments")
      .insert([
        {
          animal_id: animalId,
          lot_id: lotId,
          entry_date: entryDate,
          notes: notes || null,
        },
      ]);

    if (error) {
      console.error("Erro ao vincular animal ao lote:", error);
      alert("Erro ao vincular animal ao lote.");
      setSaving(false);
      return;
    }

    router.push(`/lotes/${lotId}`);
  }

  if (loading) {
    return (
      <main className="space-y-8">
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <Link
        href={`/lotes/${lotId}`}
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Lote
      </Link>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Novo vínculo</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Adicionar animal ao lote
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Vincule um animal ao lote operacional e registre sua entrada na
              timeline da plataforma.
            </p>

            <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-sm text-[var(--text-muted)]">Lote selecionado</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {lot?.name ?? "-"}
              </p>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-5">
              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Animal
                </div>
                <select
                  value={animalId}
                  onChange={(e) => setAnimalId(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                >
                  <option value="">Selecione um animal</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.internal_code ?? animal.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Data de entrada
                </div>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                />
              </label>

              <label>
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Observações
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: entrada para fase de engorda"
                  rows={4}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
                />
              </label>

              <button
                onClick={addAnimalToLot}
                disabled={saving}
                className="ag-button-primary mt-2 disabled:opacity-70"
              >
                {saving ? "Salvando..." : "Adicionar ao lote"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}