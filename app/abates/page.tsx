"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Animal = {
  id: string;
  internal_code: string | null;
};

type Slaughterhouse = {
  id: string;
  name: string | null;
};

export default function RegistrarAbatePage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [slaughterhouses, setSlaughterhouses] = useState<Slaughterhouse[]>([]);

  const [animalId, setAnimalId] = useState("");
  const [slaughterhouseId, setSlaughterhouseId] = useState("");
  const [slaughterDate, setSlaughterDate] = useState("");
  const [carcassWeight, setCarcassWeight] = useState("");
  const [classification, setClassification] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    async function loadData() {
      const [animalsRes, slaughterhousesRes] = await Promise.all([
        supabase
          .from("animals")
          .select("id, internal_code")
          .order("created_at", { ascending: false }),

        supabase
          .from("slaughterhouses")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (!animalsRes.error && animalsRes.data) setAnimals(animalsRes.data);
      if (!slaughterhousesRes.error && slaughterhousesRes.data)
        setSlaughterhouses(slaughterhousesRes.data);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!slaughterDate) setSlaughterDate(today);
  }, [slaughterDate, today]);

  async function registrarAbate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("slaughter_records").insert({
      animal_id: animalId || null,
      slaughterhouse_id: slaughterhouseId || null,
      slaughter_date: slaughterDate || null,
      carcass_weight: carcassWeight ? Number(carcassWeight) : null,
      classification: classification || null,
    });

    if (error) {
      setMessage(`Erro ao registrar abate: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Abate registrado com sucesso.");
    setAnimalId("");
    setSlaughterhouseId("");
    setCarcassWeight("");
    setClassification("");
    setSlaughterDate(today);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Registrar abate
          </h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Registre o abate do animal e os dados do frigorífico.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={registrarAbate} className="space-y-5">
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
                Frigorífico
              </label>
              <select
                value={slaughterhouseId}
                onChange={(e) => setSlaughterhouseId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione um frigorífico</option>
                {slaughterhouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name ?? item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Data do abate
              </label>
              <input
                type="date"
                value={slaughterDate}
                onChange={(e) => setSlaughterDate(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Peso de carcaça
              </label>
              <input
                type="number"
                step="0.01"
                value={carcassWeight}
                onChange={(e) => setCarcassWeight(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: 280"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Classificação
              </label>
              <input
                type="text"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: A"
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
              className="rounded-lg bg-[#4A7C3A] px-6 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Registrar abate"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}