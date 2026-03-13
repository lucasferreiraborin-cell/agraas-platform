"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

type Animal = {
  id: string;
  internal_code: string | null;
};

type Product = {
  id: string;
  name?: string | null;
  product_name?: string | null;
};

type StockBatch = {
  id: string;
  batch_number?: string | null;
  lot_code?: string | null;
};

export default function AplicacoesPage() {
  return (
    <Suspense fallback={<AplicacoesLoading />}>
      <NovaAplicacaoPage />
    </Suspense>
  );
}

function AplicacoesLoading() {
  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-[#5F6B5F]">Carregando aplicação...</p>
        </section>
      </div>
    </main>
  );
}

function NovaAplicacaoPage() {
  const searchParams = useSearchParams();
  const presetAnimalId = searchParams.get("animalId") ?? "";

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);

  const [animalId, setAnimalId] = useState("");
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [dose, setDose] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      const [animalsRes, productsRes, batchesRes] = await Promise.all([
        supabase
          .from("animals")
          .select("id, internal_code")
          .order("created_at", { ascending: false }),

        supabase
          .from("products")
          .select("id, name, product_name")
          .order("created_at", { ascending: false }),

        supabase
          .from("stock_batches")
          .select("id, batch_number, lot_code")
          .order("created_at", { ascending: false }),
      ]);

      if (!animalsRes.error && animalsRes.data) {
        setAnimals(animalsRes.data);
      }

      if (!productsRes.error && productsRes.data) {
        setProducts(productsRes.data);
      }

      if (!batchesRes.error && batchesRes.data) {
        setBatches(batchesRes.data);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (presetAnimalId) {
      setAnimalId(presetAnimalId);
    }
  }, [presetAnimalId]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!applicationDate) {
      setApplicationDate(today);
    }
  }, [applicationDate, today]);

  async function registrarAplicacao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      animal_id: animalId || null,
      product_id: productId || null,
      batch_id: batchId || null,
      dose: dose ? Number(dose) : null,
      application_date: applicationDate || null,
    };

    const { error } = await supabase.from("applications").insert(payload);

    if (error) {
      setMessage(`Erro ao registrar aplicação: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Aplicação registrada com sucesso.");
    setProductId("");
    setBatchId("");
    setDose("");
    setApplicationDate(today);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Registrar aplicação
          </h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Registre uma aplicação sanitária para um animal da base.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={registrarAplicacao} className="space-y-5">
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
              <label className="mb-2 block text-sm font-medium">Produto</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione um produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name ?? product.product_name ?? product.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Lote de insumo
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione um lote</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_number ?? batch.lot_code ?? batch.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Dose</label>
              <input
                type="number"
                step="0.01"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="Ex.: 10"
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Data da aplicação
              </label>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
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
              {loading ? "Registrando..." : "Registrar aplicação"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}