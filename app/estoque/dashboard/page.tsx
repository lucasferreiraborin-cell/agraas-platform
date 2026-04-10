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

type MovementRow = {
  id: string;
  product_id: string | null;
  batch_id: string | null;
  movement_type: string | null;
  quantity: number | null;
  created_at: string | null;
};

type RecentMovement = {
  id: string;
  created_at: string;
  product_name: string;
  movement_type: string;
  quantity: number;
};

type CriticalLot = {
  id: string;
  product_name: string;
  batch_number: string;
  expiration_date: string;
  quantity: number;
  status: "expired" | "warning" | "low_stock";
};

export default function EstoqueDashboardPage() {
  const [loading, setLoading] = useState(true);

  const [totalLots, setTotalLots] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [expiredLots, setExpiredLots] = useState(0);
  const [lowStockLots, setLowStockLots] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);

  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [criticalLots, setCriticalLots] = useState<CriticalLot[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const { data: batchesData, error: batchesError } = await supabase
        .from("stock_batches")
        .select("id, product_id, batch_number, expiration_date, quantity")
        .order("expiration_date", { ascending: true });

      if (batchesError) {
        console.error("Erro ao buscar lotes:", batchesError);
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

      const { data: movementsData, error: movementsError } = await supabase
        .from("stock_movements")
        .select("id, product_id, batch_id, movement_type, quantity, created_at")
        .order("created_at", { ascending: false })
        .limit(8);

      if (movementsError) {
        console.error("Erro ao buscar movimentações:", movementsError);
        setLoading(false);
        return;
      }

      const batches = (batchesData ?? []) as StockBatchRow[];
      const products = (productsData ?? []) as ProductRow[];
      const movements = (movementsData ?? []) as MovementRow[];

      const productMap = new Map<string, string>();
      for (const product of products) {
        productMap.set(product.id, product.name);
      }

      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      let countExpiringSoon = 0;
      let countExpired = 0;
      let countLowStock = 0;
      let quantitySum = 0;

      const mappedCriticalLots: CriticalLot[] = [];

      for (const batch of batches) {
        const quantity = Number(batch.quantity ?? 0);
        quantitySum += quantity;

        const expiration = new Date(batch.expiration_date);

        if (expiration < today) {
          countExpired += 1;

          mappedCriticalLots.push({
            id: batch.id,
            product_name: productMap.get(batch.product_id) ?? "Produto",
            batch_number: batch.batch_number,
            expiration_date: batch.expiration_date,
            quantity,
            status: "expired",
          });

          continue;
        }

        if (expiration <= in30Days) {
          countExpiringSoon += 1;

          mappedCriticalLots.push({
            id: batch.id,
            product_name: productMap.get(batch.product_id) ?? "Produto",
            batch_number: batch.batch_number,
            expiration_date: batch.expiration_date,
            quantity,
            status: "warning",
          });

          continue;
        }

        if (quantity <= 20) {
          countLowStock += 1;

          mappedCriticalLots.push({
            id: batch.id,
            product_name: productMap.get(batch.product_id) ?? "Produto",
            batch_number: batch.batch_number,
            expiration_date: batch.expiration_date,
            quantity,
            status: "low_stock",
          });
        }
      }

      const mappedMovements: RecentMovement[] = movements.map((movement) => ({
        id: movement.id,
        created_at: movement.created_at
          ? new Date(movement.created_at).toLocaleString("pt-BR")
          : "-",
        product_name: movement.product_id
          ? productMap.get(movement.product_id) ?? "Produto"
          : "Produto",
        movement_type: formatMovementType(movement.movement_type),
        quantity: movement.quantity ?? 0,
      }));

      setTotalLots(batches.length);
      setExpiringSoon(countExpiringSoon);
      setExpiredLots(countExpired);
      setLowStockLots(countLowStock);
      setTotalQuantity(quantitySum);
      setRecentMovements(mappedMovements);
      setCriticalLots(mappedCriticalLots);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const STATUS_BADGE: Record<string, string> = {
    expired:   "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700",
    warning:   "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700",
    low_stock: "rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700",
  };

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="ag-page-title">Dashboard Sanitário</h1>
          <div className="flex gap-3">
            <Link href="/estoque" className="ag-button-secondary">Estoque</Link>
            <Link href="/estoque/historico" className="ag-button-secondary">Histórico</Link>
            <Link href="/estoque/novo" className="ag-button-primary">+ Novo Lote</Link>
          </div>
        </div>
      </section>

      {loading && (
        <div className="ag-card p-8 animate-pulse">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[var(--surface-soft)]" />
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <>
          <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="ag-kpi-card p-5"><p className="ag-kpi-label">Lotes ativos</p><p className="ag-kpi-value">{totalLots}</p><p className="text-xs text-[var(--text-muted)]">cadastrados no estoque</p></div>
            <div className="ag-kpi-card p-5 bg-amber-50"><p className="ag-kpi-label">Vencendo em 30d</p><p className="ag-kpi-value" style={{ color: "#B45309" }}>{expiringSoon}</p><p className="text-xs text-[var(--text-muted)]">atenção para reposição</p></div>
            <div className="ag-kpi-card p-5 bg-red-50"><p className="ag-kpi-label">Vencidos</p><p className="ag-kpi-value" style={{ color: "#DC2626" }}>{expiredLots}</p><p className="text-xs text-[var(--text-muted)]">ação imediata</p></div>
            <div className="ag-kpi-card p-5 bg-orange-50"><p className="ag-kpi-label">Estoque baixo</p><p className="ag-kpi-value" style={{ color: "#D97706" }}>{lowStockLots}</p><p className="text-xs text-[var(--text-muted)]">saldo crítico</p></div>
            <div className="ag-kpi-card p-5 bg-[var(--primary-soft)]"><p className="ag-kpi-label">Quantidade total</p><p className="ag-kpi-value text-[var(--primary)]">{totalQuantity}</p><p className="text-xs text-[var(--text-muted)]">saldo consolidado</p></div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="ag-card p-8">
              <h2 className="ag-section-title mb-4">Lotes críticos</h2>
              {criticalLots.length === 0 ? (
                <div className="ag-empty-state">
                  <p className="ag-empty-state-title">Nenhum lote crítico</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ag-table w-full">
                    <thead>
                      <tr><th>Produto</th><th>Lote</th><th>Validade</th><th>Qtd</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {criticalLots.map((lot) => (
                        <tr key={lot.id}>
                          <td className="font-medium text-[var(--text-primary)]">{lot.product_name}</td>
                          <td>{lot.batch_number}</td>
                          <td>{lot.expiration_date}</td>
                          <td>{lot.quantity}</td>
                          <td><span className={STATUS_BADGE[lot.status]}>{formatLotStatus(lot.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ag-card p-8">
              <h2 className="ag-section-title mb-4">Últimas movimentações</h2>
              {recentMovements.length === 0 ? (
                <div className="ag-empty-state">
                  <p className="ag-empty-state-title">Nenhuma movimentação</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMovements.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{movement.product_name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{movement.created_at}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{movement.movement_type} · Quantidade: {movement.quantity}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function formatMovementType(value: string | null) {
  const map: Record<string, string> = { entrada: "Entrada", saida: "Saída", aplicacao: "Aplicação", ajuste: "Ajuste" };
  if (!value) return "-";
  return map[value.toLowerCase()] ?? value;
}

function formatLotStatus(value: "expired" | "warning" | "low_stock") {
  const map = { expired: "Vencido", warning: "Vence em breve", low_stock: "Estoque baixo" };
  return map[value];
}