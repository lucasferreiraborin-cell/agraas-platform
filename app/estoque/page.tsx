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
    <div style={{ padding: 40 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: "bold", margin: 0 }}>
          Estoque Sanitário
        </h1>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/estoque/dashboard">
            <button
              style={{
                background: "#ffffff",
                color: "#2e7d32",
                border: "1px solid #2e7d32",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Dashboard
            </button>
          </Link>

          <Link href="/estoque/historico">
            <button
              style={{
                background: "#ffffff",
                color: "#2e7d32",
                border: "1px solid #2e7d32",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Histórico
            </button>
          </Link>

          <Link href="/estoque/novo">
            <button
              style={{
                background: "#2e7d32",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              + Novo Lote
            </button>
          </Link>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && rows.length === 0 && <p>Nenhum lote encontrado.</p>}

      {!loading && rows.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "white",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 12 }}>Produto</th>
              <th style={{ textAlign: "left", padding: 12 }}>Lote</th>
              <th style={{ textAlign: "left", padding: 12 }}>Validade</th>
              <th style={{ textAlign: "left", padding: 12 }}>Quantidade</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: "1px solid #eee",
                  background:
                    row.status === "expired"
                      ? "#ffebee"
                      : row.status === "warning"
                      ? "#fff8e1"
                      : "white",
                }}
              >
                <td style={{ padding: 12 }}>{row.product_name}</td>
                <td style={{ padding: 12 }}>{row.batch_number}</td>
                <td style={{ padding: 12 }}>{row.expiration_date}</td>
                <td style={{ padding: 12 }}>{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}