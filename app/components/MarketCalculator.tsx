"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

export default function MarketCalculator({ totalAnimals, avgWeight }: { totalAnimals: number; avgWeight: number }) {
  const [preco, setPreco]     = useState(330);
  const [animais, setAnimais] = useState(totalAnimals);
  const [peso, setPeso]       = useState(avgWeight || 450);

  // 1 arroba = 30 kg de peso vivo (estimativa)
  const arrobas      = peso / 30;
  const valorAnimal  = arrobas * preco;
  const valorTotal   = animais * valorAnimal;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  return (
    <section className="ag-card-strong p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Calculator size={16} className="text-[var(--primary)]" />
        <h2 className="ag-section-title">Calculadora de valor do rebanho</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Preço por arroba (R$/@)
          </label>
          <input type="number" value={preco} onChange={e => setPreco(Number(e.target.value))} min={100} max={800} step={5}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
          <input type="range" value={preco} onChange={e => setPreco(Number(e.target.value))} min={100} max={800} step={5}
            className="mt-2 w-full accent-[var(--primary)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Número de animais
          </label>
          <input type="number" value={animais} onChange={e => setAnimais(Number(e.target.value))} min={1}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Peso médio vivo (kg)
          </label>
          <input type="number" value={peso} onChange={e => setPeso(Number(e.target.value))} min={100} max={900}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 border-t border-[var(--border)] pt-5">
        <div className="ag-kpi-card">
          <p className="ag-kpi-label">Arrobas/animal</p>
          <p className="ag-kpi-value">{arrobas.toFixed(1)} @</p>
        </div>
        <div className="ag-kpi-card">
          <p className="ag-kpi-label">Valor por cabeça</p>
          <p className="ag-kpi-value text-[var(--primary)]">{fmt(valorAnimal)}</p>
        </div>
        <div className="ag-kpi-card bg-[var(--primary-soft)]">
          <p className="ag-kpi-label">Valor total do rebanho</p>
          <p className="ag-kpi-value text-[var(--primary)]">{fmt(valorTotal)}</p>
          <p className="sub">{animais} animais × {arrobas.toFixed(1)}@ × R${preco}/@</p>
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Estimativa baseada em 1 arroba = 30 kg de peso vivo. Valores meramente indicativos.
      </p>
    </section>
  );
}
