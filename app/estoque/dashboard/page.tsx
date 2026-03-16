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

  return (
    <div style={{ padding: 40 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: "bold", margin: 0 }}>
          Dashboard Sanitário
        </h1>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/estoque">
            <button style={secondaryButtonStyle}>
              Estoque
            </button>
          </Link>

          <Link href="/estoque/historico">
            <button style={secondaryButtonStyle}>
              Histórico
            </button>
          </Link>

          <Link href="/estoque/novo">
            <button style={primaryButtonStyle}>
              + Novo Lote
            </button>
          </Link>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <MetricCard
              title="Lotes ativos"
              value={String(totalLots)}
              subtitle="lotes cadastrados no estoque"
              background="#ffffff"
            />

            <MetricCard
              title="Vencendo em 30 dias"
              value={String(expiringSoon)}
              subtitle="atenção para uso ou reposição"
              background="#fff8e1"
            />

            <MetricCard
              title="Lotes vencidos"
              value={String(expiredLots)}
              subtitle="necessitam ação imediata"
              background="#ffebee"
            />

            <MetricCard
              title="Estoque baixo"
              value={String(lowStockLots)}
              subtitle="lotes com saldo crítico"
              background="#fff3e0"
            />

            <MetricCard
              title="Quantidade total"
              value={String(totalQuantity)}
              subtitle="saldo consolidado em estoque"
              background="#eef7ee"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <h2 style={{ fontSize: 22, marginTop: 0, marginBottom: 16 }}>
                Lotes críticos
              </h2>

              {criticalLots.length === 0 ? (
                <p>Nenhum lote crítico encontrado.</p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <th style={thStyle}>Produto</th>
                      <th style={thStyle}>Lote</th>
                      <th style={thStyle}>Validade</th>
                      <th style={thStyle}>Quantidade</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {criticalLots.map((lot) => (
                      <tr key={lot.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={tdStyle}>{lot.product_name}</td>
                        <td style={tdStyle}>{lot.batch_number}</td>
                        <td style={tdStyle}>{lot.expiration_date}</td>
                        <td style={tdStyle}>{lot.quantity}</td>
                        <td style={tdStyle}>
                          <span style={getStatusPillStyle(lot.status)}>
                            {formatLotStatus(lot.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <h2 style={{ fontSize: 22, marginTop: 0, marginBottom: 16 }}>
                Últimas movimentações
              </h2>

              {recentMovements.length === 0 ? (
                <p>Nenhuma movimentação encontrada.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <strong>{movement.product_name}</strong>
                        <span style={{ color: "#666", fontSize: 13 }}>
                          {movement.created_at}
                        </span>
                      </div>

                      <div style={{ fontSize: 14, color: "#555" }}>
                        {movement.movement_type} • Quantidade: {movement.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  background,
}: {
  title: string;
  value: string;
  subtitle: string;
  background: string;
}) {
  return (
    <div
      style={{
        background,
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: "bold", marginBottom: 8 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#777" }}>{subtitle}</div>
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

function formatLotStatus(value: "expired" | "warning" | "low_stock") {
  const map = {
    expired: "Vencido",
    warning: "Vence em breve",
    low_stock: "Estoque baixo",
  };

  return map[value];
}

function getStatusPillStyle(value: "expired" | "warning" | "low_stock"): React.CSSProperties {
  if (value === "expired") {
    return {
      background: "#ffebee",
      color: "#c62828",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
    };
  }

  if (value === "warning") {
    return {
      background: "#fff8e1",
      color: "#b26a00",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
    };
  }

  return {
    background: "#fff3e0",
    color: "#ef6c00",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  };
}

const primaryButtonStyle: React.CSSProperties = {
  background: "#2e7d32",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#ffffff",
  color: "#2e7d32",
  border: "1px solid #2e7d32",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
};

const tdStyle: React.CSSProperties = {
  padding: 12,
};