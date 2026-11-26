/**
 * Estoque gerencial do Agraas Gestão (Onda 1) — regras puras, sem banco.
 *
 * Onde o app e o banco precisam concordar, este módulo ESPELHA a migration
 * 181 (custo médio, baixa proporcional, nome genérico de categoria,
 * taxonomia sugerida) e o teste confere os dois lados.
 * Testes: __tests__/gestao-estoque.test.ts.
 */

import { categoriaPorNcm, normalizarNcm, type CategoriaProduto } from "@/lib/gestao/de-para";
import { itemEhDiesel } from "@/lib/gestao/diesel";

const arred6 = (v: number) => Math.round(v * 1e6) / 1e6;
const trunc6 = (v: number) => Math.trunc(v * 1e6) / 1e6;
const finito = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ── Categoria gerencial ──────────────────────────────────────────────────────

/**
 * "Outros" e variações não são categoria (especificação, Transversal). Os
 * mesmos padrões estão em categoria_nome_generico() da migration 181.
 */
export const PADROES_CATEGORIA_GENERICA = [
  "^(outr[oa]s?|divers[oa]s?|demais)( |$)",
  "^(geral|gerais|variad[oa]s|vari[oa]s|miscelanea|sem categoria|a classificar|nao classificad[oa]s?|indefinid[oa]s?)$",
  "^(gastos?|despesas?|custos?|receitas?|itens?|materia(l|is)|produtos?|compras?|servicos?) (divers[oa]s?|gera(l|is)|outr[oa]s?|variad[oa]s|vari[oa]s)$",
] as const;
const RX_GENERICA = PADROES_CATEGORIA_GENERICA.map((p) => new RegExp(p));

