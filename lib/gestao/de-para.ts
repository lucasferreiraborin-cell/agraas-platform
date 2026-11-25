/**
 * De-para de produto — item da nota → produto da fazenda (portal Gestão, 24/11/2026).
 * Módulo PURO: sem banco, sem request. Testes em __tests__/gestao-de-para.test.ts.
 *
 * ── A dor ────────────────────────────────────────────────────────────────────
 * Cada fornecedor escreve o mesmo produto de um jeito ("ROUNDUP ORIGINAL DI
 * 20L", "GLIFOSATO 480 SL BB 20 LT"...). Sem de-para, cada nome vira um
 * produto e o estoque duplica. Aqui vivem:
 *  - a normalização do texto do item (chave do apelido gravado);
 *  - a sugestão de casamento com nível de confiança;
 *  - a categoria sugerida pelo NCM.
 *
 * ── Regra de ouro ────────────────────────────────────────────────────────────
 * Só "liga sozinho" o que o produtor JÁ confirmou: mesmo texto normalizado do
 * mesmo fornecedor. Todo o resto — inclusive código de barras igual e mesmo
 * nome vindo de outro fornecedor — é SUGESTÃO a 1 clique. Um casamento errado
 * e silencioso custaria a confiança no estoque inteiro.
 *
 * ── Atenção ──────────────────────────────────────────────────────────────────
 * `normalizarTexto` gera a chave gravada em produto_apelidos.texto_normalizado
 * (migration 176). Mudar a normalização faz apelidos antigos deixarem de
 * casar — só com migração dos dados.
 *
 * O produto de destino é a linha de `products` (catálogo único do estoque,
 * decisão de 24/11/2026); o apelido guarda `product_id`.
 */

import { extractBlock, extractTag } from "@/lib/fiscal/nfe-parser";

// ── Categorias ───────────────────────────────────────────────────────────────
//
// Catálogo único (decisão de 24/11/2026): o produto é a linha de `products`, a
// mesma tabela que a pecuária já usa (sanitário, estoque, aplicações). Por isso
// o vocabulário de `products.category` é o da plataforma (app/produtos/page.tsx
// e ProductForm: vacina, vermifugo, antibiotico, antiparasitario, suplemento,
// medicamento, racao, fertilizante, semente, outro) acrescido só do que a
// fazenda de lavoura e a frota precisam: diesel, defensivo, peca, servico.

export const CATEGORIAS = [
  "diesel", "fertilizante", "defensivo", "semente", "racao", "suplemento", "vacina", "medicamento",
  "vermifugo", "antiparasitario", "antibiotico", "peca", "servico", "outro",
] as const;
export type CategoriaProduto = (typeof CATEGORIAS)[number];

export const CATEGORIA_NOME: Record<CategoriaProduto, string> = {
  diesel: "Diesel",
  fertilizante: "Fertilizante",
  defensivo: "Defensivo",
  semente: "Semente",
  racao: "Ração",
  suplemento: "Suplemento",
  vacina: "Vacina",
  medicamento: "Medicamento",
  vermifugo: "Vermífugo",
  antiparasitario: "Antiparasitário",
  antibiotico: "Antibiótico",
  peca: "Peça",
  servico: "Serviço",
  outro: "Outro",
};

export function ehCategoria(v: unknown): v is CategoriaProduto {
  return typeof v === "string" && (CATEGORIAS as readonly string[]).includes(v);
}

