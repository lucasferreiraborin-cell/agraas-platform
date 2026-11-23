/** Formatação BR do Agraas Gestão. Puro — testável. */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const NUM2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function brl(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v;
  return BRL.format(Number.isFinite(n as number) ? (n as number) : 0);
}

export function num(v: number | string | null | undefined, casas: 1 | 2 = 1): string {
  const n = typeof v === "string" ? Number(v) : v;
  const x = Number.isFinite(n as number) ? (n as number) : 0;
  return casas === 2 ? NUM2.format(x) : NUM.format(x);
}

/** "2026-11-23" → "23/11/2026" sem passar por fuso horário. */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

/** Hoje em America/Sao_Paulo, formato ISO (yyyy-mm-dd). */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(agora);
}

/** Soma dias a uma data ISO (sem fuso). */
export function somaDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Primeiro e último dia do mês de uma data ISO. */
export function limitesDoMes(iso: string): { inicio: string; fim: string } {
  const [y, m] = iso.split("-").map(Number);
  const fim = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { inicio: `${y}-${String(m).padStart(2, "0")}-01`, fim };
}

/** Diferença em dias (b − a) entre duas datas ISO. */
export function diasEntre(a: string, b: string): number {
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86_400_000);
}

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export function mesPorExtenso(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}
