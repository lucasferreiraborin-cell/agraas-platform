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
};

type DisplayRow = {
  id: string;
  product_name: string;
  batch_number: string;
  expiration_date: string;
  quantity: number;
  status: "ok" | "warning" | "expired";
};

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
        .select("id, name");

      if (productsError) {
        console.error("Erro ao buscar products:", productsError);
        setLoading(false);
        return;
      }

      const batches = (batchesData ?? []) as StockBatchRow[];
      const products = (productsData ?? []) as ProductRow[];

      const productMap = new Map<string, string>();
      for (const product of products) {
        productMap.set(product.id, product.name);
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

        return {
          id: batch.id,
          product_name: productMap.get(batch.product_id) ?? "Produto",
          batch_number: batch.batch_number,
          expiration_date: batch.expiration_date,
          quantity: batch.quantity,
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
        <section className="ag-card overflow-hidden p-0">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Lote</th>
                <th>Validade</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={
                  row.status === "expired" ? "bg-red-50" :
                  row.status === "warning" ? "bg-amber-50" : ""
                }>
                  <td className="font-medium text-[var(--text-primary)]">{row.product_name}</td>
                  <td>{row.batch_number}</td>
                  <td>{row.expiration_date}</td>
                  <td>{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}