"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type MovementRow = {
  id: string;
  product_id: string | null;
  batch_id: string | null;
  movement_type: string | null;
  quantity: number | null;
  created_at: string | null;
};

type ProductRow = {
  id: string;
  name: string;
};

type BatchRow = {
  id: string;
  batch_number: string;
};

type DisplayRow = {
  id: string;
  product_name: string;
  batch_number: string;
  movement_type: string;
  quantity: number;
  created_at: string;
};

export default function HistoricoEstoquePage() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);

      const { data: movementsData, error: movementsError } = await supabase
        .from("stock_movements")
        .select("id, product_id, batch_id, movement_type, quantity, created_at")
        .order("created_at", { ascending: false });

      if (movementsError) {
        console.error("Erro ao buscar movimentações:", movementsError);
        setLoading(false);
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name");

      if (productsError) {
        console.error("Erro ao buscar produtos:", productsError);
        setLoading(false);
        return;
      }

      const { data: batchesData, error: batchesError } = await supabase
        .from("stock_batches")
        .select("id, batch_number");

      if (batchesError) {
        console.error("Erro ao buscar lotes:", batchesError);
        setLoading(false);
        return;
      }

      const movements = (movementsData ?? []) as MovementRow[];
      const products = (productsData ?? []) as ProductRow[];
      const batches = (batchesData ?? []) as BatchRow[];

      const productMap = new Map<string, string>();
      const batchMap = new Map<string, string>();

      for (const product of products) {
        productMap.set(product.id, product.name);
      }

      for (const batch of batches) {
        batchMap.set(batch.id, batch.batch_number);
      }

      const mapped: DisplayRow[] = movements.map((movement) => ({
        id: movement.id,
        product_name: movement.product_id
          ? productMap.get(movement.product_id) ?? "Produto"
          : "Produto",
        batch_number: movement.batch_id
          ? batchMap.get(movement.batch_id) ?? "-"
          : "-",
        movement_type: formatMovementType(movement.movement_type),
        quantity: movement.quantity ?? 0,
        created_at: movement.created_at
          ? new Date(movement.created_at).toLocaleString("pt-BR")
          : "-",
      }));

      setRows(mapped);
      setLoading(false);
    }

    loadHistory();
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
          Histórico de Movimentações
        </h1>

        <Link href="/estoque">
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
            Voltar ao Estoque
          </button>
        </Link>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && rows.length === 0 && (
        <p>Nenhuma movimentação encontrada.</p>
      )}

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
              <th style={{ textAlign: "left", padding: 12 }}>Data</th>
              <th style={{ textAlign: "left", padding: 12 }}>Produto</th>
              <th style={{ textAlign: "left", padding: 12 }}>Lote</th>
              <th style={{ textAlign: "left", padding: 12 }}>Movimento</th>
              <th style={{ textAlign: "left", padding: 12 }}>Quantidade</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 12 }}>{row.created_at}</td>
                <td style={{ padding: 12 }}>{row.product_name}</td>
                <td style={{ padding: 12 }}>{row.batch_number}</td>
                <td style={{ padding: 12 }}>{row.movement_type}</td>
                <td style={{ padding: 12 }}>{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatMovementType(value: string | null) {
  const map: Record<string, string> = {
    entrada: "Entrada",
    saida: "Saída",
    aplicacao: "Aplicação",
    ajuste: "Ajuste",
  };

  if (!value) return "-";
  return map[value.toLowerCase()] ?? value;
}