/** Minúsculo, sem acento, só letras/dígitos separados por um espaço. */
export function normalizarNomeCategoria(nome: string | null | undefined): string {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nomeCategoriaGenerico(nome: string | null | undefined): boolean {
  const n = normalizarNomeCategoria(nome);
  return RX_GENERICA.some((rx) => rx.test(n));
}

/** Mensagem de erro para o formulário, ou null se o nome serve. */
export function validarNomeCategoria(nome: string | null | undefined, campo: "nome" | "grupo" = "nome"): string | null {
  const s = (nome ?? "").replace(/\s+/g, " ").trim();
  const rotulo = campo === "grupo" ? "O grupo" : "O nome";
  if (s.length < 2) return `${rotulo} precisa de pelo menos 2 letras.`;
  if (s.length > 60) return `${rotulo} pode ter no máximo 60 caracteres.`;
  if (nomeCategoriaGenerico(s)) {
    return `"${s}" não diz para onde vai o dinheiro. Use um nome que o contador e você reconheçam, como "Peças" ou "Defensivos".`;
  }
  return null;
}

export type TipoCategoria = "despesa" | "receita" | "investimento" | "financeiro";
export const TIPOS_CATEGORIA: TipoCategoria[] = ["despesa", "receita", "investimento", "financeiro"];
export const TIPO_CATEGORIA_NOME: Record<TipoCategoria, string> = {
  despesa: "Despesa",
  receita: "Receita",
  investimento: "Investimento",
  financeiro: "Financeiro",
};

export type CategoriaDaTaxonomia = { grupo: string; nome: string; tipo: TipoCategoria; ordem: number; conta: string | null };

/**
 * Taxonomia sugerida (especificação). Igual à lista de
 * semear_categorias_gerenciais() na migration 181 — o teste compara.
 * `conta`: código do plano rural (145), só onde o nome casa sem dúvida
 * (PREMISSA de vínculo; o contador confirma).
 */
export const TAXONOMIA_SUGERIDA: CategoriaDaTaxonomia[] = [
  { grupo: "Insumos agrícolas", nome: "Adubos e fertilizantes", tipo: "despesa", ordem: 110, conta: null },
  { grupo: "Insumos agrícolas", nome: "Corretivos de solo", tipo: "despesa", ordem: 120, conta: null },
  { grupo: "Insumos agrícolas", nome: "Defensivos", tipo: "despesa", ordem: 130, conta: null },
  { grupo: "Insumos agrícolas", nome: "Sementes e mudas", tipo: "despesa", ordem: 140, conta: null },
  { grupo: "Insumos pecuários", nome: "Sal mineral e suplementos", tipo: "despesa", ordem: 210, conta: null },
  { grupo: "Insumos pecuários", nome: "Rações e concentrados", tipo: "despesa", ordem: 220, conta: null },
  { grupo: "Insumos pecuários", nome: "Vacinas e medicamentos", tipo: "despesa", ordem: 230, conta: "5.2.01" },
  { grupo: "Insumos pecuários", nome: "Reprodução (sêmen, IATF)", tipo: "despesa", ordem: 240, conta: "5.2.04" },
  { grupo: "Insumos pecuários", nome: "Compra de animais", tipo: "despesa", ordem: 250, conta: "5.6" },
  { grupo: "Combustíveis e lubrificantes", nome: "Diesel", tipo: "despesa", ordem: 310, conta: "5.5.02" },
  { grupo: "Combustíveis e lubrificantes", nome: "Gasolina e etanol", tipo: "despesa", ordem: 320, conta: "5.5.02" },
  { grupo: "Combustíveis e lubrificantes", nome: "Óleos e graxas", tipo: "despesa", ordem: 330, conta: "5.5.02" },
  { grupo: "Combustíveis e lubrificantes", nome: "ARLA 32", tipo: "despesa", ordem: 340, conta: "5.5.02" },
  { grupo: "Máquinas e frota", nome: "Peças", tipo: "despesa", ordem: 410, conta: null },
  { grupo: "Máquinas e frota", nome: "Pneus e câmaras", tipo: "despesa", ordem: 420, conta: null },
  { grupo: "Máquinas e frota", nome: "Serviços de manutenção", tipo: "despesa", ordem: 430, conta: null },
  { grupo: "Máquinas e frota", nome: "Filtros", tipo: "despesa", ordem: 440, conta: null },
  { grupo: "Mão de obra", nome: "Salários e encargos", tipo: "despesa", ordem: 510, conta: null },
  { grupo: "Mão de obra", nome: "Diaristas e empreitas", tipo: "despesa", ordem: 520, conta: null },
  { grupo: "Mão de obra", nome: "Prestadores de serviço", tipo: "despesa", ordem: 530, conta: null },
  { grupo: "Estrutura", nome: "Cercas e currais", tipo: "despesa", ordem: 610, conta: "5.5.03" },
  { grupo: "Estrutura", nome: "Construções e reformas", tipo: "despesa", ordem: 620, conta: null },
  { grupo: "Estrutura", nome: "Energia elétrica", tipo: "despesa", ordem: 630, conta: "5.5.01" },
  { grupo: "Estrutura", nome: "Água e irrigação", tipo: "despesa", ordem: 640, conta: null },
  { grupo: "Administrativo", nome: "Contabilidade e jurídico", tipo: "despesa", ordem: 710, conta: "6.1.02" },
  { grupo: "Administrativo", nome: "Telefone e internet", tipo: "despesa", ordem: 720, conta: "6.1.04" },
  { grupo: "Administrativo", nome: "Software", tipo: "despesa", ordem: 730, conta: "6.4.02" },
  { grupo: "Administrativo", nome: "Material de escritório", tipo: "despesa", ordem: 740, conta: "6.1.03" },
  { grupo: "Administrativo", nome: "Impostos e taxas", tipo: "despesa", ordem: 750, conta: null },
  { grupo: "Administrativo", nome: "Seguros", tipo: "despesa", ordem: 760, conta: "6.1.05" },
  { grupo: "Financeiro", nome: "Juros", tipo: "financeiro", ordem: 810, conta: "6.3.01" },
  { grupo: "Financeiro", nome: "Tarifas bancárias", tipo: "financeiro", ordem: 820, conta: "6.3.02" },
  { grupo: "Investimentos", nome: "Máquinas e equipamentos", tipo: "investimento", ordem: 910, conta: "1.2.02.03" },
  { grupo: "Investimentos", nome: "Terras e benfeitorias", tipo: "investimento", ordem: 920, conta: null },
  { grupo: "Receitas", nome: "Venda de gado", tipo: "receita", ordem: 1010, conta: null },
  { grupo: "Receitas", nome: "Venda de grãos", tipo: "receita", ordem: 1020, conta: null },
  { grupo: "Receitas", nome: "Venda de leite", tipo: "receita", ordem: 1030, conta: null },
  { grupo: "Receitas", nome: "Arrendamentos recebidos", tipo: "receita", ordem: 1040, conta: null },
  { grupo: "Receitas", nome: "Serviços prestados", tipo: "receita", ordem: 1050, conta: null },
];

/** Categorias da taxonomia que o cliente ainda não tem (por nome, sem caixa nem acento). */
export function categoriasFaltando(nomesExistentes: string[]): CategoriaDaTaxonomia[] {
  const tem = new Set(nomesExistentes.map(normalizarNomeCategoria));
  return TAXONOMIA_SUGERIDA.filter((c) => !tem.has(normalizarNomeCategoria(c.nome)));
}

// ── Categoria sugerida para o produto (NCM e histórico) ─────────────────────
//
// Classificação (regra da casa), no mesmo critério de lib/gestao/de-para.ts:
//  FATO     = descrição da posição no SH/NCM, anotada de memória técnica —
//             verificado_em: PENDENTE (conferir na TEC antes de usar para
//             qualquer coisa além de SUGESTÃO).
//  PREMISSA = inferência do uso na fazenda. Sensibilidade baixa: só pré-
//             seleciona a categoria; o produtor troca no clique.
// As regras daqui vêm ANTES das de de-para porque separam o que lá é uma
// categoria só (pneu × peça, lubrificante × diesel, corretivo × adubo).

type RegraCategoria = { prefixo: string; nome: string; base: "FATO" | "PREMISSA"; motivo: string; descricao?: RegExp };

const REGRAS_NCM_CATEGORIA: RegraCategoria[] = [
  { prefixo: "27101921", nome: "Diesel", base: "FATO", motivo: "NCM 2710.19.21 é óleo diesel." },
  { prefixo: "271020", nome: "Diesel", base: "PREMISSA", motivo: "2710.20 é óleo com biodiesel; na fazenda, o diesel B." },
  { prefixo: "271012", nome: "Gasolina e etanol", base: "FATO", motivo: "2710.12 são os óleos leves (gasolinas)." },
  { prefixo: "2207", nome: "Gasolina e etanol", base: "FATO", motivo: "22.07 é álcool etílico (etanol)." },
  { prefixo: "271019", nome: "Óleos e graxas", base: "PREMISSA", motivo: "2710.19 fora o diesel: óleos lubrificantes." },
  { prefixo: "3403", nome: "Óleos e graxas", base: "FATO", motivo: "34.03: preparações lubrificantes." },
  { prefixo: "310210", nome: "ARLA 32", base: "PREMISSA", motivo: "Ureia com nome de ARLA: agente redutor do motor, não adubo.", descricao: /\barla\b/ },
  { prefixo: "2521", nome: "Corretivos de solo", base: "PREMISSA", motivo: "25.21 é calcário; na fazenda, corretivo de solo." },
  { prefixo: "2522", nome: "Corretivos de solo", base: "PREMISSA", motivo: "25.22 é cal; na fazenda, corretivo de solo." },
  { prefixo: "1209", nome: "Sementes e mudas", base: "FATO", motivo: "12.09: sementes para semeadura." },
  { prefixo: "0602", nome: "Sementes e mudas", base: "PREMISSA", motivo: "06.02: mudas e plantas vivas." },
  { prefixo: "051110", nome: "Reprodução (sêmen, IATF)", base: "FATO", motivo: "0511.10 é sêmen bovino." },
  { prefixo: "0102", nome: "Compra de animais", base: "FATO", motivo: "01.02: bovinos vivos." },
  { prefixo: "4011", nome: "Pneus e câmaras", base: "FATO", motivo: "40.11: pneus novos de borracha." },
  { prefixo: "4013", nome: "Pneus e câmaras", base: "FATO", motivo: "40.13: câmaras de ar." },
  { prefixo: "842123", nome: "Filtros", base: "FATO", motivo: "8421.23: filtros de óleo e combustível de motor." },
  { prefixo: "842131", nome: "Filtros", base: "FATO", motivo: "8421.31: filtros de ar de motor." },
  { prefixo: "8482", nome: "Peças", base: "PREMISSA", motivo: "84.82 são rolamentos: peça de reposição." },
  { prefixo: "8483", nome: "Peças", base: "PREMISSA", motivo: "84.83 são eixos e transmissões: peça de reposição." },
  { prefixo: "7313", nome: "Cercas e currais", base: "PREMISSA", motivo: "73.13 é arame farpado." },
  { prefixo: "7314", nome: "Cercas e currais", base: "PREMISSA", motivo: "73.14 são telas de arame." },
  { prefixo: "7217", nome: "Cercas e currais", base: "PREMISSA", motivo: "72.17 é fio de arame liso." },
];

/** Categoria do catálogo de produtos (de-para) → categoria gerencial. */
const POR_CATEGORIA_PRODUTO: Partial<Record<CategoriaProduto, string>> = {
  diesel: "Diesel",
  fertilizante: "Adubos e fertilizantes",
  defensivo: "Defensivos",
  semente: "Sementes e mudas",
  racao: "Rações e concentrados",
  suplemento: "Sal mineral e suplementos",
  vacina: "Vacinas e medicamentos",
  medicamento: "Vacinas e medicamentos",
  vermifugo: "Vacinas e medicamentos",
  antiparasitario: "Vacinas e medicamentos",
  antibiotico: "Vacinas e medicamentos",
  peca: "Peças",
};

export type SugestaoCategoria = { nome: string; base: "historico" | "FATO" | "PREMISSA"; motivo: string };

/** Produto do cliente com NCM e categoria já definida (o histórico). */
export type HistoricoCategoria = { ncm: string | null; categoriaNome: string };

function maisFrequente(nomes: string[]): string | null {
  const conta = new Map<string, number>();
  for (const n of nomes) conta.set(n, (conta.get(n) ?? 0) + 1);
  let melhor: string | null = null;
  let max = 0;
  for (const [n, c] of conta) if (c > max || (c === max && melhor !== null && n.localeCompare(melhor, "pt-BR") < 0)) { melhor = n; max = c; }
  return melhor;
}

/**
 * Categoria gerencial sugerida para um item de nota (ou produto novo):
 * 1. histórico do cliente — produtos com o MESMO NCM, depois a mesma posição
 *    (4 dígitos); vence a categoria mais usada;
 * 2. regra pelo NCM (tabela acima, depois a de de-para).
 * null quando não há base: a tela pede a escolha.
 */
export function categoriaGerencialSugerida(
  item: { ncm?: string | null; descricao?: string | null },
  historico: HistoricoCategoria[] = [],
): SugestaoCategoria | null {
  const ncm = normalizarNcm(item.ncm);
  if (ncm) {
    const mesmo = historico.filter((h) => normalizarNcm(h.ncm) === ncm).map((h) => h.categoriaNome);
    const a = maisFrequente(mesmo);
    if (a) return { nome: a, base: "historico", motivo: "Outros produtos seus com o mesmo NCM estão nesta categoria." };
    const posicao = historico.filter((h) => normalizarNcm(h.ncm)?.slice(0, 4) === ncm.slice(0, 4)).map((h) => h.categoriaNome);
    const b = maisFrequente(posicao);
    if (b) return { nome: b, base: "historico", motivo: "Produtos seus de NCM parecido estão nesta categoria." };

    const desc = normalizarNomeCategoria(item.descricao);
    const regra = REGRAS_NCM_CATEGORIA.find((r) => ncm.startsWith(r.prefixo) && (!r.descricao || r.descricao.test(desc)));
    if (regra) return { nome: regra.nome, base: regra.base, motivo: regra.motivo };
  }
  const dp = categoriaPorNcm(item.ncm, item.descricao);
  const nome = dp ? POR_CATEGORIA_PRODUTO[dp.categoria] : undefined;
  return dp && nome ? { nome, base: dp.base, motivo: dp.motivo } : null;
}

/** Acha a categoria do cliente pelo nome sugerido (sem caixa nem acento). */
export function idDaCategoria<T extends { id: string; nome: string; ativo?: boolean }>(
  categorias: T[], nome: string | null | undefined,
): string | null {
  if (!nome) return null;
  const alvo = normalizarNomeCategoria(nome);
  return categorias.find((c) => c.ativo !== false && normalizarNomeCategoria(c.nome) === alvo)?.id ?? null;
}

// ── Custo médio e baixa proporcional (espelho do SQL) ───────────────────────

export type LoteCusto = { id: string; quantidade: number; custoUnit: number | null };

/** Custo médio ponderado dos lotes com saldo e custo; null sem nenhum. */
export function custoMedioPonderado(lotes: LoteCusto[]): number | null {
  let valor = 0;
  let qtd = 0;
  for (const l of lotes) {
    if (!finito(l.quantidade) || l.quantidade <= 0 || !finito(l.custoUnit)) continue;
    valor += l.quantidade * l.custoUnit;
    qtd += l.quantidade;
  }
  return qtd > 0 ? valor / qtd : null;
}

export type Rateio = { baixas: Array<{ id: string; quantidade: number }>; excesso: number };

/**
 * Baixa `quantidade` dos lotes com saldo, proporcional ao saldo de cada um
 * (o custo médio do que fica não muda). Mesmo algoritmo de
 * registrar_saida_estoque(): truncado em 6 casas, o maior lote leva o resto,
 * e um segundo passe zera qualquer sobra de arredondamento. `excesso` é o
 * que passou do saldo (só vira lote negativo se a saída for autorizada).
 */
export function ratearSaida(lotes: Array<{ id: string; quantidade: number }>, quantidade: number): Rateio {
  const comSaldo = lotes.filter((l) => finito(l.quantidade) && l.quantidade > 0);
  const total = comSaldo.reduce((s, l) => s + l.quantidade, 0);
  const q = arred6(Math.max(0, quantidade));
  const tirar = Math.min(q, total);
  const excesso = arred6(q - tirar);
  if (tirar <= 0) return { baixas: [], excesso };
  if (tirar >= total) return { baixas: comSaldo.map((l) => ({ id: l.id, quantidade: l.quantidade })), excesso };

  const ordem = [...comSaldo].sort((a, b) => a.quantidade - b.quantidade || a.id.localeCompare(b.id));
  const restante = new Map(ordem.map((l) => [l.id, l.quantidade]));
  const baixa = new Map<string, number>();
  let resto = tirar;
  ordem.forEach((l, i) => {
    const parte = Math.min(i === ordem.length - 1 ? resto : trunc6((tirar * l.quantidade) / total), l.quantidade, resto);
    baixa.set(l.id, arred6((baixa.get(l.id) ?? 0) + parte));
    restante.set(l.id, l.quantidade - parte);
    resto = arred6(resto - parte);
  });
  if (resto > 0) {
    for (const l of [...ordem].sort((a, b) => (restante.get(b.id) ?? 0) - (restante.get(a.id) ?? 0) || a.id.localeCompare(b.id))) {
      const parte = Math.min(resto, restante.get(l.id) ?? 0);
      if (parte <= 0) continue;
      baixa.set(l.id, arred6((baixa.get(l.id) ?? 0) + parte));
      resto = arred6(resto - parte);
      if (resto <= 0) break;
    }
  }
  return { baixas: ordem.map((l) => ({ id: l.id, quantidade: baixa.get(l.id) ?? 0 })).filter((b) => b.quantidade > 0), excesso };
}

// ── Saldos ───────────────────────────────────────────────────────────────────

export type LoteSaldo = {
  productId: string;
  almoxarifadoId: string | null;
  quantidade: number;
  custoUnit: number | null;
};

export type SaldoProdutoAlmox = {
  productId: string;
  almoxarifadoId: string | null;
  saldo: number;
  /** Σ saldo × custo dos lotes com saldo positivo e custo conhecido. */
  valor: number;
  custoMedio: number | null;
  /** Algum lote com saldo não tem custo: o valor é um piso. */
  valorParcial: boolean;
  lotes: number;
};

/** Saldo por produto × almoxarifado (lote sem almoxarifado = null). */
export function saldosPorAlmoxarifado(lotes: LoteSaldo[]): SaldoProdutoAlmox[] {
  const mapa = new Map<string, { s: SaldoProdutoAlmox; custos: LoteCusto[] }>();
  for (const l of lotes) {
    if (!finito(l.quantidade) || l.quantidade === 0) continue;
    const chave = `${l.productId}|${l.almoxarifadoId ?? ""}`;
    let g = mapa.get(chave);
    if (!g) {
      g = { s: { productId: l.productId, almoxarifadoId: l.almoxarifadoId, saldo: 0, valor: 0, custoMedio: null, valorParcial: false, lotes: 0 }, custos: [] };
      mapa.set(chave, g);
    }
    g.s.saldo += l.quantidade;
    g.s.lotes += 1;
    if (l.quantidade > 0) {
      if (finito(l.custoUnit)) g.s.valor += l.quantidade * l.custoUnit;
      else g.s.valorParcial = true;
      g.custos.push({ id: chave, quantidade: l.quantidade, custoUnit: l.custoUnit });
    }
  }
  return [...mapa.values()].map(({ s, custos }) => ({
    ...s,
    saldo: arred6(s.saldo),
    valor: Math.round(s.valor * 100) / 100,
    custoMedio: custoMedioPonderado(custos),
  }));
}

/** Saldo total de cada produto (todos os almoxarifados). */
export function saldoPorProduto(saldos: SaldoProdutoAlmox[]): Map<string, { saldo: number; valor: number }> {
  const out = new Map<string, { saldo: number; valor: number }>();
  for (const s of saldos) {
    const a = out.get(s.productId) ?? { saldo: 0, valor: 0 };
    a.saldo = arred6(a.saldo + s.saldo);
    a.valor = Math.round((a.valor + s.valor) * 100) / 100;
    out.set(s.productId, a);
  }
  return out;
}

/** Valor em estoque por categoria (null = produto sem categoria). */
export function valorPorCategoria(
  saldos: SaldoProdutoAlmox[],
  categoriaDoProduto: Map<string, string | null>,
): Array<{ categoriaId: string | null; valor: number; produtos: number }> {
  const mapa = new Map<string, { categoriaId: string | null; valor: number; produtos: Set<string> }>();
  for (const s of saldos) {
    if (s.saldo <= 0) continue;
    const cat = categoriaDoProduto.get(s.productId) ?? null;
    const k = cat ?? "";
    const g = mapa.get(k) ?? { categoriaId: cat, valor: 0, produtos: new Set<string>() };
    g.valor += s.valor;
    g.produtos.add(s.productId);
    mapa.set(k, g);
  }
  return [...mapa.values()]
    .map((g) => ({ categoriaId: g.categoriaId, valor: Math.round(g.valor * 100) / 100, produtos: g.produtos.size }))
    .sort((a, b) => b.valor - a.valor);
}

// ── Mínimo e máximo ──────────────────────────────────────────────────────────

export type AlertaEstoque = "abaixo" | "acima" | null;

/** Abaixo do mínimo (saldo < mínimo) ou acima do máximo (saldo > máximo). Sem limite, sem alerta. */
export function alertaEstoque(saldo: number, minimo: number | null | undefined, maximo: number | null | undefined): AlertaEstoque {
  if (!finito(saldo)) return null;
  if (finito(minimo) && minimo > 0 && saldo < minimo) return "abaixo";
  if (finito(maximo) && maximo > 0 && saldo > maximo) return "acima";
  return null;
}

/** Quanto falta para chegar ao mínimo (0 se não falta). */
export function faltaParaMinimo(saldo: number, minimo: number | null | undefined): number {
  return finito(minimo) && saldo < minimo ? arred6(minimo - saldo) : 0;
}

// ── Conferência de tanque ────────────────────────────────────────────────────

/**
 * PREMISSA: diferença de até 1% do volume que entrou no tanque é medição
 * (dilatação térmica do diesel e leitura de régua), não perda. Sensibilidade:
 * só muda o selo "dentro da tolerância"; a diferença em litros aparece sempre.
 */
export const TOLERANCIA_TANQUE = 0.01;

export type SituacaoConferencia =
  | "sem_contagem" | "contagem_invalida" | "acima_da_capacidade" | "dentro_da_tolerancia" | "perda" | "sobra";

export type Conferencia = {
  /** Saldo esperado = entradas − saídas (o saldo dos lotes, quando informado). */
  esperado: number;
  contagem: number | null;
  /** contagem − esperado: negativo = falta (perda/desvio), positivo = sobra. */
  diferenca: number | null;
  /** Diferença sobre o volume que entrou (null sem entradas). */
  percentual: number | null;
  situacao: SituacaoConferencia;
};

export function conferenciaTanque(i: {
  entradas: number;
  saidas: number;
  saldoSistema?: number | null;
  contagem: number | null | undefined;
  capacidade?: number | null;
  tolerancia?: number;
}): Conferencia {
  const esperado = arred6(finito(i.saldoSistema) ? i.saldoSistema : (i.entradas || 0) - (i.saidas || 0));
  const tol = i.tolerancia ?? TOLERANCIA_TANQUE;
  if (i.contagem === null || i.contagem === undefined) return { esperado, contagem: null, diferenca: null, percentual: null, situacao: "sem_contagem" };
  if (!finito(i.contagem) || i.contagem < 0) return { esperado, contagem: null, diferenca: null, percentual: null, situacao: "contagem_invalida" };
  const diferenca = arred6(i.contagem - esperado);
  const percentual = i.entradas > 0 ? diferenca / i.entradas : null;
  const base = { esperado, contagem: i.contagem, diferenca, percentual };
  if (finito(i.capacidade) && i.capacidade > 0 && i.contagem > i.capacidade) return { ...base, situacao: "acima_da_capacidade" };
  const limite = i.entradas > 0 ? i.entradas * tol : 0;
  if (Math.abs(diferenca) <= limite || diferenca === 0) return { ...base, situacao: "dentro_da_tolerancia" };
  return { ...base, situacao: diferenca < 0 ? "perda" : "sobra" };
}

// ── Movimentos ───────────────────────────────────────────────────────────────

export type DestinoTipo = "entrada" | "abastecimento" | "manutencao" | "aplicacao" | "consumo" | "ajuste";
export const TIPOS_SAIDA: Exclude<DestinoTipo, "entrada">[] = ["abastecimento", "manutencao", "aplicacao", "consumo", "ajuste"];

export const DESTINO_NOME: Record<DestinoTipo, string> = {
  entrada: "Entrada",
  abastecimento: "Abastecimento",
  manutencao: "Manutenção",
  aplicacao: "Aplicação",
  consumo: "Consumo",
  ajuste: "Ajuste de inventário",
};

/** O que cada tipo de saída exige (mesmas regras de registrar_saida_estoque). */
export const EXIGE: Record<Exclude<DestinoTipo, "entrada">, { maquina: boolean; centro: boolean; motivo: boolean }> = {
  abastecimento: { maquina: true, centro: false, motivo: false },
  manutencao: { maquina: true, centro: false, motivo: false },
  aplicacao: { maquina: false, centro: true, motivo: false },
  consumo: { maquina: false, centro: true, motivo: false },
  ajuste: { maquina: false, centro: false, motivo: true },
};

export function ehTipoSaida(v: unknown): v is Exclude<DestinoTipo, "entrada"> {
  return typeof v === "string" && (TIPOS_SAIDA as string[]).includes(v);
}

/**
 * +1 entra, −1 sai. Movimento da 181 usa destino_tipo ('entrada' soma);
 * o anterior (controladoria, aplicação sanitária) usa movement_type.
 */
export function sinalDoMovimento(m: { destinoTipo?: string | null; movementType?: string | null }): 1 | -1 {
  if (m.destinoTipo) return m.destinoTipo === "entrada" ? 1 : -1;
  return m.movementType === "entry" ? 1 : -1;
}

/** Rótulo do movimento para a tela. */
export function rotuloMovimento(m: { destinoTipo?: string | null; movementType?: string | null; temNota?: boolean }): string {
  if (m.destinoTipo === "entrada") return m.movementType === "adjustment" ? "Entrada sem nota" : "Entrada de nota";
  if (m.destinoTipo && m.destinoTipo in DESTINO_NOME) return DESTINO_NOME[m.destinoTipo as DestinoTipo];
  switch (m.movementType) {
    case "entry": return "Entrada";
    case "application": return "Aplicação";
    case "adjustment": return "Ajuste";
    case "loss": return "Perda";
    default: return "Movimento";
  }
}

/** Entradas e saídas (em quantidade) de uma lista de movimentos. */
export function totaisDeMovimentos(movs: Array<{ quantidade: number; destinoTipo?: string | null; movementType?: string | null }>): { entradas: number; saidas: number } {
  let entradas = 0;
  let saidas = 0;
  for (const m of movs) {
    if (!finito(m.quantidade)) continue;
    if (sinalDoMovimento(m) > 0) entradas += m.quantidade;
    else saidas += m.quantidade;
  }
  return { entradas: arred6(entradas), saidas: arred6(saidas) };
}

// ── Diesel do tanque (abastecimento → saída) ────────────────────────────────

export type ProdutoDiesel = {
  id: string;
  nome: string;
  ncm: string | null;
  ativo: boolean;
  categoriaNome?: string | null;
  almoxarifadoPadraoId?: string | null;
};
export type Tanque = { id: string; tipo: string; ativo: boolean };

/** Produto é diesel? NCM 2710.19.21 / 2710.20 (diesel B), nome sem NCM, ou categoria "Diesel". */
export function produtoEhDiesel(p: { nome: string; ncm: string | null; categoriaNome?: string | null }): boolean {
  if (normalizarNomeCategoria(p.categoriaNome) === "diesel") return true;
  const d = (p.ncm ?? "").replace(/\D/g, "");
  if (d.startsWith("271020")) return true;
  return itemEhDiesel(p.ncm, p.nome);
}

/**
 * Qual produto e qual tanque um abastecimento consome. Candidatos: produto
 * diesel ativo × tanque de combustível ativo (o almoxarifado padrão do
 * produto, se for tanque; senão qualquer tanque). Vence o par com mais saldo;
 * sem saldo em nenhum, o par único ou o do almoxarifado padrão. null quando
 * não há diesel cadastrado ou tanque — o abastecimento grava como sempre.
 */
export function escolherDieselDoTanque(
  produtos: ProdutoDiesel[],
  tanques: Tanque[],
  saldo: (produtoId: string, almoxarifadoId: string) => number,
): { produtoId: string; almoxarifadoId: string } | null {
  const ativos = tanques.filter((t) => t.ativo && t.tipo === "combustivel");
  if (ativos.length === 0) return null;
  const ids = new Set(ativos.map((t) => t.id));
  const pares: Array<{ produtoId: string; almoxarifadoId: string; saldo: number; padrao: boolean; nome: string }> = [];
  for (const p of produtos) {
    if (!p.ativo || !produtoEhDiesel(p)) continue;
    const alvo = p.almoxarifadoPadraoId && ids.has(p.almoxarifadoPadraoId) ? [p.almoxarifadoPadraoId] : ativos.map((t) => t.id);
    for (const a of alvo) {
      pares.push({ produtoId: p.id, almoxarifadoId: a, saldo: saldo(p.id, a) || 0, padrao: a === p.almoxarifadoPadraoId, nome: p.nome });
    }
  }
  if (pares.length === 0) return null;
  pares.sort((x, y) =>
    (y.saldo > 0 ? 1 : 0) - (x.saldo > 0 ? 1 : 0)
    || y.saldo - x.saldo
    || Number(y.padrao) - Number(x.padrao)
    || x.nome.localeCompare(y.nome, "pt-BR")
    || x.almoxarifadoId.localeCompare(y.almoxarifadoId));
  return { produtoId: pares[0].produtoId, almoxarifadoId: pares[0].almoxarifadoId };
}

// ── Números digitados ────────────────────────────────────────────────────────

/** "1.234,5", "1234.5", "0,5" → número; vazio/inválido → null. */
export function lerQuantidade(texto: string | null | undefined): number | null {
  let s = String(texto ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? arred6(n) : null;
}
