"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

type Animal = {
  id: string;
  internal_code: string | null;
};

type Property = {
  id: string;
  name: string | null;
};

export default function VendasPage() {
  return (
    <Suspense fallback={<VendasLoading />}>
      <RegistrarVendaPage />
    </Suspense>
  );
}

function VendasLoading() {
  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-[#5F6B5F]">Carregando venda...</p>
        </section>
      </div>
    </main>
  );
}

function RegistrarVendaPage() {
  const searchParams = useSearchParams();
  const presetAnimalId = searchParams.get("animalId") ?? "";

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [animalId, setAnimalId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [saleDate, setSaleDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    async function loadData() {
      const [animalsRes, propertiesRes] = await Promise.all([
        supabase
          .from("animals")
          .select("id, internal_code")
          .order("created_at", { ascending: false }),

        supabase.from("properties").select("id, name").order("name", {
          ascending: true,
        }),
      ]);

      if (!animalsRes.error && animalsRes.data) {
        setAnimals(animalsRes.data);
      }

      if (!propertiesRes.error && propertiesRes.data) {
        setProperties(propertiesRes.data);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (presetAnimalId) {
      setAnimalId(presetAnimalId);
    }
  }, [presetAnimalId]);

  useEffect(() => {
    if (!saleDate) {
      setSaleDate(today);
    }
  }, [saleDate, today]);

  async function registrarVenda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error: eventError } = await supabase.from("animal_events").insert({
      animal_id: animalId || null,
      event_type: "ownership_transfer",
      event_timestamp: saleDate || null,
      notes: `Transferido para propriedade ${propertyId}`,
    });

    if (eventError) {
      setMessage(`Erro ao registrar venda: ${eventError.message}`);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("animals")
      .update({
        current_property_id: propertyId || null,
      })
      .eq("id", animalId);

    if (updateError) {
      setMessage(
        `Erro ao atualizar propriedade do animal: ${updateError.message}`
      );
      setLoading(false);
      return;
    }

    setMessage("Transferência registrada com sucesso.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Registrar venda / transferência
          </h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Registre a mudança de propriedade do animal.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={registrarVenda} className="space-y-5">
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
                Nova propriedade
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione uma propriedade</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name ?? property.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Data da venda
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
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
              className="rounded-lg bg-[#4A7C3A] px-6 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Registrar venda"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}