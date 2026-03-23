"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
};

export default function PesagensPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [weight, setWeight] = useState("");
  const [weighingDate, setWeighingDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnimals() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data, error } = await supabase
          .from("animals")
          .select("id, internal_code, agraas_id")
          .order("internal_code", { ascending: true });

        if (error) {
          console.error("Erro ao buscar animais:", error);
          setLoadError("Não foi possível carregar os animais.");
          setAnimals([]);
          return;
        }

        setAnimals((data ?? []) as AnimalRow[]);
      } catch (err) {
        console.error("Falha inesperada ao buscar animais:", err);
        setLoadError("Erro inesperado ao carregar os animais.");
        setAnimals([]);
      } finally {
        setLoading(false);
      }
    }

    loadAnimals();
  }, []);

  async function createWeight() {
    if (!animalId || !weight || !weighingDate) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    const numericWeight = Number(weight);

    if (Number.isNaN(numericWeight) || numericWeight <= 0) {
      alert("Informe um peso válido.");
      return;
    }

    setSaving(true);

    try {
      const { error: weightError } = await supabase.from("weights").insert([
        {
          animal_id: animalId,
          weight: numericWeight,
          weighing_date: weighingDate,
          notes: notes || null,
        },
      ]);

      if (weightError) {
        console.error("Erro detalhado ao registrar pesagem:", weightError);
        alert(`Erro ao registrar pesagem: ${JSON.stringify(weightError)}`);
        return;
      }

      const { error: eventError } = await supabase.from("events").insert([
        {
          animal_id: animalId,
          source: "farm",
          event_type: "weighing",
          notes: `Pesagem registrada: ${numericWeight} kg`,
          event_date: weighingDate,
        },
      ]);

      if (eventError) {
        console.error("Erro ao registrar evento da pesagem:", eventError);
        alert(`Pesagem salva, mas o evento falhou: ${JSON.stringify(eventError)}`);
      } else {
        alert("Pesagem registrada com sucesso.");
      }

      setAnimalId("");
      setWeight("");
      setWeighingDate(todayInputValue());
      setNotes("");
    } catch (err) {
      console.error("Erro inesperado ao registrar pesagem:", err);
      alert("Erro inesperado ao registrar a pesagem.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Pesagem animal</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Registro de pesagens
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Registre o peso dos animais para acompanhar evolução, desempenho
              e integrar a informação ao passaporte do rebanho.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesagens/historico" className="ag-button-secondary">
                Ver histórico
              </Link>

              <Link href="/animais" className="ag-button-secondary">
                Ver animais
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Animais"
                value={animals.length}
                subtitle="ativos disponíveis para pesagem"
              />
              <MetricCard
                label="Timeline"
                value="ativa"
                subtitle="pesagens entram no passaporte"
              />
              <MetricCard
                label="Módulo"
                value="produtivo"
                subtitle="base para performance do rebanho"
              />
              <MetricCard
                label="Peso"
                value="track"
                subtitle="evolução histórica do animal"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Nova pesagem</h2>
            <p className="ag-section-subtitle">
              Preencha os dados abaixo para registrar o peso do animal.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">Fluxo produtivo</div>
        </div>

        {loading && (
          <div className="mt-8 rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
            Carregando base animal...
          </div>
        )}

        {!loading && loadError && (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div className="mt-8 grid gap-5">
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
                    {animal.agraas_id ? ` • ${animal.agraas_id}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Peso (kg)
              </div>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex.: 420"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Data da pesagem
              </div>
              <input
                type="date"
                value={weighingDate}
                onChange={(e) => setWeighingDate(e.target.value)}
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
                rows={4}
                placeholder="Detalhes adicionais"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <button
              onClick={createWeight}
              disabled={saving}
              className="ag-button-primary mt-2 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Registrar pesagem"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}