/** Rótulo de qualquer valor de products.category (inclusive os que não estão na lista). */
export function rotuloCategoria(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  if (!s) return "Sem categoria";
  return ehCategoria(s) ? CATEGORIA_NOME[s] : s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Normalização ─────────────────────────────────────────────────────────────

const MARCAS = /[̀-ͯ]/g;

/** Formas de embalagem → sigla única. Só palavra inteira. */
const EMBALAGENS: Record<string, string> = {
  saco: "sc", sacos: "sc", sc: "sc", scs: "sc", sco: "sc",
  bombona: "bb", bombonas: "bb", bb: "bb", bbn: "bb",
  galao: "gl", galoes: "gl", gl: "gl", gal: "gl",
  balde: "bd", baldes: "bd", bd: "bd",
  frasco: "fr", frascos: "fr", fr: "fr", fco: "fr",
  caixa: "cx", caixas: "cx", cx: "cx",
  pacote: "pct", pacotes: "pct", pct: "pct", pcte: "pct",
  bag: "bag", bags: "bag", bigbag: "bag",
  tambor: "tb", tambores: "tb", tb: "tb",
  ampola: "amp", ampolas: "amp", amp: "amp",
  unidade: "un", unidades: "un", un: "un", und: "un", unid: "un",
};
const SIGLAS_EMBALAGEM = new Set(Object.values(EMBALAGENS));

/** Número colado à unidade, com a grafia canônica. Ordem importa: ml antes de l, kg antes de g. */
const UNIDADES: Array<[RegExp, string]> = [
  [/(\d)\s*(?:mililitros?|mls?|cc)\b/g, "$1ml"],          // 1 cc = 1 mL
  [/(\d)\s*(?:litros?|lts?|l)\b/g, "$1l"],
  [/(\d)\s*(?:quilogramas?|quilos?|kilos?|kgs?)\b/g, "$1kg"],
  [/(\d)\s*(?:gramas?|grs?|g)\b/g, "$1g"],
  [/(\d)\s*(?:toneladas?|tons?|t)\b/g, "$1t"],
  [/(\d)\s*m3\b/g, "$1m3"],
  [/(\d)\s*(?:unidades?|unid|unds?|un)\b/g, "$1un"],
  [/(\d)\s*(?:doses?|ds)\b/g, "$1dose"],
];

/** 1000 ml = 1 l, 1000 g = 1 kg, 1000 kg = 1 t: "BIMECTIN 1000ML" e "BIMECTIN 1 LT" viram a mesma chave. */
const CONVERSOES: Array<[RegExp, string]> = [
  [/\b(\d+(?:\.\d+)?)ml\b/g, "l"],
  [/\b(\d+(?:\.\d+)?)g\b/g, "kg"],
  [/\b(\d+(?:\.\d+)?)kg\b/g, "t"],
];

function numeroCanonico(m: string): string {
  if (m.length > 15) return m; // código longo (GTIN impresso etc.): não passa por Number
  const n = Number(m);
  return Number.isFinite(n) ? String(n) : m;
}

/**
 * Texto do item → chave estável. Minúsculo, sem acento, embalagem e unidade
 * com grafia única, número sem zero sobrando, percentual colado.
 *
 *   "SAL MINERAL SC C/ 30 KGS"  → "sal mineral sc 30kg"
 *   "Sal Mineral Saco 30 kg"    → "sal mineral sc 30kg"
 *   "Ivermectina 1,0 %"         → "ivermectina 1%"
 *   "BIMECTIN 1.000 ML"         → "bimectin 1l"
 */
/** Primeiro passo comum: minúsculo, sem acento, milhar BR fora, vírgula decimal vira ponto. */
function preNormalizar(descricao: string | null | undefined): string {
  let s = (descricao ?? "").normalize("NFD").replace(MARCAS, "").toLowerCase();
  s = s.replace(/[ºª°]/g, " ").replace(/²/g, "2").replace(/³/g, "3");
  // Milhar BR ("1.000", "1.500,00") sai ANTES de a vírgula virar ponto decimal.
  // "0.500" fica: começa em zero, é decimal escrito com ponto.
  s = s.replace(/\b\d{1,3}(?:\.\d{3})+(?!\d|\.\d)/g, (m) => (m.startsWith("0") ? m : m.replace(/\./g, "")));
  return s.replace(/(\d),(\d)/g, "$1.$2");
}

export function normalizarTexto(descricao: string | null | undefined): string {
  let s = preNormalizar(descricao);
  s = s.replace(/\b[cp]\s*\/\s*/g, " ");                       // "c/ 30kg", "p/ bovinos"
  s = s.replace(/([a-z])-(?=\d)/g, "$1");                       // "s-10" → "s10"
  s = s.replace(/(\d)\s*x\s*(?=\d)/g, "$1x");                   // "12 x 1 l" → "12x1 l"
  s = s.replace(/\b(sc|bb|gl|bd|fr|cx|pct|bag|tb|amp)(?=\d)/g, "$1 "); // "sc30kg" → "sc 30kg"
  for (const [rx, sub] of UNIDADES) s = s.replace(rx, sub);
  s = s.replace(/(\d)\s*%/g, "$1%").replace(/%(?=[a-z0-9])/g, "% ");
  s = s.replace(/[^a-z0-9%.\-\s]+/g, " ");
  // Ponto e hífen só sobrevivem entre dígitos ("1.5l", "20-00-20").
  s = s.replace(/[.\-]/g, (c: string, i: number, str: string) =>
    (/\d/.test(str.charAt(i - 1)) && /\d/.test(str.charAt(i + 1)) ? c : " "));
  s = s.replace(/\d+(?:\.\d+)?/g, numeroCanonico);
  for (const [rx, destino] of CONVERSOES) {
    s = s.replace(rx, (m: string, n: string) => {
      const v = Number(n);
      return Number.isFinite(v) && v >= 1000 ? `${numeroCanonico(String(v / 1000))}${destino}` : m;
    });
  }
  return s.split(/\s+/).filter(Boolean).map((t) => EMBALAGENS[t] ?? t).join(" ");
}

/** Dois nomes de produto são o mesmo nome? (caixa, acento e espaço não contam) */
export function mesmoNome(a: string, b: string): boolean {
  const na = normalizarTexto(a);
  return na.length > 0 && na === normalizarTexto(b);
}

/**
 * CPF (11 dígitos) ou CNPJ (14 posições, que podem ser alfanuméricas nas
 * inscrições novas — 12 alfanuméricos + 2 dígitos verificadores). Sem
 * pontuação, em maiúsculas. Qualquer outra coisa vira null.
 */
export function normalizarDoc(v: string | null | undefined): string | null {
  const d = (v ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (/^\d{11}$/.test(d) || /^[0-9A-Z]{12}\d{2}$/.test(d)) return d;
  return null;
}

/** NCM com 8 dígitos, ou null. */
export function normalizarNcm(v: string | null | undefined): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 8 ? d : null;
}

/** "38089324" → "3808.93.24" (exibição). */
export function formatarNcm(ncm: string): string {
  const d = ncm.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : ncm;
}

/**
 * GTIN (código de barras) válido, padronizado em 14 dígitos — ou null.
 * FATO: GTIN-8/12/13/14 com dígito verificador módulo 10, pesos 3 e 1 a
 * partir da direita (Especificações Gerais GS1); os curtos se representam em
 * 14 posições com zeros à esquerda. "SEM GTIN" (texto que a NF-e aceita para
 * produto sem código) e lixo viram null.
 */
export function gtinValido(v: string | null | undefined): string | null {
  const d = (v ?? "").trim();
  if (!/^\d+$/.test(d) || ![8, 12, 13, 14].includes(d.length) || /^0+$/.test(d)) return null;
  let soma = 0;
  for (let i = 0; i < d.length - 1; i++) {
    const digito = Number(d.charAt(d.length - 2 - i));
    soma += digito * (i % 2 === 0 ? 3 : 1);
  }
  const dv = (10 - (soma % 10)) % 10;
  return dv === Number(d.charAt(d.length - 1)) ? d.padStart(14, "0") : null;
}

/** GTIN de cada item de um XML de NF-e, pela descrição normalizada (<cEAN> do <prod>). */
export function gtinsPorDescricao(xml: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const det of extractBlock(xml, "det")) {
    const prod = extractBlock(det, "prod")[0] ?? det;
    const gtin = gtinValido(extractTag(prod, "cEAN"));
    const texto = normalizarTexto(extractTag(prod, "xProd"));
    if (gtin && texto && !mapa.has(texto)) mapa.set(texto, gtin);
  }
  return mapa;
}

