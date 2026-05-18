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
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="ag-page-title">Histórico de Movimentações</h1>
          <Link href="/estoque" className="ag-button-primary">Voltar ao Estoque</Link>
        </div>
      </section>

      {loading && (
        <div className="ag-card p-8 animate-pulse">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-2xl bg-[var(--surface-soft)]" />
            ))}
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon">📋</div>
          <p className="ag-empty-state-title">Nenhuma movimentação encontrada</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <section className="ag-card overflow-x-auto p-0">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Lote</th>
                <th>Movimento</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at}</td>
                  <td className="font-medium text-[var(--text-primary)]">{row.product_name}</td>
                  <td>{row.batch_number}</td>
                  <td>{row.movement_type}</td>
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