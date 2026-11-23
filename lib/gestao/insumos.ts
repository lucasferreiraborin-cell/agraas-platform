/**
 * Insumos do Agraas Gestão — histórico de preço pago e resumo de estoque.
 * Funções puras (sem banco): testáveis e reutilizáveis nas telas.
 */

/** Uma linha de compra: item de uma nota de entrada. */
export type CompraItem = {
  descricao: string;
  unidade: string | null;
  /** Preço unitário pago. */
  preco: number;
  /** Data ISO (yyyy-mm-dd) da nota. */
  data: string | null;
  fornecedor: string | null;
  notaId: string | null;
};

/** Normaliza o nome do produto para agrupar variações de digitação. */
export function normalizarNome(descricao: string): string {
  return descricao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(\d)\s+([a-z])/g, "$1$2") // "20 l" == "20l"
    .trim();
}

export function chaveProduto(descricao: string, unidade: string | null): string {
  return `${normalizarNome(descricao)}|${(unidade ?? "").trim().toLowerCase()}`;
}

/** Variação percentual de `atual` sobre `anterior`; null se não der para comparar. */
export function variacaoPct(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

export type Sentido = "alta" | "queda" | "estavel";

/** Abaixo do limiar (em %) a variação é tratada como estável. */
export function sentidoDaVariacao(pct: number | null, limiar = 0.5): Sentido | null {
  if (pct === null) return null;
  if (pct > limiar) return "alta";
  if (pct < -limiar) return "queda";
  return "estavel";
}

/** Entrada ou saída pelo primeiro dígito do CFOP (1/2/3 entrada; 5/6/7 saída). */
export function direcaoPorCfop(cfop: string | null | undefined): "entrada" | "saida" | null {
  const d = (cfop ?? "").trim().charAt(0);
  if (d === "1" || d === "2" || d === "3") return "entrada";
  if (d === "5" || d === "6" || d === "7") return "saida";
  return null;
}

export type PontoPreco = { preco: number; data: string | null; fornecedor: string | null };

export type HistoricoPreco = {
  chave: string;
  descricao: string;
  unidade: string | null;
  ultimo: PontoPreco;
  anterior: PontoPreco | null;
  variacao: number | null;
  sentido: Sentido | null;
  menorPreco: number;
  compras: number;
};

/**
 * Agrupa compras por produto e calcula último preço, anterior e variação.
 * Ignora linhas sem preço positivo. O mais recente vem primeiro; empate de
 * data mantém a ordem de entrada.
 */
export function historicoDePrecos(compras: CompraItem[]): HistoricoPreco[] {
  const grupos = new Map<string, CompraItem[]>();
  for (const c of compras) {
    if (!c.descricao?.trim() || !Number.isFinite(c.preco) || c.preco <= 0) continue;
    const k = chaveProduto(c.descricao, c.unidade);
    const lista = grupos.get(k);
    if (lista) lista.push(c);
    else grupos.set(k, [c]);
  }

  const saida: HistoricoPreco[] = [];
  for (const [chave, lista] of grupos) {
    const ordenada = lista
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const da = a.c.data ?? "";
        const db = b.c.data ?? "";
        if (da !== db) return da < db ? 1 : -1;
        return a.i - b.i;
      })
      .map((x) => x.c);

    const ponto = (c: CompraItem): PontoPreco => ({ preco: c.preco, data: c.data, fornecedor: c.fornecedor });
    const [ult, ant] = ordenada;
    const variacao = ant ? variacaoPct(ult.preco, ant.preco) : null;
    saida.push({
      chave,
      descricao: ult.descricao.trim(),
      unidade: ult.unidade,
      ultimo: ponto(ult),
      anterior: ant ? ponto(ant) : null,
      variacao,
      sentido: sentidoDaVariacao(variacao),
      menorPreco: Math.min(...ordenada.map((c) => c.preco)),
      compras: ordenada.length,
    });
  }

  // Altas primeiro (maior para menor); depois o resto pela compra mais recente.
  return saida.sort((a, b) => {
    const altaA = a.sentido === "alta" ? 1 : 0;
    const altaB = b.sentido === "alta" ? 1 : 0;
    if (altaA !== altaB) return altaB - altaA;
    if (altaA && altaB) return (b.variacao ?? 0) - (a.variacao ?? 0);
    const da = a.ultimo.data ?? "";
    const db = b.ultimo.data ?? "";
    return da === db ? a.descricao.localeCompare(b.descricao, "pt-BR") : da < db ? 1 : -1;
  });
}

// ── Estoque ──────────────────────────────────────────────────────────────────

export type LoteEstoque = {
  productId: string | null;
  nome: string;
  unidade: string | null;
  quantidade: number;
  custoUnit: number | null;
  validade: string | null;
};

export type ProdutoEstoque = {
  chave: string;
  nome: string;
  unidade: string | null;
  saldo: number;
  lotes: number;
  valor: number;
  /** true quando algum lote não tem custo unitário — o valor é um piso. */
  valorParcial: boolean;
  proximaValidade: string | null;
};

/** Soma lotes por produto. Lotes zerados ou negativos ficam de fora. */
export function resumoEstoque(lotes: LoteEstoque[]): ProdutoEstoque[] {
  const mapa = new Map<string, ProdutoEstoque>();
  for (const l of lotes) {
    if (!Number.isFinite(l.quantidade) || l.quantidade <= 0) continue;
    const chave = l.productId ?? `sem:${normalizarNome(l.nome)}`;
    let p = mapa.get(chave);
    if (!p) {
      p = { chave, nome: l.nome, unidade: l.unidade, saldo: 0, lotes: 0, valor: 0, valorParcial: false, proximaValidade: null };
      mapa.set(chave, p);
    }
    p.saldo += l.quantidade;
    p.lotes += 1;
    if (l.custoUnit !== null && Number.isFinite(l.custoUnit) && l.custoUnit > 0) p.valor += l.quantidade * l.custoUnit;
    else p.valorParcial = true;
    if (l.validade && (!p.proximaValidade || l.validade < p.proximaValidade)) p.proximaValidade = l.validade;
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