// ── Unidade e fator de conversão ─────────────────────────────────────────────
//
// O apelido guarda `fator_conversao`: quantidade na unidade do produto =
// quantidade do item (na unidade da nota, `unidade_nota`) × fator. Ex.: item
// "GLIFOSATO GL 20L", 10 GL na nota, produto em litros → fator 20 → 200 L.
// FATO (SI): 1 L = 1000 mL; 1 m³ = 1000 L; 1 kg = 1000 g; 1 t = 1000 kg.
// Unidade de embalagem (GL, SC, BB, FR, CX...) só converte se a descrição
// disser o conteúdo; sem isso, o fator fica em branco e o estoque não chuta.

export type UnidadeBase = "ml" | "l" | "m3" | "g" | "kg" | "t" | "un" | "dose";

const UNIDADE_BASE: Record<string, UnidadeBase> = {
  ml: "ml", mls: "ml", cc: "ml",
  l: "l", lt: "l", lts: "l", litro: "l", litros: "l",
  m3: "m3",
  g: "g", gr: "g", grs: "g", grama: "g", gramas: "g",
  kg: "kg", kgs: "kg", quilo: "kg", quilos: "kg",
  t: "t", ton: "t", tons: "t", tonelada: "t", toneladas: "t",
  un: "un", und: "un", unid: "un", unidade: "un", unidades: "un", pc: "un", peca: "un", pecas: "un",
  dose: "dose", doses: "dose", ds: "dose",
};

const SIGLA_UNIDADE: Record<UnidadeBase, string> = {
  ml: "ML", l: "L", m3: "M3", g: "G", kg: "KG", t: "T", un: "UN", dose: "DOSE",
};

const GRANDEZA: Record<UnidadeBase, { grandeza: "volume" | "massa" | "contagem" | "dose"; emBase: number }> = {
  ml: { grandeza: "volume", emBase: 0.001 }, l: { grandeza: "volume", emBase: 1 }, m3: { grandeza: "volume", emBase: 1000 },
  g: { grandeza: "massa", emBase: 0.001 }, kg: { grandeza: "massa", emBase: 1 }, t: { grandeza: "massa", emBase: 1000 },
  un: { grandeza: "contagem", emBase: 1 }, dose: { grandeza: "dose", emBase: 1 },
};

