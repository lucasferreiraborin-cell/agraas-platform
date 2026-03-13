"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

type Animal = {
  id: string;
  internal_code: string | null;
};

export default function PesagensPage() {
  return (
    <Suspense fallback={<PesagensLoading />}>
      <NovaPesagemPage />
    </Suspense>
  );
}

function PesagensLoading() {
  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-[#5F6B5F]">Carregando pesagem...</p>
        </section>
      </div>
    </main>
  );
}

function NovaPesagemPage() {
  const searchParams = useSearchParams();
  const presetAnimalId = searchParams.get("animalId") ?? "";

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [weight, setWeight] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    async function loadAnimals() {
      const { data, error } = await supabase
        .from("animals")
        .select("id, internal_code")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAnimals(data);
      }
    }

    loadAnimals();
  }, []);

  useEffect(() => {
    if (presetAnimalId) {
      setAnimalId(presetAnimalId);
    }
  }, [presetAnimalId]);

  useEffect(() => {
    if (!recordDate) {
      setRecordDate(today);
    }
  }, [recordDate, today]);

  async function registrarPesagem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("weight_records").insert({
      animal_id: animalId || null,
      weight: weight ? Number(weight) : null,
      record_date: recordDate || null,
    });

    if (error) {
      setMessage(`Erro ao registrar pesagem: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Pesagem registrada com sucesso.");
    setWeight("");
    setRecordDate(today);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Registrar pesagem
          </h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Registre o peso de um animal da base.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={registrarPesagem} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Animal</label>
              <select
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione um animal</option>
                {animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.internal_code ?? animal.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex.: 420"
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Data da pesagem
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              />
            </div>

            {message ? (
              <div className="rounded-lg bg-[#F5F7F4] px-4 py-3 text-sm text-[#1F2A1F]">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#4A7C3A] px-5 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Registrar pesagem"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}