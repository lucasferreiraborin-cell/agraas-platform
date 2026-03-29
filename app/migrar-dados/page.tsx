"use client";

import { useState, useRef } from "react";
import {
  FileUp, ChevronRight, CheckCircle2, AlertCircle,
  RefreshCw, Loader2,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = "upload" | "mapping" | "preview" | "result";

const AGRAAS_FIELDS = [
  { key: "internal_code", label: "Código do animal",    required: true },
  { key: "nickname",      label: "Apelido / Nome" },
  { key: "sex",           label: "Sexo" },
  { key: "breed",         label: "Raça" },
  { key: "birth_date",    label: "Data de nascimento" },
  { key: "weight",        label: "Peso (kg)" },
  { key: "status",        label: "Status" },
  { key: "rfid",          label: "RFID / Chip" },
  { key: "sire_code",     label: "Código do pai" },
  { key: "dam_code",      label: "Código da mãe" },
];

type AgraasFieldKey = (typeof AGRAAS_FIELDS)[number]["key"];

const AUTO_MAP: Record<AgraasFieldKey, string[]> = {
  internal_code: ["codigo", "code", "id", "brinco", "tag", "numero", "num", "animal", "identificacao", "ident"],
  nickname:      ["apelido", "nome", "name", "nick", "alias"],
  sex:           ["sexo", "sex", "genero", "gender"],
  breed:         ["raca", "breed", "racial", "grupo"],
  birth_date:    ["nascimento", "birth", "nasc", "dob", "born", "dtnasc", "datanasc"],
  weight:        ["peso", "weight", "kg", "pesagem", "massa"],
  status:        ["status", "situacao", "state", "condicao"],
  rfid:          ["rfid", "chip", "brincoelet", "eletronic", "transponder", "eid"],
  sire_code:     ["pai", "sire", "touro", "father", "codpai", "reprodutor"],
  dam_code:      ["mae", "dam", "vaca", "mother", "codmae", "genitora"],
};

type ParsedState = {
  headers: string[];
  rows: string[][];
  encoding: string;
  separator: string;
  totalLines: number;
};

type ImportResult = {
  created: number;
  updated: number;
  weights_created: number;
  errors: Array<{ row: number; field: string; message: string }>;
  animal_ids: string[];
};

// ── CSV utils ──────────────────────────────────────────────────────────────────
function detectAndDecode(buffer: ArrayBuffer): { text: string; encoding: string } {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), encoding: "UTF-8" };
  } catch {
    return { text: new TextDecoder("iso-8859-1").decode(buffer), encoding: "Latin-1" };
  }
}

function detectSeparator(line: string): string {
  const counts = {
    ",": (line.match(/,/g) ?? []).length,
    ";": (line.match(/;/g) ?? []).length,
    "\t": (line.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === sep && !inQ) {
      result.push(cur.trim()); cur = "";
    } else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string, encoding: string): ParsedState {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .split("\n").filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [], encoding, separator: ",", totalLines: 0 };
  const separator = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], separator);
  const rows = lines.slice(1).map(l => parseCSVLine(l, separator));
  return { headers, rows, encoding, separator, totalLines: rows.length };
}

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function buildAutoMap(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, keywords] of Object.entries(AUTO_MAP)) {
    for (const h of headers) {
      const n = normalizeKey(h);
      if (keywords.some(k => n === k || n.startsWith(k) || k.startsWith(n))) {
        result[field] = h;
        break;
      }
    }
  }
  return result;
}