const arred6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Unidade de medida (L, KG, ML, T, UN, DOSE...) → base. Embalagem (GL, SC, BB) → null. */
export function unidadeBase(u: string | null | undefined): UnidadeBase | null {
  const k = (u ?? "").normalize("NFD").replace(MARCAS, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return UNIDADE_BASE[k] ?? null;
}

/** Converte `q` de uma unidade para outra da mesma grandeza; null se as grandezas diferem. */
export function converterUnidade(q: number, de: UnidadeBase, para: UnidadeBase): number | null {
  if (GRANDEZA[de].grandeza !== GRANDEZA[para].grandeza || !Number.isFinite(q)) return null;
  return arred6((q * GRANDEZA[de].emBase) / GRANDEZA[para].emBase);
}

// "t" sozinho fica de fora de propósito: em "ÓLEO 2T" é dois tempos, não tonelada.
const UN_CONTEUDO = "(mls?|cc|litros?|lts?|l|quilos?|kgs?|gramas?|grs?|g|toneladas?|tons?|doses?|ds|m3)";
const RX_MULTIPLO = new RegExp(`(\\d+)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*${UN_CONTEUDO}\\b`);
const RX_CONTEUDO = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UN_CONTEUDO}\\b`, "g");

/**
 * Conteúdo de UMA unidade comercial, lido da descrição: "GL 20L" → 20 l;
 * "CX 12X1L" → 12 l; "SC 30KG" → 30 kg; "50 DOSES" → 50 dose. Vale a última
 * medida do texto (o conteúdo costuma fechar a descrição; concentração como
 * "480 G/L" vem antes). null se não houver medida.
 */
export function conteudoDaEmbalagem(descricao: string | null | undefined): { quantidade: number; unidade: UnidadeBase } | null {
  const s = preNormalizar(descricao);
  const mult = RX_MULTIPLO.exec(s);
  if (mult) {
    const u = unidadeBase(mult[3]);
    const q = Number(mult[1]) * Number(mult[2]);
    if (u && q > 0) return { quantidade: arred6(q), unidade: u };
  }
  let ultimo: { quantidade: number; unidade: UnidadeBase } | null = null;
  for (const m of s.matchAll(RX_CONTEUDO)) {
    const u = unidadeBase(m[2]);
    const q = Number(m[1]);
    if (u && q > 0) ultimo = { quantidade: q, unidade: u };
  }
  return ultimo;
}

/**
 * Fator para ligar o item a um produto JÁ cadastrado: quantas unidades do
 * produto vale 1 unidade da nota. null quando não dá para saber sem chutar.
 */
export function fatorParaProduto(
  item: { descricao: string; unidade?: string | null },
  unidadeProduto: string | null | undefined,
): number | null {
  const unNota = (item.unidade ?? "").trim();
  const bp = unidadeBase(unidadeProduto);
  if (!bp) {
    // Produto em embalagem (SC, GL...): só converte se a nota usa a mesma.
    return unNota && unidadeProduto && unNota.toLowerCase() === unidadeProduto.trim().toLowerCase() ? 1 : null;
  }
  const bn = unidadeBase(unNota);
  if (bn && bn !== "un") return converterUnidade(1, bn, bp);
  const conteudo = conteudoDaEmbalagem(item.descricao);
  if (conteudo) {
    const f = converterUnidade(conteudo.quantidade, conteudo.unidade, bp);
    if (f !== null) return f;
  }
  return bn === "un" && bp === "un" ? 1 : null;
}

/**
 * Unidade e fator para CRIAR o produto a partir do item: o produto nasce na
 * unidade de medida (L, KG...), não na embalagem — assim o galão de 5 L e a
 * bombona de 20 L somam no mesmo estoque.
 */
export function conversaoParaProdutoNovo(item: { descricao: string; unidade?: string | null }): { unidade: string | null; fator: number | null } {
  const unNota = (item.unidade ?? "").trim();
  const bn = unidadeBase(unNota);
  if (bn && bn !== "un") return { unidade: SIGLA_UNIDADE[bn], fator: 1 };
  const conteudo = conteudoDaEmbalagem(item.descricao);
  if (conteudo) return { unidade: SIGLA_UNIDADE[conteudo.unidade], fator: conteudo.quantidade };
  if (bn === "un") return { unidade: "UN", fator: 1 };
  return unNota ? { unidade: unNota.toUpperCase().slice(0, 10), fator: 1 } : { unidade: null, fator: null };
}

// ── Nome sugerido para produto novo ──────────────────────────────────────────

const EMB_RX = "(?:sacos?|scs?|bombonas?|bb|gal[aã]o|gal[oõ]es|gl|baldes?|bd|frascos?|fr|caixas?|cx|pacotes?|pct|big\\s*bag|bags?|tambor(?:es)?|tb)";
const QTD_RX = "\\d+(?:[.,]\\d+)?\\s*(?:kgs?|quilos?|g|grs?|l|lts?|litros?|ml|cc|t|tons?|toneladas?|un|und|unid|doses?|ds)\\b";
const RX_EMBALAGEM_QTD = new RegExp(`\\b${EMB_RX}\\.?\\s*(?:c\\s*\\/\\s*)?(?:\\d+\\s*x\\s*)?${QTD_RX}`, "gi");
const RX_QTD = new RegExp(`\\b(?:\\d+\\s*x\\s*)?${QTD_RX}`, "gi");
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "em"]);

function palavraTitulo(p: string, i: number): string {
  const baixa = p.toLowerCase();
  if (i > 0 && MINUSCULAS.has(baixa)) return baixa;
  if (/\d/.test(p) || p.length <= 2) return p.toUpperCase(); // S10, 15W40, DI, WG, N
  return baixa.charAt(0).toUpperCase() + baixa.slice(1);
}

/**
 * Nome curto para o produto da fazenda, a partir do texto da nota: sem
 * embalagem nem quantidade, e sem CAIXA ALTA gritada.
 *   "ROUNDUP ORIGINAL DI 20L"     → "Roundup Original DI"
 *   "SAL MINERAL BOVINOS SC 30KG" → "Sal Mineral Bovinos"
 */
export function nomeSugerido(descricao: string | null | undefined): string {
  const original = (descricao ?? "").replace(/\s+/g, " ").trim();
  if (!original) return "";
  let s = original.replace(RX_EMBALAGEM_QTD, " ").replace(RX_QTD, " ");
  s = s.replace(/\s+/g, " ").replace(/[\s\-–,;/]+$/g, "").trim();
  if (s.length < 2) s = original;
  const caixaAlta = s === s.toUpperCase() && /[A-ZÀ-Ý]/.test(s);
  s = caixaAlta ? s.split(" ").map(palavraTitulo).join(" ") : s.charAt(0).toUpperCase() + s.slice(1);
  return s.slice(0, 120).trim();
}

// ── Categoria pelo NCM ───────────────────────────────────────────────────────
//
// Classificação (regra da casa):
//  FATO     = descrição da Nomenclatura (SH/NCM, Tarifa Externa Comum). Fonte
//             pública, anotada de memória técnica nesta implementação —
//             verificado_em: PENDENTE (conferir na TEC vigente antes de usar
//             para qualquer coisa além de sugestão).
//  PREMISSA = inferência do uso numa fazenda. Sensibilidade baixa: só muda a
//             categoria SUGERIDA ao criar produto; o produtor troca no clique.
//
// Desvios conscientes do pedido original ("1201/1005 semente", "8433 peça"):
// o SH separa semente (1201.10, 1005.10) de grão (…90), e partes (8433.90) de
// máquina inteira. Grão comprado e colheitadeira não são semente nem peça.

export type BaseClassificacao = "FATO" | "PREMISSA";
export type CategoriaSugerida = { categoria: CategoriaProduto; base: BaseClassificacao; motivo: string };

/** Primeiro prefixo que casar vence — os mais específicos vêm antes. */
const REGRAS_NCM: Array<{ prefixo: string } & CategoriaSugerida> = [
  { prefixo: "27101921", categoria: "diesel", base: "FATO", motivo: "NCM 2710.19.21 é gasóleo (óleo diesel)." },
  { prefixo: "271020", categoria: "diesel", base: "PREMISSA", motivo: "2710.20 são óleos com biodiesel; na fazenda, quase sempre o diesel B." },
  { prefixo: "31", categoria: "fertilizante", base: "FATO", motivo: "Capítulo 31 do SH: adubos (fertilizantes)." },
  { prefixo: "380894", categoria: "outro", base: "PREMISSA", motivo: "3808.94 são desinfetantes: higiene, não defensivo de lavoura." },
  { prefixo: "3808", categoria: "defensivo", base: "FATO", motivo: "Posição 38.08: inseticidas, fungicidas, herbicidas e afins." },
  { prefixo: "120110", categoria: "semente", base: "FATO", motivo: "1201.10 é soja para semeadura." },
  { prefixo: "120190", categoria: "outro", base: "PREMISSA", motivo: "1201.90 é soja em grão, não semente." },
  { prefixo: "1201", categoria: "semente", base: "PREMISSA", motivo: "Soja comprada pela fazenda: supõe-se semente." },
  { prefixo: "100510", categoria: "semente", base: "FATO", motivo: "1005.10 é milho para semeadura." },
  { prefixo: "100590", categoria: "racao", base: "PREMISSA", motivo: "1005.90 é milho em grão; comprado pela fazenda, costuma ir para o trato." },
  { prefixo: "1005", categoria: "semente", base: "PREMISSA", motivo: "Milho comprado pela fazenda: supõe-se semente." },
  { prefixo: "2309", categoria: "racao", base: "FATO", motivo: "Posição 23.09: preparações para alimentação animal." },
  { prefixo: "2501", categoria: "suplemento", base: "PREMISSA", motivo: "Sal comum (25.01) comprado pela fazenda: supõe-se sal para o gado." },
  { prefixo: "3002", categoria: "vacina", base: "PREMISSA", motivo: "30.02 inclui as vacinas; na fazenda, vacina veterinária." },
  { prefixo: "3004", categoria: "medicamento", base: "FATO", motivo: "Posição 30.04: medicamentos em doses (na fazenda, de uso veterinário)." },
  { prefixo: "8708", categoria: "peca", base: "FATO", motivo: "Posição 87.08: partes e acessórios de tratores e veículos." },
  { prefixo: "843390", categoria: "peca", base: "FATO", motivo: "8433.90: partes de máquinas de colheita." },
  { prefixo: "843290", categoria: "peca", base: "FATO", motivo: "8432.90: partes de máquinas de preparo do solo e plantio." },
  { prefixo: "8433", categoria: "outro", base: "PREMISSA", motivo: "8433 fora das partes é máquina inteira: investimento, não peça." },
  { prefixo: "4011", categoria: "peca", base: "PREMISSA", motivo: "Pneu (40.11) de máquina ou veículo: tratado como peça de reposição." },
];

/** Nome de suplemento mineral/proteico (o NCM 23.09 não separa de ração). */
const RX_SUPLEMENTO = /\b(sal|mineral|minerais|suplemento|proteinado|nucleo)\b/;

/**
 * Categoria sugerida pelo NCM do item (e, só para 23.09, pelo nome), com a
 * base da regra. null quando não há regra — a tela cai em "outro".
 * FATO: item de serviço na NF-e informa NCM "00" (Manual de Orientação do
 * Contribuinte da NF-e, campo NCM do grupo de produto).
 */
export function categoriaPorNcm(ncm: string | null | undefined, descricao?: string | null): CategoriaSugerida | null {
  const d = (ncm ?? "").replace(/\D/g, "");
  if (d === "00") return { categoria: "servico", base: "FATO", motivo: "NCM 00 é o código de item de serviço na NF-e." };
  if (d.length < 2) return null;
  const regra = REGRAS_NCM.find((r) => d.startsWith(r.prefixo));
  if (!regra) return null;
  if (regra.prefixo === "2309" && RX_SUPLEMENTO.test(normalizarTexto(descricao))) {
    return { categoria: "suplemento", base: "PREMISSA", motivo: "23.09 com nome de sal mineral ou suplemento: supõe-se suplemento, não ração." };
  }
  return { categoria: regra.categoria, base: regra.base, motivo: regra.motivo };
}

// ── Similaridade de nome ─────────────────────────────────────────────────────

/** Palavras que não identificam produto: ligação, embalagem, quantidade. */
const RUIDO = new Set(["de", "da", "do", "das", "dos", "com", "para", "e", "a", "o", "em", "por", "p", "c", "x", "big"]);
const QTD = /^\d+(?:\.\d+)?(?:ml|l|kg|g|t|m3|un|dose)?$/;
const MULT = /^\d+x\d/;

/** Núcleo do nome: tokens que identificam o produto (sem embalagem nem quantidade). */
export function nucleo(textoNormalizado: string): string[] {
  return textoNormalizado
    .split(" ")
    .filter((t) => t && !RUIDO.has(t) && !SIGLAS_EMBALAGEM.has(t) && !QTD.test(t) && !MULT.test(t));
}

type Perfil = { tokens: string[]; tri: Set<string>; palavras: Set<string>; codigos: Set<string> };

/** Trigramas no estilo do pg_trgm: cada palavra com dois espaços antes e um depois. */
function trigramas(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of tokens) {
    const w = t.replace(/[^a-z0-9]/g, "");
    if (!w) continue;
    const p = `  ${w} `;
    for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  }
  return out;
}

function perfil(textoNormalizado: string): Perfil {
  const tokens = nucleo(textoNormalizado);
  return {
    tokens,
    tri: trigramas(tokens),
    palavras: new Set(tokens.filter((t) => /^[a-z]{3,}$/.test(t))),
    codigos: new Set(tokens.filter((t) => /\d/.test(t))), // s10, 15w40, 46%, 20-0-20
  };
}

function intersecao(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function simPerfis(a: Perfil, b: Perfil): number {
  if (a.tokens.length === 0 || b.tokens.length === 0) return 0;
  const inter = intersecao(a.tri, b.tri);
  const uniao = a.tri.size + b.tri.size - inter;
  const jaccard = uniao > 0 ? inter / uniao : 0;
  // Contenção de palavras: "Glifosato" dentro de "GLIFOSATO NORTOX 480 SL".
  const menor = Math.min(a.palavras.size, b.palavras.size);
  const contencao = menor > 0 ? intersecao(a.palavras, b.palavras) / menor : 0;
  let s = Math.max(jaccard, 0.85 * contencao);
  // Os dois têm código (S10 × S500, 46% × 45%) e nenhum bate: produtos irmãos, não o mesmo.
  if (a.codigos.size > 0 && b.codigos.size > 0 && intersecao(a.codigos, b.codigos) === 0) s *= 0.7;
  return Math.round(s * 100) / 100;
}

/** Similaridade de nome entre 0 e 1 (Jaccard de trigramas, com piso pela contenção de palavras). */
export function similaridade(a: string, b: string): number {
  return simPerfis(perfil(normalizarTexto(a)), perfil(normalizarTexto(b)));
}

// ── Casamento ────────────────────────────────────────────────────────────────

/** Produto do catálogo (`products`). `categoria` é o texto cru de products.category. */
export type ProdutoCanonico = {
  id: string;
  nome: string;
  unidade?: string | null;
  categoria?: string | null;
  ncm: string | null;
};

/** Apelido gravado. `texto` é o texto JÁ normalizado (coluna texto_normalizado). */
export type Apelido = {
  id?: string | null;
  produtoId: string;
  texto: string;
  fornecedorDoc: string | null;
  ncm: string | null;
  gtin: string | null;
};

export type ItemNota = {
  descricao: string;
  ncm?: string | null;
  gtin?: string | null;
  fornecedorDoc?: string | null;
};

export type Confianca = "alta" | "media" | "baixa";
export type ViaSugestao = "gtin" | "mesmo_nome" | "ncm_nome" | "ncm" | "nome";

export type Sugestao = {
  produtoId: string;
  nome: string;
  confianca: Confianca;
  via: ViaSugestao;
  similaridade: number;
  pontos: number;
};

export type Resolucao =
  | { ligado: true; produtoId: string; apelidoId: string | null }
  | { ligado: false; sugestoes: Sugestao[] };

type Candidato = {
  produto: ProdutoCanonico;
  perfis: Perfil[];
  textos: Set<string>;
  ncms: Set<string>;
  gtins: Set<string>;
};

export type IndiceDePara = {
  porChave: Map<string, Apelido>;
  candidatos: Candidato[];
  produtosPorNcm: Map<string, number>;
};

/** Chave do apelido: texto normalizado + documento do fornecedor (sem fornecedor = vazio). */
export function chaveApelido(textoNormalizado: string, fornecedorDoc: string | null | undefined): string {
  return `${textoNormalizado}\u0001${fornecedorDoc ?? ""}`;
}

/** Monta o índice uma vez por tela; vale para todos os itens. */
export function indexar(produtos: ProdutoCanonico[], apelidos: Apelido[]): IndiceDePara {
  const ids = new Set(produtos.map((p) => p.id));
  const porChave = new Map<string, Apelido>();
  const porProduto = new Map<string, Apelido[]>();
  for (const a of apelidos) {
    if (!ids.has(a.produtoId) || !a.texto) continue; // apelido de produto inativo/ausente não liga nada
    porChave.set(chaveApelido(a.texto, a.fornecedorDoc), a);
    const lista = porProduto.get(a.produtoId);
    if (lista) lista.push(a);
    else porProduto.set(a.produtoId, [a]);
  }

  const produtosPorNcm = new Map<string, number>();
  const candidatos = produtos.map<Candidato>((p) => {
    const lista = porProduto.get(p.id) ?? [];
    const nomeNorm = normalizarTexto(p.nome);
    const textos = new Set([nomeNorm, ...lista.map((a) => a.texto)].filter(Boolean));
    const ncms = new Set(
      [normalizarNcm(p.ncm), ...lista.map((a) => normalizarNcm(a.ncm))].filter((n): n is string => !!n),
    );
    for (const n of ncms) produtosPorNcm.set(n, (produtosPorNcm.get(n) ?? 0) + 1);
    return {
      produto: p,
      perfis: [...textos].map(perfil),
      textos,
      ncms,
      gtins: new Set(lista.map((a) => gtinValido(a.gtin)).filter((g): g is string => !!g)),
    };
  });

  return { porChave, candidatos, produtosPorNcm };
}

/** Abaixo disso, nome parecido sozinho não vira sugestão. */
const SIM_NOME_MIN = 0.45;

function compatNcm(ncm: string | null, ncms: Set<string>): "igual" | "parcial" | "conflito" | "desconhecido" {
  if (!ncm || ncms.size === 0) return "desconhecido";
  if (ncms.has(ncm)) return "igual";
  for (const n of ncms) if (n.slice(0, 4) === ncm.slice(0, 4)) return "parcial";
  return "conflito";
}

const arred = (v: number) => Math.round(v * 10) / 10;

/**
 * Liga o item a um produto, ou sugere até 3 com confiança.
 *
 * Ordem de força: código de barras > mesmo nome (outro fornecedor) > NCM +
 * nome parecido > só NCM > só nome. NCM de posição diferente (4 primeiros
 * dígitos) bloqueia a sugestão só por nome — "OLEO" lubrificante não é diesel.
 */
export function resolverItem(item: ItemNota, indice: IndiceDePara): Resolucao {
  const texto = normalizarTexto(item.descricao);
  if (!texto) return { ligado: false, sugestoes: [] };
  const doc = normalizarDoc(item.fornecedorDoc);

  const ap = indice.porChave.get(chaveApelido(texto, doc));
  if (ap) return { ligado: true, produtoId: ap.produtoId, apelidoId: ap.id ?? null };

  const ncm = normalizarNcm(item.ncm);
  const gtin = gtinValido(item.gtin);
  const p = perfil(texto);
  const sugestoes: Sugestao[] = [];

  for (const c of indice.candidatos) {
    const base = { produtoId: c.produto.id, nome: c.produto.nome };
    const opcoes: Sugestao[] = [];
    if (gtin && c.gtins.has(gtin)) {
      opcoes.push({ ...base, via: "gtin", confianca: "alta", similaridade: 1, pontos: 100 });
    }
    if (c.textos.has(texto)) {
      opcoes.push({ ...base, via: "mesmo_nome", confianca: "alta", similaridade: 1, pontos: 90 });
    }
    const sim = c.perfis.reduce((m, q) => Math.max(m, simPerfis(p, q)), 0);
    if (ncm && c.ncms.has(ncm)) {
      if (sim >= 0.3) {
        opcoes.push({ ...base, via: "ncm_nome", confianca: sim >= 0.7 ? "alta" : "media", similaridade: sim, pontos: arred(60 + 30 * sim) });
      } else {
        const unico = (indice.produtosPorNcm.get(ncm) ?? 0) === 1;
        opcoes.push({ ...base, via: "ncm", confianca: unico ? "media" : "baixa", similaridade: sim, pontos: arred(40 + 30 * sim) });
      }
    } else if (sim >= SIM_NOME_MIN) {
      const compat = compatNcm(ncm, c.ncms);
      if (compat !== "conflito") {
        const confianca: Confianca = compat === "parcial" ? "baixa" : sim >= 0.8 ? "media" : "baixa";
        opcoes.push({ ...base, via: "nome", confianca, similaridade: sim, pontos: arred(20 + 40 * sim) });
      }
    }
    if (opcoes.length > 0) sugestoes.push(opcoes.reduce((a, b) => (b.pontos > a.pontos ? b : a)));
  }

  sugestoes.sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, "pt-BR"));
  return { ligado: false, sugestoes: sugestoes.slice(0, 3) };
}

// ── Itens das notas: o que já liga e o que falta ligar ───────────────────────

export type ItemDeNota = ItemNota & {
  unidade?: string | null;
  preco?: number | null;
  /** yyyy-mm-dd */
  data?: string | null;
  fornecedorNome?: string | null;
  notaId?: string | null;
};

export type GrupoPendente = {
  chave: string;
  texto: string;
  /** Texto como veio na nota mais recente do grupo. */
  descricao: string;
  fornecedorDoc: string | null;
  fornecedorNome: string | null;
  ncm: string | null;
  gtin: string | null;
  unidade: string | null;
  ultimoPreco: number | null;
  ultimaData: string | null;
  ocorrencias: number;
  notaIds: string[];
  sugestoes: Sugestao[];
};

export type Separacao = {
  pendentes: GrupoPendente[];
  /** Itens que já entraram ligados (apelido confirmado). */
  ligados: number;
  /** Itens com descrição lida. */
  analisados: number;
  /** Itens ligados por produto. */
  porProduto: Map<string, number>;
};

/**
 * Separa os itens das notas em ligados e pendentes. Pendentes são agrupados
 * por texto normalizado + fornecedor: uma confirmação liga todas as
 * ocorrências, e as próximas notas entram ligadas sozinhas.
 */
export function separarItens(itens: ItemDeNota[], indice: IndiceDePara): Separacao {
  type Acumulado = {
    texto: string; doc: string | null; rep: ItemDeNota; ocorrencias: number;
    notaIds: Set<string>; ncm: string | null; gtin: string | null;
  };
  const grupos = new Map<string, Acumulado>();
  const porProduto = new Map<string, number>();
  let ligados = 0;
  let analisados = 0;

  for (const it of itens) {
    const texto = normalizarTexto(it.descricao);
    if (!texto) continue;
    analisados++;
    const doc = normalizarDoc(it.fornecedorDoc);
    const chave = chaveApelido(texto, doc);
    const ap = indice.porChave.get(chave);
    if (ap) {
      ligados++;
      porProduto.set(ap.produtoId, (porProduto.get(ap.produtoId) ?? 0) + 1);
      continue;
    }
    let g = grupos.get(chave);
    if (!g) {
      g = { texto, doc, rep: it, ocorrencias: 0, notaIds: new Set(), ncm: null, gtin: null };
      grupos.set(chave, g);
    }
    g.ocorrencias++;
    if (it.notaId) g.notaIds.add(it.notaId);
    if ((it.data ?? "") > (g.rep.data ?? "")) g.rep = it; // a nota mais recente representa o grupo
    if (!g.ncm) g.ncm = normalizarNcm(it.ncm);
    if (!g.gtin) g.gtin = gtinValido(it.gtin);
  }

  const pendentes: GrupoPendente[] = [];
  for (const [chave, g] of grupos) {
    const r = resolverItem({ descricao: g.rep.descricao, ncm: g.ncm, gtin: g.gtin, fornecedorDoc: g.doc }, indice);
    pendentes.push({
      chave,
      texto: g.texto,
      descricao: g.rep.descricao.replace(/\s+/g, " ").trim(),
      fornecedorDoc: g.doc,
      fornecedorNome: g.rep.fornecedorNome ?? null,
      ncm: g.ncm,
      gtin: g.gtin,
      unidade: g.rep.unidade ?? null,
      ultimoPreco: g.rep.preco ?? null,
      ultimaData: g.rep.data ?? null,
      ocorrencias: g.ocorrencias,
      notaIds: [...g.notaIds],
      sugestoes: r.ligado ? [] : r.sugestoes,
    });
  }

  pendentes.sort((a, b) =>
    b.ocorrencias - a.ocorrencias
    || (b.ultimaData ?? "").localeCompare(a.ultimaData ?? "")
    || a.descricao.localeCompare(b.descricao, "pt-BR"));

  return { pendentes, ligados, analisados, porProduto };
}
