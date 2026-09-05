/**
 * Carregador do livro de regras (`rules/`).
 *
 * A trava dura mora aqui: uma regra sem `fonte.verificado_em` ou sem
 * `revisor_humano` NÃO pode alimentar saída que chegue ao cliente. Isso é o
 * que impede norma inventada de virar produto — e é convenção fraca demais se
 * ficar só na documentação, então está em código e em teste.
 *
 * Formato YAML, não JSON: a regra é lida por contador e por advogado, e
 * comentário explicando o porquê de um percentual vale mais que economia de
 * bytes. `js-yaml` já é dependência do projeto.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type ClasseRegra =
  | "FATO" | "FATO-calculado" | "BENCHMARK" | "PREMISSA" | "CONVENCAO" | "DESCONHECIDO";

export type Regra = {
  id: string;
  titulo: string;
  classe: ClasseRegra;
  vigencia: { inicio: string | null; fim: string | null };
  fonte: {
    norma?: string | null;
    artigos?: string[];
    url?: string | null;
    verificado_em: string | null;
  };
  aplicabilidade?: { uf?: string[]; regime?: string[]; atividade?: string[] };
  revisor_humano?: string | null;
  implementado_em?: string[];
  testes?: string | null;
  [k: string]: unknown;
};

export const RULES_DIR = "rules";

/** Erro de validação estrutural de uma regra. */
export type ErroDeRegra = { arquivo: string; problema: string };

const CLASSES = new Set<string>([
  "FATO", "FATO-calculado", "BENCHMARK", "PREMISSA", "CONVENCAO", "DESCONHECIDO",
]);
// Dois ou tres segmentos: R-ITR-01 e R-ICMS-CONV100-01 sao ambos validos.
// O livro de regras do handoff usa a forma curta (R-IR-01, R-FUN-01, R-REF-01).
const ID_RE = /^R-[A-Z0-9]+(?:-[A-Z0-9]+)?-[0-9]{2}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida a estrutura mínima. Não valida o conteúdo tributário — isso é humano. */
export function validarRegra(r: unknown, arquivo: string): ErroDeRegra[] {
  const erros: ErroDeRegra[] = [];
  const push = (problema: string) => erros.push({ arquivo, problema });

  if (typeof r !== "object" || r === null) {
    push("arquivo nao contem um mapa YAML");
    return erros;
  }
  const reg = r as Record<string, unknown>;

  if (typeof reg.id !== "string" || !ID_RE.test(reg.id)) {
    push(`id ausente ou fora do padrao R-DOMINIO-SUB-NN (recebido: ${String(reg.id)})`);
  }
  if (typeof reg.titulo !== "string" || reg.titulo.trim().length < 8) {
    push("titulo ausente ou curto demais");
  }
  if (typeof reg.classe !== "string" || !CLASSES.has(reg.classe)) {
    push(`classe invalida: ${String(reg.classe)}`);
  }

  const vig = reg.vigencia as Record<string, unknown> | undefined;
  if (!vig || !("inicio" in vig)) push("vigencia.inicio ausente");
  else if (vig.inicio !== null && (typeof vig.inicio !== "string" || !DATA_RE.test(vig.inicio))) {
    push("vigencia.inicio deve ser YYYY-MM-DD ou null");
  }

  const fonte = reg.fonte as Record<string, unknown> | undefined;
  if (!fonte || !("verificado_em" in fonte)) {
    push("fonte.verificado_em AUSENTE — campo obrigatorio, use null para A VERIFICAR");
  } else if (
    fonte.verificado_em !== null &&
    (typeof fonte.verificado_em !== "string" || !DATA_RE.test(fonte.verificado_em))
  ) {
    push("fonte.verificado_em deve ser YYYY-MM-DD ou null");
  }

  return erros;
}

/**
 * Regra pode gerar saída destinada ao cliente?
 *
 * Exige fonte verificada. `revisor_humano` é exigido para material EXTERNO
 * (`publicavel`); para cálculo interno, fonte verificada basta.
 */
export function podeCalcular(r: Regra): boolean {
  return Boolean(r.fonte?.verificado_em);
}

/** Regra pode ir para material externo (cliente, investidor, parceiro)? */
export function podePublicar(r: Regra): boolean {
  return podeCalcular(r) && Boolean(r.revisor_humano);
}

/** Regra vigente na data informada. */
export function estaVigente(r: Regra, data: string): boolean {
  const ini = r.vigencia?.inicio;
  const fim = r.vigencia?.fim;
  if (ini && data < ini) return false;
  if (fim && data > fim) return false;
  return true;
}

/** Lista os arquivos .yaml/.yml do diretório de regras, recursivamente. */
export function listarArquivos(dir = RULES_DIR): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listarArquivos(p));
    else if (/\.ya?ml$/i.test(entry.name)) out.push(p);
  }
  return out.sort();
}

/**
 * Normaliza datas para `YYYY-MM-DD`.
 *
 * O YAML 1.1 tipa `2026-09-05` sem aspas como timestamp, e o js-yaml devolve um
 * `Date`. Comparar isso com string quebraria em silêncio. Normalizar no
 * carregamento é melhor que exigir aspas de quem edita a regra — a plateia
 * dessas linhas é contador e advogado, não programador.
 */
function normalizarDatas<T>(valor: T): T {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10) as unknown as T;
  }
  if (Array.isArray(valor)) {
    return valor.map(normalizarDatas) as unknown as T;
  }
  if (valor && typeof valor === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      out[k] = normalizarDatas(v);
    }
    return out as unknown as T;
  }
  return valor;
}

/** Carrega uma regra de arquivo. Lança se o YAML for inválido. */
export function carregarRegra(arquivo: string): Regra {
  return normalizarDatas(yaml.load(fs.readFileSync(arquivo, "utf8"))) as Regra;
}

/** Carrega todas as regras, com os erros de validação encontrados. */
export function carregarTodas(dir = RULES_DIR): { regras: Regra[]; erros: ErroDeRegra[] } {
  const regras: Regra[] = [];
  const erros: ErroDeRegra[] = [];

  for (const arquivo of listarArquivos(dir)) {
    let r: Regra;
    try {
      r = carregarRegra(arquivo);
    } catch (e) {
      erros.push({ arquivo, problema: `YAML invalido: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    erros.push(...validarRegra(r, arquivo));
    regras.push(r);
  }

  const vistos = new Map<string, string>();
  for (const r of regras) {
    if (!r?.id) continue;
    const anterior = vistos.get(r.id);
    if (anterior) erros.push({ arquivo: r.id, problema: `id duplicado (ja usado em ${anterior})` });
    else vistos.set(r.id, r.id);
  }

  return { regras, erros };
}

/** Busca uma regra por id. */
export function buscarRegra(id: string, dir = RULES_DIR): Regra | null {
  return carregarTodas(dir).regras.find(r => r.id === id) ?? null;
}
