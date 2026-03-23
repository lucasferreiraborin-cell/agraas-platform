"use client";

import { useEffect, useMemo, useState } from "react";
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

type ProductRow = {
  id: string;
  name: string;
};

type BatchRow = {
  id: string;
  product_id: string;
  batch_number: string;
  expiration_date: string;
  quantity: number;
};

export default function AplicacoesPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);

  const [animalId, setAnimalId] = useState("");
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [dose, setDose] = useState("");
  const [applicationDate, setApplicationDate] = useState(todayInputValue());

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

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .order("name", { ascending: true });

      if (productsError) {
        console.error("Erro ao buscar produtos:", productsError);
      }

      const { data: batchesData, error: batchesError } = await supabase
        .from("stock_batches")
        .select("id, product_id, batch_number, expiration_date, quantity")
        .gt("quantity", 0)
        .order("expiration_date", { ascending: true });

      if (batchesError) {
        console.error("Erro ao buscar lotes:", batchesError);
      }

      setAnimals((animalsData ?? []) as AnimalRow[]);
      setProducts((productsData ?? []) as ProductRow[]);
      setBatches((batchesData ?? []) as BatchRow[]);
      setLoading(false);
    }

    loadBase();
  }, []);

  const filteredBatches = useMemo(() => {
    if (!productId) return [];

    return batches
      .filter((batch) => batch.product_id === productId && Number(batch.quantity) > 0)
      .sort((a, b) => {
        const aDate = new Date(a.expiration_date).getTime();
        const bDate = new Date(b.expiration_date).getTime();
        return aDate - bDate;
      });
  }, [batches, productId]);

  const selectedBatch = useMemo(() => {
    return filteredBatches.find((batch) => batch.id === batchId) ?? null;
  }, [filteredBatches, batchId]);

  useEffect(() => {
    if (!productId) {
      setBatchId("");
      return;
    }

    if (filteredBatches.length > 0) {
      setBatchId(filteredBatches[0].id);
    } else {
      setBatchId("");
    }
  }, [productId, filteredBatches]);

  async function refreshBatches() {
    const { data: batchesData, error: batchesError } = await supabase
      .from("stock_batches")
      .select("id, product_id, batch_number, expiration_date, quantity")
      .gt("quantity", 0)
      .order("expiration_date", { ascending: true });

    if (batchesError) {
      console.error("Erro ao atualizar lotes:", batchesError);
      return;
    }

    setBatches((batchesData ?? []) as BatchRow[]);
  }

  async function registerApplication() {
    if (!animalId || !productId || !batchId || !dose || !applicationDate) {
      alert("Preencha todos os campos.");
      return;
    }

    const numericDose = Number(dose);

    if (Number.isNaN(numericDose) || numericDose <= 0) {
      alert("Informe uma dose válida.");
      return;
    }

    if (!selectedBatch) {
      alert("Selecione um lote válido.");
      return;
    }

    if (Number(selectedBatch.quantity) < numericDose) {
      alert("Quantidade insuficiente no lote selecionado.");
      return;
    }

    setSaving(true);

    const { error: applicationError } = await supabase
      .from("applications")
      .insert([
        {
          animal_id: animalId,
          product_id: productId,
          batch_id: batchId,
          dose: numericDose,
          application_date: applicationDate,
        },
      ]);

    if (applicationError) {
      console.error(
        "Erro ao registrar aplicação:",
        JSON.stringify(applicationError)
      );
      alert("Erro ao registrar aplicação.");
      setSaving(false);
      return;
    }

    alert("Aplicação registrada com baixa automática no estoque.");

    setAnimalId("");
    setProductId("");
    setBatchId("");
    setDose("");
    setApplicationDate(todayInputValue());

    await refreshBatches();

    setSaving(false);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Aplicação sanitária</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Registro operacional de aplicações
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Registre aplicações sanitárias com seleção automática por FEFO,
              baixa de estoque e rastreabilidade por animal, produto e lote.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/aplicacoes/historico" className="ag-button-secondary">
                Ver histórico de aplicações
              </Link>

              <Link href="/estoque" className="ag-button-secondary">
                Ir para estoque
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Animais disponíveis"
                value={animals.length}
                subtitle="ativos para aplicação"
              />
              <MetricCard
                label="Produtos"
                value={products.length}
                subtitle="itens sanitários cadastrados"
              />
              <MetricCard
                label="Lotes disponíveis"
                value={batches.length}
                subtitle="estoque com saldo positivo"
              />
              <MetricCard
                label="FEFO"
                value="ativo"
                subtitle="lote mais próximo do vencimento"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Nova aplicação</h2>
            <p className="ag-section-subtitle">
              Preencha os campos abaixo para registrar uma aplicação sanitária.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            Fluxo com baixa automática
          </div>
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
                Produto
              </div>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              >
                <option value="">Selecione um produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Lote
              </div>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={!productId || filteredBatches.length === 0}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)] disabled:opacity-60"
              >
                <option value="">
                  {!productId
                    ? "Selecione um produto antes"
                    : filteredBatches.length === 0
                    ? "Sem lotes disponíveis para este produto"
                    : "Selecione um lote"}
                </option>

                {filteredBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_number} | saldo {batch.quantity} | validade{" "}
                    {batch.expiration_date}
                  </option>
                ))}
              </select>
            </label>

            {productId && filteredBatches.length > 0 && selectedBatch && (
              <div className="rounded-2xl border border-[rgba(93,156,68,0.20)] bg-[var(--primary-soft)] px-4 py-4 text-sm leading-6 text-[var(--primary-hover)]">
                <strong>Lote FEFO selecionado automaticamente:</strong>{" "}
                {selectedBatch.batch_number} — validade{" "}
                {selectedBatch.expiration_date} — saldo {selectedBatch.quantity}
              </div>
            )}

            {productId && filteredBatches.length === 0 && (
              <div className="rounded-2xl border border-[rgba(214,69,69,0.18)] bg-[rgba(214,69,69,0.08)] px-4 py-4 text-sm leading-6 text-[var(--danger)]">
                Não há lote disponível com saldo para este produto.
              </div>
            )}

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Dose
              </div>
              <input
                type="number"
                placeholder="Ex.: 10"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Data da aplicação
              </div>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)]"
              />
            </label>

            <button
              onClick={registerApplication}
              disabled={saving}
              className="ag-button-primary mt-2 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Registrar aplicação"}
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