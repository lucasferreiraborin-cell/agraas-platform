/**
 * Cálculos puros do Agraas Gestão: resultado por centro de custo, caixa do mês,
 * vencimentos, alerta de diesel e CSV do pacote do contador. Sem I/O — testável.
 */
import { atividade } from "./atividades";
import { somaDias } from "./format";

export type Periodo = { inicio: string; fim: string };

export type CentroRow = {
  id: string;
  nome: string;
  tipo: string;
  atividade: string;
  cultura: string | null;
  safra: string | null;
  area_ha: number | string | null;
  cabecas: number | string | null;
};

export type TituloRow = {
  tipo: "pagar" | "receber" | string;
  valor: number | string;
  status: "aberto" | "pago" | "cancelado" | string;
  vencimento: string;
  data_baixa: string | null;
  valor_baixa: number | string | null;
  centro_custo_id: string | null;
  /** 'estoque' = compra que vira estoque (ex.: diesel); o custo entra no consumo, não na compra. */
  natureza?: string | null;
};

export type AbastecimentoRow = {
  data: string;
  litros: number | string;
  preco_litro: number | string | null;
  centro_custo_id: string | null;
};

export function toNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Arredonda para centavos. */
export function arred(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function noPeriodo(iso: string | null | undefined, p: Periodo): boolean {
  return !!iso && iso >= p.inicio && iso <= p.fim;
}

export function valorDiesel(a: Pick<AbastecimentoRow, "litros" | "preco_litro">): number {
  return arred(toNum(a.litros) * toNum(a.preco_litro));
}

/* ------------------------------ Mês ------------------------------ */

/** "2026-11" válido → "2026-11-01"; qualquer outra coisa → mês de `hoje`. */
export function mesDaQuery(param: string | string[] | undefined, hoje: string): string {
  const v = Array.isArray(param) ? param[0] : param;
  const m = v ? /^(\d{4})-(0[1-9]|1[0-2])$/.exec(v) : null;
  if (m && Number(m[1]) >= 2000 && Number(m[1]) <= 2100) return `${m[1]}-${m[2]}-01`;
  return `${hoje.slice(0, 7)}-01`;
}

/** Mês vizinho (delta ±1) a partir de um "yyyy-mm-01"; devolve "yyyy-mm". */
export function mesVizinho(primeiroDia: string, delta: number): string {
  const [y, m] = primeiroDia.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/* ------------------------- Resultado por centro ------------------------- */

export type LinhaResultado = {
  centro: CentroRow;
  custoTitulos: number;
  custoDiesel: number;
  custo: number;
  receita: number;
  margem: number;
  /** Custo por hectare ou por cabeça, conforme a base do centro; null sem base. */
  porBase: { unidade: "ha" | "cabeça"; valor: number } | null;
};

export type ResultadoGeral = {
  linhas: LinhaResultado[];
  semCentro: { custoTitulos: number; custoDiesel: number; custo: number; receita: number };
  total: { custo: number; receita: number; margem: number };
};

/**
 * Custo = títulos a pagar + diesel abastecido (litros × preço). Receita = títulos
 * a receber. Regime por vencimento no período; cancelados ficam de fora.
 * Compra com natureza 'estoque' (diesel) NÃO entra como custo: o custo do diesel
 * é reconhecido no abastecimento (consumo), evitando contar duas vezes.
 */
export function resultadoPorCentro(
  centros: CentroRow[],
  titulos: TituloRow[],
  abastecimentos: AbastecimentoRow[],
  periodo: Periodo,
): ResultadoGeral {
  type Acc = { pagar: number; receber: number; diesel: number };
  const acc = new Map<string, Acc>();
  const sem: Acc = { pagar: 0, receber: 0, diesel: 0 };
  const pega = (id: string | null): Acc => {
    if (!id) return sem;
    let a = acc.get(id);
    if (!a) { a = { pagar: 0, receber: 0, diesel: 0 }; acc.set(id, a); }
    return a;
  };
  const conhecidos = new Set(centros.map((c) => c.id));
  const alvo = (id: string | null) => pega(id && conhecidos.has(id) ? id : null);

  for (const t of titulos) {
    if (t.status === "cancelado" || !noPeriodo(t.vencimento, periodo)) continue;
    if (t.tipo === "pagar" && t.natureza && t.natureza !== "custo") continue;
    const a = alvo(t.centro_custo_id);
    if (t.tipo === "pagar") a.pagar += toNum(t.valor);
    else if (t.tipo === "receber") a.receber += toNum(t.valor);
  }
  for (const ab of abastecimentos) {
    if (!noPeriodo(ab.data, periodo)) continue;
    alvo(ab.centro_custo_id).diesel += valorDiesel(ab);
  }

  const linhas: LinhaResultado[] = centros.map((centro) => {
    const a = acc.get(centro.id) ?? { pagar: 0, receber: 0, diesel: 0 };
    const custo = arred(a.pagar + a.diesel);
    const receita = arred(a.receber);
    const base = atividade(centro.atividade).base;
    let porBase: LinhaResultado["porBase"] = null;
    if (base === "hectares" && toNum(centro.area_ha) > 0) {
      porBase = { unidade: "ha", valor: arred(custo / toNum(centro.area_ha)) };
    } else if (base === "cabecas" && toNum(centro.cabecas) > 0) {
      porBase = { unidade: "cabeça", valor: arred(custo / toNum(centro.cabecas)) };
    }
    return {
      centro,
      custoTitulos: arred(a.pagar),
      custoDiesel: arred(a.diesel),
      custo,
      receita,
      margem: arred(receita - custo),
      porBase,
    };
  });

  const semCusto = arred(sem.pagar + sem.diesel);
  const custoTotal = arred(linhas.reduce((s, l) => s + l.custo, 0) + semCusto);
  const receitaTotal = arred(linhas.reduce((s, l) => s + l.receita, 0) + sem.receber);
  return {
    linhas,
    semCentro: {
      custoTitulos: arred(sem.pagar), custoDiesel: arred(sem.diesel),
      custo: semCusto, receita: arred(sem.receber),
    },
    total: { custo: custoTotal, receita: receitaTotal, margem: arred(receitaTotal - custoTotal) },
  };
}

/* ------------------------------ Caixa ------------------------------ */

/** Entradas/saídas efetivas: títulos pagos com baixa dentro do período. */
export function resumoCaixa(titulos: TituloRow[], periodo: Periodo) {
  let entradas = 0;
  let saidas = 0;
  for (const t of titulos) {
    if (t.status !== "pago" || !noPeriodo(t.data_baixa, periodo)) continue;
    const v = t.valor_baixa != null ? toNum(t.valor_baixa) : toNum(t.valor);
    if (t.tipo === "receber") entradas += v;
    else if (t.tipo === "pagar") saidas += v;
  }
  return { entradas: arred(entradas), saidas: arred(saidas), saldo: arred(entradas - saidas) };
}

/* ---------------------------- Vencimentos ---------------------------- */

export type GrupoVenc = { qtd: number; total: number };
export type Vencimentos = {
  pagar: { vencidos: GrupoVenc; aVencer: GrupoVenc };
  receber: { vencidos: GrupoVenc; aVencer: GrupoVenc };
};

/** Títulos em aberto: vencidos (antes de hoje) e a vencer nos próximos `dias` dias. */
export function classificarVencimentos(titulos: TituloRow[], hoje: string, dias = 7): Vencimentos {
  const limite = somaDias(hoje, dias);
  const vazio = (): GrupoVenc => ({ qtd: 0, total: 0 });
  const r: Vencimentos = {
    pagar: { vencidos: vazio(), aVencer: vazio() },
    receber: { vencidos: vazio(), aVencer: vazio() },
  };
  for (const t of titulos) {
    if (t.status !== "aberto" || (t.tipo !== "pagar" && t.tipo !== "receber")) continue;
    const lado = r[t.tipo];
    const g = t.vencimento < hoje ? lado.vencidos : t.vencimento <= limite ? lado.aVencer : null;
    if (!g) continue;
    g.qtd += 1;
    g.total = arred(g.total + toNum(t.valor));
  }
  return r;
}

/* ------------------------------ Diesel ------------------------------ */

export type AlertaDiesel = {
  litrosUltimos7: number;
  mediaSemanalAnterior: number;
  /** true quando o consumo dos últimos 7 dias passa de `fator` × a média semanal dos 28 dias anteriores. */
  acima: boolean;
};

/** Consumo fora do padrão: últimos 7 dias vs média semanal dos 28 dias anteriores. */
export function alertaDiesel(abastecimentos: AbastecimentoRow[], hoje: string, fator = 1.5): AlertaDiesel {
  const ini7 = somaDias(hoje, -6);
  const ini28 = somaDias(ini7, -28);
  let recente = 0;
  let anterior = 0;
  for (const a of abastecimentos) {
    const l = toNum(a.litros);
    if (a.data >= ini7 && a.data <= hoje) recente += l;
    else if (a.data >= ini28 && a.data < ini7) anterior += l;
  }
  const media = anterior / 4;
  return {
    litrosUltimos7: arred(recente),
    mediaSemanalAnterior: arred(media),
    acima: media > 0 && recente > media * fator,
  };
}

/* ------------------------------ Saudação ------------------------------ */

export function saudacao(agora: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false,
  }).format(agora)) % 24;
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/* -------------------------------- CSV -------------------------------- */

export const CSV_BOM = "﻿";

/**
 * Texto seguro para CSV ';' — aspas quando preciso e neutraliza fórmulas de planilha.
 * Toda quebra vira espaço: CRLF, LF e também o CR solto, que o Excel lê como fim
 * de registro (desalinhava as colunas). Caracteres de controle saem.
 */
export function csvTexto(v: string | null | undefined): string {
  let s = (v ?? "").replace(/[\r\n]+/g, " ").replace(/[^\t\x20-\u{10FFFF}]/gu, "").trim();
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Número com vírgula decimal e sem separador de milhar. */
export function csvNumero(v: number | string | null | undefined, casas = 2): string {
  if (v == null || v === "") return "";
  const n = toNum(v);
  return n.toFixed(casas).replace(".", ",");
}

export function csvLinha(colunas: string[]): string {
  return colunas.join(";");
}