const SEP_LABEL: Record<string, string> = { ",": "vírgula", ";": "ponto e vírgula", "\t": "tab" };
const STEP_LABELS = ["Upload", "Mapeamento", "Prévia", "Resultado"];
const STEP_KEYS: Step[] = ["upload", "mapping", "preview", "result"];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MigrarDadosPage() {
  const [step, setStep]           = useState<Step>("upload");
  const [parsed, setParsed]       = useState<ParsedState | null>(null);
  const [mapping, setMapping]     = useState<Record<string, string>>({});
  const [autoMapped, setAutoMapped] = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<ImportResult | null>(null);
  const [scoringState, setScoringState] = useState<"idle" | "loading" | "done">("idle");
  const [scoringCount, setScoringCount] = useState(0);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Apenas arquivos .csv são aceitos.");
      return;
    }
    const buf = await file.arrayBuffer();
    const { text, encoding } = detectAndDecode(buf);
    const p = parseCSV(text, encoding);
    const am = buildAutoMap(p.headers);
    setParsed(p);
    setMapping(am);
    setAutoMapped(new Set(Object.keys(am)));
    setStep("mapping");
  }

  async function handleImport() {
    if (!parsed) return;
    setLoading(true);
    try {
      const rowObjects = parsed.rows.map(row => {
        const obj: Record<string, string> = {};
        parsed.headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
        return obj;
      });
      const res = await fetch("/api/migrate-animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowObjects, mapping }),
      });
      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    if (!result?.animal_ids.length) return;
    setScoringState("loading");
    const res = await fetch("/api/migrate-animals/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animal_ids: result.animal_ids }),
    });
    const data = await res.json();
    setScoringCount(data.recalculated ?? 0);
    setScoringState("done");
  }

  function resetAll() {
    setStep("upload");
    setParsed(null);
    setMapping({});
    setAutoMapped(new Set());
    setResult(null);
    setScoringState("idle");
    setScoringCount(0);
  }

  const mappedFields = AGRAAS_FIELDS.filter(f => mapping[f.key]);
  const headerIdxMap = new Map(parsed?.headers.map((h, i) => [h, i]) ?? []);
  const previewRows  = (parsed?.rows.slice(0, 10) ?? []).map(row =>
    Object.fromEntries(mappedFields.map(f => [f.key, row[headerIdxMap.get(mapping[f.key]) ?? -1] ?? ""]))
  );
  const stepIndex = STEP_KEYS.indexOf(step);

  return (
    <main className="space-y-8">
      {/* ── Hero ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="p-8 lg:p-10">
          <div className="ag-badge ag-badge-green">Migração de Dados</div>
          <h1 className="ag-page-title mt-4">Migrar meus dados</h1>
          <p className="mt-4 max-w-2xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
            Importe seu rebanho a partir de um arquivo CSV. O mapeamento de campos é feito
            automaticamente e pode ser ajustado antes da importação.
          </p>
        </div>
      </section>

      {/* ── Step indicator ── */}
      <div className="flex flex-wrap items-center gap-1">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition ${
              i === stepIndex
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : i < stepIndex
                ? "text-[var(--text-secondary)]"
                : "text-[var(--text-muted)]"
            }`}>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                i < stepIndex  ? "bg-[rgba(93,156,68,0.15)] text-[var(--primary)]"
                : i === stepIndex ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
              }`}>
                {i < stepIndex ? "✓" : i + 1}
              </span>
              {label}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight size={14} className="mx-0.5 shrink-0 text-[var(--text-muted)]" />
            )}
          </div>
        ))}
      </div>

      {/* ── Etapa 1: Upload ── */}
      {step === "upload" && (
        <div className="ag-card p-8">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed p-16 transition ${
              dragOver
                ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-[rgba(93,156,68,0.4)] hover:bg-[var(--primary-soft)]"
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(93,156,68,0.12)]">
              <FileUp size={28} className="text-[var(--primary)]" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                Arraste seu CSV aqui ou clique para selecionar
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                Suporta UTF-8 e Latin-1 · Separadores: vírgula, ponto e vírgula ou tab
              </p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {/* ── Etapa 2: Mapeamento ── */}
      {step === "mapping" && parsed && (
        <div className="ag-card space-y-6 p-8">
          <div>
            <h2 className="ag-section-title">Mapeamento de campos</h2>
            <p className="ag-section-subtitle">
              <span className="font-medium text-[var(--text-secondary)]">{parsed.totalLines} registros</span>
              {" · "}Encoding: <span className="font-medium text-[var(--text-secondary)]">{parsed.encoding}</span>
              {" · "}Separador: <span className="font-medium text-[var(--text-secondary)]">{SEP_LABEL[parsed.separator] ?? parsed.separator}</span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {AGRAAS_FIELDS.map(field => (
              <div key={field.key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{field.label}</span>
                  {field.required && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                      Obrigatório
                    </span>
                  )}
                  {mapping[field.key] && autoMapped.has(field.key) && (
                    <span className="ml-auto rounded-full bg-[rgba(93,156,68,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                      Auto
                    </span>
                  )}
                </div>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value="">— ignorar —</option>
                  {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep("upload")} className="ag-button-secondary">Voltar</button>
            <button
              disabled={!mapping["internal_code"]}
              onClick={() => setStep("preview")}
              className="ag-button-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ver prévia
            </button>
          </div>
        </div>
      )}

      {/* ── Etapa 3: Prévia ── */}
      {step === "preview" && parsed && (
        <div className="ag-card space-y-6 p-8">
          <div>
            <h2 className="ag-section-title">Prévia da importação</h2>
            <p className="ag-section-subtitle">
              Primeiros {Math.min(10, parsed.totalLines)} de {parsed.totalLines} registros
              {" · "}Sexo e datas serão normalizados automaticamente
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  {mappedFields.map(f => <th key={f.key}>{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {mappedFields.map(f => (
                      <td key={f.key} className="max-w-[160px] truncate">
                        {row[f.key] || <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep("mapping")} className="ag-button-secondary">Voltar</button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="ag-button-primary flex items-center gap-2 disabled:opacity-60"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" />Importando...</>
                : <>Importar {parsed.totalLines} registros</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Etapa 4: Resultado ── */}
      {step === "result" && result && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="ag-kpi-card">
              <p className="text-sm text-[var(--text-muted)]">Animais criados</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-[var(--primary)]">{result.created}</p>
            </div>
            <div className="ag-kpi-card">
              <p className="text-sm text-[var(--text-muted)]">Animais atualizados</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">{result.updated}</p>
            </div>
            <div className="ag-kpi-card">
              <p className="text-sm text-[var(--text-muted)]">Pesagens registradas</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">{result.weights_created}</p>
            </div>
          </div>

          {/* Score recalculation */}
          <div className="ag-card flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Calcular scores dos animais importados</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Dispara o recálculo do score Agraas para os {result.animal_ids.length} animais desta sessão.
              </p>
            </div>
            {scoringState === "idle" && (
              <button
                onClick={handleRecalculate}
                className="ag-button-primary shrink-0 flex items-center gap-2"
              >
                <RefreshCw size={15} />
                Calcular scores
              </button>
            )}
            {scoringState === "loading" && (
              <div className="flex shrink-0 items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 size={16} className="animate-spin" />
                Calculando...
              </div>
            )}
            {scoringState === "done" && (
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-[var(--primary)]">
                <CheckCircle2 size={16} />
                {scoringCount} scores calculados
              </div>
            )}
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="ag-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {result.errors.length} aviso{result.errors.length !== 1 ? "s" : ""}
                </h3>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex flex-wrap items-start gap-3 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm">
                    <span className="shrink-0 text-[var(--text-muted)]">Linha {e.row}</span>
                    <span className="shrink-0 font-medium text-[var(--text-secondary)]">{e.field}</span>
                    <span className="text-[var(--text-muted)]">{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={resetAll} className="ag-button-secondary">
              Nova importação
            </button>
            <Link href="/animais" className="ag-button-primary">
              Ver animais
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
