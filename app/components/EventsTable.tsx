"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  animal_code: string;
  event_type: string;
  notes: string;
  event_date: string | null;
};

const TYPE_MAP: Record<string, string> = {
  vacinacao: "Vacinação",
  "vacinação": "Vacinação",
  vaccination: "Vacinação",
  pesagem: "Pesagem",
  Pesagem: "Pesagem",
  weighing: "Pesagem",
  inspection: "Inspeção",
  inspecao: "Inspeção",
  "inspeção": "Inspeção",
  movimentacao: "Movimentação",
  "movimentação": "Movimentação",
  lot_entry: "Movimentação",
  lot_exit: "Movimentação",
  venda: "Venda",
  Venda: "Venda",
  sale: "Venda",
  nascimento: "Nascimento",
  birth: "Nascimento",
  desmame: "Desmame",
  application: "Vacinação",
  "aplicação sanitária": "Vacinação",
};

export function normalizeEventType(type: string): string {
  if (!type || type === "-") return "—";
  const key = type.trim();
  return TYPE_MAP[key] ?? TYPE_MAP[key.toLowerCase()] ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

const BADGE: Record<string, string> = {
  "Pesagem":       "bg-[#DCFCE7] text-[#166534] border-emerald-200",
  "Vacinação":     "bg-[#F3E8FF] text-[#6B21A8] border-purple-200",
  "Inspeção":      "bg-[#DBEAFE] text-[#1E40AF] border-blue-200",
  "Movimentação":  "bg-[#F3F4F6] text-[#374151] border-gray-200",
  "Venda":         "bg-[#FFEDD5] text-[#9A3412] border-orange-200",
  "Nascimento":    "bg-[#CCFBF1] text-[#0F766E] border-teal-200",
  "Desmame":       "bg-[#FEF9C3] text-[#854D0E] border-yellow-200",
};

const FILTER_OPTIONS = [
  "Todos", "Pesagem", "Vacinação", "Inspeção", "Movimentação", "Venda", "Nascimento",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function EventsTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState("Todos");

  const normalizedRows = useMemo(
    () => rows.map(r => ({ ...r, normalized: normalizeEventType(r.event_type) })),
    [rows]
  );

  const visible = filter === "Todos"
    ? normalizedRows
    : normalizedRows.filter(r => r.normalized === filter);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-[var(--text-muted)]">Filtrar por tipo:</label>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        >
          {FILTER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <span className="text-xs text-[var(--text-muted)]">
          {visible.length} {visible.length === 1 ? "evento" : "eventos"}
        </span>
      </div>

      <table className="ag-table">
        <thead>
          <tr>
            <th>Animal</th>
            <th>Evento</th>
            <th>Descrição</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(row => {
            const cls = BADGE[row.normalized] ?? "bg-gray-50 text-gray-600 border-gray-200";
            return (
              <tr key={row.id}>
                <td>{row.animal_code}</td>
                <td>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cls}`}>
                    {row.normalized}
                  </span>
                </td>
                <td>{row.notes}</td>
                <td>{formatDate(row.event_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
