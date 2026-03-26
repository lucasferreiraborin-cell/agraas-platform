"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";

type Row = {
  animal_id: string;
  internal_code: string | null;
  total_score: number | null;
  current_property_name: string | null;
  active_certifications: string[] | null;
  animal_status: string | null;
  sex: string | null;
  breed: string | null;
  agraas_id: string | null;
};

function ScoreCircle({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.max(0, Math.min(100, score)) / 100 * circ;
  const color = score >= 70 ? "#5d9c44" : score >= 40 ? "#d9a343" : "#d64545";
  const track = score >= 70 ? "#e0f0d8" : score >= 40 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center w-[44px] h-[44px]">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke={track} strokeWidth="3.5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 22 22)" />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function formatSex(v: string | null) {
  if (!v) return "—";
  const m: Record<string, string> = { male: "M", female: "F", macho: "M", femea: "F", "fêmea": "F" };
  return m[v.toLowerCase()] ?? v;
}

function statusBadge(v: string | null) {
  const n = (v ?? "").toLowerCase();
  if (n === "active")   return "ag-badge ag-badge-green";
  if (n === "sold")     return "ag-badge bg-blue-50 text-blue-700 border border-blue-200";
  if (n === "pending")  return "ag-badge bg-amber-50 text-amber-700 border border-amber-200";
  return "ag-badge";
}

function statusLabel(v: string | null) {
  const m: Record<string, string> = { active: "Ativo", sold: "Vendido", slaughtered: "Abatido", inactive: "Inativo" };
  return m[(v ?? "").toLowerCase()] ?? (v ?? "—");
}

export default function ScoresFilter({ rows, fazendas }: { rows: Row[]; fazendas: string[] }) {
  const [fazenda, setFazenda] = useState("");
  const [sexo,    setSexo]    = useState("");

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (fazenda && r.current_property_name !== fazenda) return false;
      if (sexo) {
        const s = (r.sex ?? "").toLowerCase();
        if (sexo === "M" && s !== "male" && s !== "macho") return false;
        if (sexo === "F" && s !== "female" && s !== "femea" && s !== "fêmea") return false;
      }
      return true;
    });
  }, [rows, fazenda, sexo]);

  return (
    <section className="ag-card-strong p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="ag-section-title">Ranking completo</h2>
          <p className="ag-section-subtitle">{filtered.length} de {rows.length} animais</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[var(--text-muted)]" />
          <select value={fazenda} onChange={e => setFazenda(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]">
            <option value="">Todas as fazendas</option>
            {fazendas.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={sexo} onChange={e => setSexo(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]">
            <option value="">Todos</option>
            <option value="M">Machos</option>
            <option value="F">Fêmeas</option>
          </select>
          {(fazenda || sexo) && (
            <button onClick={() => { setFazenda(""); setSexo(""); }}
              className="text-xs text-[var(--primary)] hover:underline">Limpar</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">Nenhum animal encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th className="text-center w-12">#</th>
                <th className="text-left">Animal</th>
                <th className="text-left">Fazenda</th>
                <th className="text-center">Sexo</th>
                <th className="text-left">Raça</th>
                <th className="text-center">Status</th>
                <th className="text-center">Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const score = typeof item.total_score === "number" ? item.total_score : null;
                return (
                  <tr key={item.animal_id} className="group">
                    <td className="text-center font-semibold text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                    <td>
                      <p className="font-semibold text-[var(--text-primary)]">{item.internal_code ?? item.animal_id}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.agraas_id ?? "—"}</p>
                    </td>
                    <td className="text-[var(--text-secondary)] max-w-[150px] truncate">{item.current_property_name ?? "—"}</td>
                    <td className="text-center">{formatSex(item.sex)}</td>
                    <td className="text-[var(--text-secondary)]">{item.breed ?? "—"}</td>
                    <td className="text-center">
                      <span className={statusBadge(item.animal_status)}>{statusLabel(item.animal_status)}</span>
                    </td>
                    <td className="text-center">
                      {score !== null
                        ? <ScoreCircle score={Math.round(score)} />
                        : <span className="text-sm text-[var(--text-muted)]">—</span>
                      }
                    </td>
                    <td>
                      <Link href={`/animais/${item.animal_id}`}
                        className="text-xs font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition hover:underline">
                        Passaporte →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
