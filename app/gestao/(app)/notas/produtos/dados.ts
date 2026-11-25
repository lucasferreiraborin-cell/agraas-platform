import { tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import {
  gtinsPorDescricao, indexar, normalizarDoc, normalizarTexto, separarItens,
  type Apelido, type GrupoPendente, type ItemDeNota, type ProdutoCanonico,
} from "@/lib/gestao/de-para";

type Db = GestaoContexto["supabase"];
type Registro = Record<string, unknown>;

/** Linha de `products` — o catálogo único do estoque (decisão de 24/11/2026). */
export type ProdutoLinha = ProdutoCanonico & { categoria: string | null; unidade: string | null };
export type ApelidoLinha = Apelido & {
  id: string;
  textoOriginal: string | null;
  unidadeNota: string | null;
  fatorConversao: number | null;
};

export type DadosDePara = {
  /** 176 não aplicada: produto_apelidos não existe. */
  ausente: boolean;
  /** Alguma leitura falhou por motivo que não é "tabela ausente". */
  parcial: boolean;
  produtos: ProdutoLinha[];
  apelidos: ApelidoLinha[];
  pendentes: GrupoPendente[];
  ligados: number;
  analisados: number;
  porProduto: Map<string, number>;
  /** Documento do fornecedor → nome, a partir das notas lidas. */
  fornecedores: Map<string, string>;
};

/** Notas mais recentes lidas por tabela. Pendência costuma ser de nota recente. */
const LIMITE_NOTAS = 200;
/** XMLs relidos para achar código de barras (só de notas com item pendente). */
const LIMITE_XML = 30;

const lista = <T,>(v: T | T[] | null | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);
const textoOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const dia = (v: unknown): string | null => (typeof v === "string" && v ? v.slice(0, 10) : null);
const numero = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

type ItensDasNotas = { itens: ItemDeNota[]; parcial: boolean; xmlCanonico: Set<string> };

/**
 * Itens das notas de COMPRA do cliente, nas duas tabelas fiscais, sem contar
 * a mesma nota duas vezes (id compartilhado no modo dual).
 *
 * Venda fica de fora pelo que o financeiro já decidiu: nota com título a
 * RECEBER e nenhum a pagar. A direção gravada em fiscal_invoices não serve
 * para isso — ela vem do CFOP do emitente, e o fornecedor emite a compra do
 * produtor com CFOP de saída (5xxx/6xxx).
 */
async function carregarItens(supabase: Db, clientId: string): Promise<ItensDasNotas> {
  const [canon, leg, tit] = await Promise.all([
    supabase
      .from("fiscal_invoices")
      .select("id, number, issuer_cnpj, issuer_name, issued_at, source, fiscal_invoice_items(description, ncm, unit, unit_price)")
      .eq("client_id", clientId)
      .order("issued_at", { ascending: false, nullsFirst: false })
      .limit(LIMITE_NOTAS),
    supabase
      .from("fiscal_notes")
      .select("id, emitente_cnpj, emitente_nome, data_emissao, created_at, fiscal_note_items(descricao, ncm, unidade, valor_unitario)")
      .eq("client_id", clientId)
      .order("data_emissao", { ascending: false, nullsFirst: false })
      .limit(LIMITE_NOTAS),
    supabase
      .from("titulos_financeiros")
      .select("fiscal_invoice_id, fiscal_note_id, tipo")
      .eq("client_id", clientId)
      .or("fiscal_invoice_id.not.is.null,fiscal_note_id.not.is.null")
      .neq("status", "cancelado")
      .limit(5000),
  ]);

  const parcial = [canon.error, leg.error, tit.error].some((e) => !!e && !tabelaAusente(e));
  if (parcial) console.error("[gestao/produtos] leitura parcial:", canon.error?.message, leg.error?.message, tit.error?.message);

  const tipos = new Map<string, Set<string>>();
  for (const t of (tit.error ? [] : (tit.data ?? [])) as Registro[]) {
    for (const id of [t.fiscal_invoice_id, t.fiscal_note_id]) {
      if (typeof id !== "string") continue;
      const s = tipos.get(id) ?? new Set<string>();
      s.add(String(t.tipo));
      tipos.set(id, s);
    }
  }
  const ehVenda = (id: string) => {
    const s = tipos.get(id);
    return !!s && s.has("receber") && !s.has("pagar");
  };

  const itens: ItemDeNota[] = [];
  const idsCanonicos = new Set<string>();
  const xmlCanonico = new Set<string>();

  for (const n of (canon.error ? [] : (canon.data ?? [])) as Registro[]) {
    const id = String(n.id);
    idsCanonicos.add(id);
    // Vendas antigas registradas sem NF-e (backfill de sales) também ficam fora.
    if (ehVenda(id) || /^VENDA-BACKFILL/i.test(String(n.number ?? ""))) continue;
    if (n.source === "xml_upload") xmlCanonico.add(id);
    for (const it of lista(n.fiscal_invoice_items as Registro | Registro[] | null)) {
      const descricao = textoOuNull(it.description);
      if (!descricao) continue;
      itens.push({
        descricao,
        ncm: textoOuNull(it.ncm),
        unidade: textoOuNull(it.unit),
        preco: numero(it.unit_price),
        data: dia(n.issued_at),
        fornecedorDoc: textoOuNull(n.issuer_cnpj),
        fornecedorNome: textoOuNull(n.issuer_name),
        notaId: id,
      });
    }
  }

  for (const n of (leg.error ? [] : (leg.data ?? [])) as Registro[]) {
    const id = String(n.id);
    if (idsCanonicos.has(id) || ehVenda(id)) continue;
    for (const it of lista(n.fiscal_note_items as Registro | Registro[] | null)) {
      const descricao = textoOuNull(it.descricao);
      if (!descricao) continue;
      itens.push({
        descricao,
        ncm: textoOuNull(it.ncm),
        unidade: textoOuNull(it.unidade),
        preco: numero(it.valor_unitario),
        data: dia(n.data_emissao) ?? dia(n.created_at),
        fornecedorDoc: textoOuNull(n.emitente_cnpj),
        fornecedorNome: textoOuNull(n.emitente_nome),
        notaId: id,
      });
    }
  }

  return { itens, parcial, xmlCanonico };
}

export async function carregarDePara(supabase: Db, clientId: string): Promise<DadosDePara> {
  const vazio: DadosDePara = {
    ausente: false, parcial: false, produtos: [], apelidos: [], pendentes: [], ligados: 0, analisados: 0,
    porProduto: new Map(), fornecedores: new Map(),
  };

  const [rp, ra] = await Promise.all([
    // Só produtos do próprio cliente: o catálogo global (client_id NULL) é
    // legível, mas a policy da 176 não deixa ligar apelido a ele.
    supabase
      .from("products")
      .select("id, name, unit, category, ncm")
      .eq("client_id", clientId)
      .eq("active", true)
      .order("name")
      .limit(2000),
    supabase
      .from("produto_apelidos")
      .select("id, product_id, texto_normalizado, texto_original, fornecedor_doc, ncm, gtin, unidade_nota, fator_conversao")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (tabelaAusente(ra.error)) return { ...vazio, ausente: true };
  if (rp.error || ra.error) console.error("[gestao/produtos] de-para:", rp.error?.message, ra.error?.message);

  const produtos = ((rp.error ? [] : (rp.data ?? [])) as Registro[])
    .map<ProdutoLinha>((p) => ({
      id: String(p.id),
      nome: String(p.name ?? "").trim(),
      unidade: textoOuNull(p.unit),
      categoria: textoOuNull(p.category),
      ncm: textoOuNull(p.ncm),
    }))
    .filter((p) => p.nome.length > 0);
  const apelidos = ((ra.error ? [] : (ra.data ?? [])) as Registro[]).map<ApelidoLinha>((a) => ({
    id: String(a.id),
    produtoId: String(a.product_id),
    texto: String(a.texto_normalizado ?? ""),
    textoOriginal: textoOuNull(a.texto_original),
    fornecedorDoc: textoOuNull(a.fornecedor_doc),
    ncm: textoOuNull(a.ncm),
    gtin: textoOuNull(a.gtin),
    unidadeNota: textoOuNull(a.unidade_nota),
    fatorConversao: numero(a.fator_conversao),
  }));

  const notas = await carregarItens(supabase, clientId);
  const indice = indexar(produtos, apelidos);
  let itens = notas.itens;
  let sep = separarItens(itens, indice);

  // Código de barras: só existe no XML (<cEAN>), não nos itens gravados. Relê o
  // XML apenas das notas que ainda têm item pendente, com teto.
  const idsXml = [...new Set(sep.pendentes.flatMap((g) => g.notaIds))]
    .filter((id) => notas.xmlCanonico.has(id))
    .slice(0, LIMITE_XML);
  if (idsXml.length > 0) {
    const { data, error } = await supabase.from("fiscal_invoices").select("id, raw_xml").eq("client_id", clientId).in("id", idsXml);
    if (error) {
      console.error("[gestao/produtos] xml para GTIN:", error.message);
    } else {
      const porNota = new Map<string, Map<string, string>>();
      for (const r of (data ?? []) as Registro[]) {
        if (typeof r.raw_xml === "string" && r.raw_xml.trimStart().startsWith("<")) porNota.set(String(r.id), gtinsPorDescricao(r.raw_xml));
      }
      let achou = false;
      itens = itens.map((it) => {
        const gtin = it.notaId ? porNota.get(it.notaId)?.get(normalizarTexto(it.descricao)) : undefined;
        if (!gtin || it.gtin) return it;
        achou = true;
        return { ...it, gtin };
      });
      if (achou) sep = separarItens(itens, indice);
    }
  }

  const fornecedores = new Map<string, string>();
  for (const it of itens) {
    const doc = normalizarDoc(it.fornecedorDoc);
    if (doc && it.fornecedorNome && !fornecedores.has(doc)) fornecedores.set(doc, it.fornecedorNome);
  }

  return {
    ausente: false,
    parcial: notas.parcial || !!rp.error || !!ra.error,
    produtos,
    apelidos,
    pendentes: sep.pendentes,
    ligados: sep.ligados,
    analisados: sep.analisados,
    porProduto: sep.porProduto,
    fornecedores,
  };
}
