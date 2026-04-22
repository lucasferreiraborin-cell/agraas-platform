"use client";

import { useState } from "react";
import Link from "next/link";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

export type MarketRow = {
  animal_id: string;
  internal_code: string | null;
  sex: string | null;
  birth_date: string | null;
  property_name: string | null;
  total_score: number | null;
  last_weight: number | null;
  certifications: { code: string; name: string }[] | null;
  status: string | null;
  has_halal: boolean;
};

function formatSex(v: string | null) {
  if (!v) return "—";
  const m: Record<string, string> = { male: "🐂 Macho", female: "🐄 Fêmea", macho: "🐂 Macho", femea: "🐄 Fêmea", "fêmea": "🐄 Fêmea" };
  return m[v.toLowerCase()] ?? v;
}
function formatDate(v: string | null) { return v ? new Date(v).toLocaleDateString("pt-BR") : "—"; }
function formatStatus(v: string | null) {
  const m: Record<string, string> = { active: "Ativo", sold: "Vendido", slaughtered: "Abatido", inactive: "Inativo" };
  return m[(v ?? "").toLowerCase()] ?? (v ?? "—");
}
function statusCls(v: string | null) {
  const n = (v ?? "").toLowerCase();
  if (n === "active") return "ag-badge ag-badge-green";
  if (n === "sold")   return "ag-badge bg-blue-50 text-blue-700 border border-blue-200";
  return "ag-badge";
}

export default function MarketTable({ rows }: { rows: MarketRow[] }) {
  const [onlyHalal, setOnlyHalal] = useState(false);
  const visible = onlyHalal ? rows.filter(r => r.has_halal) : rows;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={onlyHalal}
            onChange={e => setOnlyHalal(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          Apenas Halal certificados
        </label>
        <span className="text-xs text-[var(--text-muted)]">
          {visible.length} {visible.length === 1 ? "animal" : "animais"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th className="text-left">Animal</th>
              <th className="text-left">Fazenda</th>
              <th className="text-left">Sexo</th>
              <th className="text-right">Peso</th>
              <th className="text-center">Score</th>
              <th className="text-left">Certificações</th>
              <th className="text-center">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(a => {
              const score = Number(a.total_score ?? 0);
              const scoreColor = score >= 70 ? "#2E8B3E" : score >= 40 ? "#d9a343" : "#d64545";
              return (
                <tr key={a.animal_id} className="group">
                  <td>
                    <div>
                      <p className="font-semibold">{a.internal_code ?? a.animal_id}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(a.birth_date)}</p>
                    </div>
                  </td>
                  <td className="max-w-[150px] truncate text-[var(--text-secondary)]">{a.property_name ?? "—"}</td>
                  <td className="text-sm">{formatSex(a.sex)}</td>
                  <td className="text-right tabular-nums font-medium">{a.last_weight != null && a.last_weight > 0 ? `${a.last_weight} kg` : "—"}</td>
                  <td className="text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border"
                        style={{ color: scoreColor, borderColor: scoreColor + "40", backgroundColor: scoreColor + "12" }}>
                        {score}
                      </span>
                      {a.has_halal
                        ? <HalalBadgeSVG size={32} />
                        : <div style={{ width: 32, height: 32 }} />
                      }
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(a.certifications) && a.certifications.length > 0
                        ? a.certifications.slice(0, 2).map(c => <span key={c.code} className="ag-badge ag-badge-green text-[10px]">{c.name}</span>)
                        : <span className="ag-badge text-[10px]">Sem certificação</span>
                      }
                    </div>
                  </td>
                  <td className="text-center"><span className={statusCls(a.status)}>{formatStatus(a.status)}</span></td>
                  <td>
                    <Link href={`/animais/${a.animal_id}`}
                      className="text-xs font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition hover:underline">
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
