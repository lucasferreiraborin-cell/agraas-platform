"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CustoRow = {
  id: string;
  internal_code: string | null;
  breed: string | null;
  weight: number;
  score: number;
  totalCost: number;
  valorCepea: number;
  roi: number;
  roiPct: number;
  lot_code: string | null;
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cotacaoData = new Date().toLocaleDateString("pt-BR");

export default function CustoProducaoTable({ rows }: { rows: CustoRow[] }) {
  const [view, setView] = useState<"animal" | "lote">("animal");

  const lotRows = useMemo(() => {
    const map = new Map<string, { lot_code: string; count: number; cost: number; cepea: number; roi: number; roiPct: number }>();
    for (const r of rows) {
      const key = r.lot_code ?? "Sem lote";
      const cur = map.get(key) ?? { lot_code: key, count: 0, cost: 0, cepea: 0, roi: 0, roiPct: 0 };
      cur.count += 1;
      cur.cost += r.totalCost;
      cur.cepea += r.valorCepea;
      cur.roi += r.roi;
      cur.roiPct += r.roiPct;
      map.set(key, cur);
    }
    return Array.from(map.values()).map(g => ({
      lot_code: g.lot_code,
      count: g.count,
      avgCost: g.cost / g.count,
      avgCepea: g.cepea / g.count,
      avgRoi: g.roi / g.count,
      avgRoiPct: g.roiPct / g.count,
    }));
  }, [rows]);

  return (
    <section className="ag-card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3">
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setView("animal")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              view === "animal" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Por Animal
          </button>
          <button
            type="button"
            onClick={() => setView("lote")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              view === "lote" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Por Lote
          </button>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {view === "animal" ? `${rows.length} animais` : `${lotRows.length} lotes`}
        </span>
      </div>

      {view === "animal" ? (
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th>Animal</th>
              <th>Raça</th>
              <th>Peso</th>
              <th>Score</th>
              <th>Custo</th>
              <th title={`Calculado com rendimento de carcaça de 52% · Cotação CEPEA ref. ${cotacaoData}`}>
                Valor CEPEA
              </th>
              <th>ROI</th>
              <th>ROI %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="font-semibold text-[var(--text-primary)]">
                  <Link href={`/animais/${r.id}`} className="text-[var(--primary-hover)] hover:underline">
                    {r.internal_code ?? r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="text-sm">{r.breed ?? "—"}</td>
                <td className="text-sm font-medium">{r.weight > 0 ? `${r.weight} kg` : "—"}</td>
                <td className="text-sm">{r.score}</td>
                <td className="text-sm">{r.totalCost > 0 ? fmt(r.totalCost) : "—"}</td>
                <td className="text-sm font-medium">{r.weight > 0 ? fmt(r.valorCepea) : "—"}</td>
                <td className={`text-sm font-bold ${r.roi >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {r.weight > 0 ? fmt(r.roi) : "—"}
                </td>
                <td className={`text-sm font-bold ${r.roiPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {r.totalCost > 0 ? `${r.roiPct.toFixed(0)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Animais</th>
              <th>Custo médio</th>
              <th>Valor CEPEA médio</th>
              <th>ROI médio</th>
              <th>ROI %</th>
            </tr>
          </thead>
          <tbody>
            {lotRows.map(g => (
              <tr key={g.lot_code}>
                <td className="font-semibold text-[var(--text-primary)]">{g.lot_code}</td>
                <td className="text-sm">{g.count}</td>
                <td className="text-sm">{fmt(g.avgCost)}</td>
                <td className="text-sm font-medium">{fmt(g.avgCepea)}</td>
                <td className={`text-sm font-bold ${g.avgRoi >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmt(g.avgRoi)}
                </td>
                <td className={`text-sm font-bold ${g.avgRoiPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {g.avgRoiPct.toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
