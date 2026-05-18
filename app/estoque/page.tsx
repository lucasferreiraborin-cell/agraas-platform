"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type StockBatchRow = {
  id: string;
  product_id: string;
  batch_number: string;
  expiration_date: string;
  quantity: number;
};

type ProductRow = {
  id: string;
  name: string;
  unit: string | null;
};

type DisplayRow = {
  id: string;
  product_name: string;
  batch_number: string;
  expiration_date: string;
  quantity: number;
  unit: string;
  status: "ok" | "warning" | "expired";
};

function fmtDateBR(d: string): string {
  try { return new Date(d).toLocaleDateString("pt-BR"); }
  catch { return d; }
}

export default function EstoquePage() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBatches() {
      const { data: batchesData, error: batchesError } = await supabase
        .from("stock_batches")
        .select("id, product_id, batch_number, expiration_date, quantity")
        .order("expiration_date", { ascending: true });

      if (batchesError) {
        console.error("Erro ao buscar stock_batches:", batchesError);
        setLoading(false);
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, unit");

      if (productsError) {
        console.error("Erro ao buscar products:", productsError);
        setLoading(false);
        return;
      }

      const batches = (batchesData ?? []) as StockBatchRow[];
      const products = (productsData ?? []) as ProductRow[];

      const productMap = new Map<string, ProductRow>();
      for (const product of products) {
        productMap.set(product.id, product);
      }

      const today = new Date();

      const mapped: DisplayRow[] = batches.map((batch) => {
        const expiration = new Date(batch.expiration_date);
        const diffDays =
          (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        let status: "ok" | "warning" | "expired" = "ok";

        if (diffDays < 0) {
          status = "expired";
        } else if (diffDays < 30) {
          status = "warning";
        }

        const prod = productMap.get(batch.product_id);
        return {
          id: batch.id,
          product_name: prod?.name ?? "Produto",
          batch_number: batch.batch_number,
          expiration_date: batch.expiration_date,
          quantity: batch.quantity,
          unit: prod?.unit ?? "un",
          status,
        };
      });

      setRows(mapped);
      setLoading(false);
    }

    loadBatches();
  }, []);

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="ag-page-title">Estoque Sanitário</h1>
          <div className="flex gap-3">
            <Link href="/estoque/dashboard" className="ag-button-secondary">Dashboard</Link>
            <Link href="/estoque/historico" className="ag-button-secondary">Histórico</Link>
            <Link href="/estoque/novo" className="ag-button-primary">+ Novo Lote</Link>
          </div>
        </div>
      </section>

      {loading && (
        <div className="ag-card p-8 animate-pulse">
          <div className="h-6 w-48 rounded-full bg-[var(--border)]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-2xl bg-[var(--surface-soft)]" />
            ))}
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon">📦</div>
          <p className="ag-empty-state-title">Nenhum lote encontrado</p>
          <p className="ag-empty-state-text">Cadastre o primeiro lote de estoque sanitário.</p>
          <Link href="/estoque/novo" className="ag-button-primary mt-2">+ Novo Lote</Link>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <section className="ag-card overflow-x-auto p-0">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Lote</th>
                <th>Validade</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge =
                  row.status === "expired" ? { cls: "border-red-200 bg-red-50 text-red-700", label: "Vencido" } :
                  row.status === "warning" ? { cls: "border-amber-200 bg-amber-50 text-amber-700", label: "Vence em 30d" } :
                                              { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "OK" };
                return (
                  <tr key={row.id}>
                    <td className="font-medium text-[var(--text-primary)]">{row.product_name}</td>
                    <td className="font-mono text-xs">{row.batch_number}</td>
                    <td>{fmtDateBR(row.expiration_date)}</td>
                    <td>{row.quantity} {row.unit}</td>
                    <td>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}