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
};

type LotRow = {
  id: string;
  name: string;
};

export default function CustosPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [lots, setLots] = useState<LotRow[]>([]);

  const [animalId, setAnimalId] = useState("");
  const [lotId, setLotId] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [costDate, setCostDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBase() {
      setLoading(true);

      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, internal_code")
        .order("internal_code", { ascending: true });

      if (animalsError) {
        console.error("Erro ao buscar animais:", animalsError);
      }

      const { data: lotsData, error: lotsError } = await supabase
        .from("lots")
        .select("id, name")
        .order("name", { ascending: true });

      if (lotsError) {
        console.error("Erro ao buscar lotes:", lotsError);
      }

      setAnimals((animalsData ?? []) as AnimalRow[]);
      setLots((lotsData ?? []) as LotRow[]);
      setLoading(false);
    }

    loadBase();
  }, []);

  async function createCost() {
    if (!category || !amount || !costDate) {
      alert("Preencha categoria, valor e data.");
      return;
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!animalId && !lotId) {
      alert("Associe o custo a um animal ou a um lote.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("cost_records").insert([
      {
        animal_id: animalId || null,
        lot_id: lotId || null,
        category,
        amount: numericAmount,
        cost_date: costDate,
        notes: notes || null,
      },
    ]);

    if (error) {
      console.error("Erro ao registrar custo:", error);
      alert("Erro ao registrar custo.");
      setSaving(false);
      return;
    }

    alert("Custo registrado com sucesso.");

    setAnimalId("");
    setLotId("");
    setCategory("");
    setAmount("");
    setCostDate(todayInputValue());
    setNotes("");
    setSaving(false);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Custos pecuários</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Registro de custos da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Registre custos por animal ou por lote para estruturar a visão
              econômica da fazenda e preparar análises de margem e eficiência.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/custos/historico" className="ag-button-secondary">
                Ver histórico de custos
              </Link>

              <Link href="/relatorios" className="ag-button-secondary">
                Ir para relatórios
              </Link>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Animais"
                value={animals.length}
                subtitle="disponíveis para associação"
              />
              <MetricCard
                label="Lotes"
                value={lots.length}
                subtitle="grupos disponíveis para custos"
              />
              <MetricCard
                label="Módulo"
                value="econômico"
                subtitle="base para rentabilidade"
              />
              <MetricCard
                label="Fase"
                value="ativa"
                subtitle="estrutura pronta para análises"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Novo custo</h2>
            <p className="ag-section-subtitle">
              Registre um custo diretamente vinculado a um animal ou lote.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">Fluxo econômico</div>
        </div>

        {loading && <p className="mt-8">Carregando...</p>}

        {!loading && (
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
                <option value="">Opcional: selecione um animal</option>
                {animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.internal_code ?? animal.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Lote
              </div>
              <select
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              >
                <option value="">Opcional: selecione um lote</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Categoria
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              >
                <option value="">Selecione uma categoria</option>
                <option value="Ração">Ração</option>
                <option value="Medicação">Medicação</option>
                <option value="Mão de obra">Mão de obra</option>
                <option value="Operacional">Operacional</option>
                <option value="Logística">Logística</option>
                <option value="Outros">Outros</option>
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Valor
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex.: 2500"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Data
              </div>
              <input
                type="date"
                value={costDate}
                onChange={(e) => setCostDate(e.target.value)}
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
              onClick={createCost}
              disabled={saving}
              className="ag-button-primary mt-2 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Registrar custo"}
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
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
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