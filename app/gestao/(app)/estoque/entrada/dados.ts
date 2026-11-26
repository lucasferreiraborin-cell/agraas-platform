import { tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import { gtinsPorDescricao, normalizarTexto, type Apelido } from "@/lib/gestao/de-para";
import { notaEhCompra } from "@/lib/gestao/estoque-entrada";
import { numero } from "../dados";

/**
 * Notas de COMPRA do cliente para conferir no estoque, nas duas tabelas
 * fiscais (fiscal_invoices canônica e fiscal_notes legada), sem contar a mesma
 * nota duas vezes. "Compra" é decidido do ponto de vista do cliente
 * (notaEhCompra) — nunca por fiscal_invoices.direction.
 */

type Db = GestaoContexto["supabase"];
type Registro = Record<string, unknown>;
export type Origem = "canonica" | "legado";

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const lista = <T,>(v: T | T[] | null | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

export type NotaEntrada = {
  id: string;
  origem: Origem;
  numero: string | null;
  emitente: string | null;
  emitenteDoc: string | null;
  data: string | null;
  valor: number | null;
  itens: number;
  pendentes: number;
};

export type ListaEntrada = { notas: NotaEntrada[]; ausente: boolean; parcial: boolean; semItens: number };

async function itensJaLancados(supabase: Db, clientId: string): Promise<{ ids: Set<string>; ausente: boolean; falhou: boolean }> {
  const { data, error } = await supabase.from("stock_batches").select("nota_item_id").eq("client_id", clientId).not("nota_item_id", "is", null).limit(10000);
  if (error) return { ids: new Set(), ausente: tabelaAusente(error), falhou: !tabelaAusente(error) };
  return { ids: new Set(((data ?? []) as Registro[]).map((r) => String(r.nota_item_id))), ausente: false, falhou: false };
}

export async function listarNotasParaEntrada(supabase: Db, clientId: string, desde: string | null): Promise<ListaEntrada> {
  let canonQ = supabase
    .from("fiscal_invoices")
    .select("id, number, issuer_cnpj, issuer_name, recipient_cnpj, issued_at, gross_value, status, fiscal_invoice_items(id, cfop, linked_stock_batch_id)")
    .eq("client_id", clientId)
    .order("issued_at", { ascending: false, nullsFirst: false })
    .limit(300);
  let legQ = supabase
    .from("fiscal_notes")
    .select("id, numero_nota, emitente_cnpj, emitente_nome, data_emissao, created_at, valor_total, status, fiscal_note_items(id, cfop)")
    .eq("client_id", clientId)
    .order("data_emissao", { ascending: false, nullsFirst: false })
    .limit(300);
  if (desde) {
    canonQ = canonQ.gte("issued_at", desde);
    legQ = legQ.or(`data_emissao.gte.${desde},and(data_emissao.is.null,created_at.gte.${desde})`);
  }
  const [lancados, canon, leg, tit] = await Promise.all([
    itensJaLancados(supabase, clientId),
    canonQ,
    legQ,
    supabase.from("titulos_financeiros").select("fiscal_invoice_id, fiscal_note_id, tipo").eq("client_id", clientId).neq("status", "cancelado").limit(5000),
  ]);
  if (lancados.ausente) return { notas: [], ausente: true, parcial: false, semItens: 0 };
  const parcial = lancados.falhou || [canon.error, leg.error, tit.error].some((e) => !!e && !tabelaAusente(e));
  if (parcial) console.error("[gestao/estoque/entrada] leitura parcial:", canon.error?.message, leg.error?.message, tit.error?.message);

  const tipos = new Map<string, Set<string>>();
  for (const t of (tit.error ? [] : (tit.data ?? [])) as Registro[]) {
    for (const id of [t.fiscal_invoice_id, t.fiscal_note_id]) {
      if (typeof id !== "string") continue;
      const s = tipos.get(id) ?? new Set<string>();
      s.add(String(t.tipo));
      tipos.set(id, s);
    }
  }

  const notas: NotaEntrada[] = [];
  const idsCanon = new Set<string>();
  let semItens = 0;

  for (const n of (canon.error ? [] : (canon.data ?? [])) as Registro[]) {
    const id = String(n.id);
    idsCanon.add(id);
    if (n.status === "rejected" || n.status === "archived") continue;
    const itens = lista(n.fiscal_invoice_items as Registro | Registro[] | null);
    const compra = notaEhCompra({
      numero: texto(n.number), tiposTitulos: tipos.get(id) ?? [], cfops: itens.map((i) => texto(i.cfop)),
      emitenteDoc: texto(n.issuer_cnpj), destinatarioDoc: texto(n.recipient_cnpj),
    });
    if (!compra) continue;
    if (itens.length === 0) { semItens++; continue; }
    const pendentes = itens.filter((i) => !i.linked_stock_batch_id && !lancados.ids.has(String(i.id))).length;
    notas.push({
      id, origem: "canonica", numero: texto(n.number), emitente: texto(n.issuer_name), emitenteDoc: texto(n.issuer_cnpj),
      data: texto(n.issued_at)?.slice(0, 10) ?? null, valor: numero(n.gross_value), itens: itens.length, pendentes,
    });
  }

  for (const n of (leg.error ? [] : (leg.data ?? [])) as Registro[]) {
    const id = String(n.id);
    if (idsCanon.has(id)) continue; // modo dual: a mesma nota já veio da canônica
    const itens = lista(n.fiscal_note_items as Registro | Registro[] | null);
    const compra = notaEhCompra({
      numero: texto(n.numero_nota), tiposTitulos: tipos.get(id) ?? [], cfops: itens.map((i) => texto(i.cfop)),
      emitenteDoc: texto(n.emitente_cnpj),
    });
    if (!compra) continue;
    if (itens.length === 0) { semItens++; continue; }
    const pendentes = itens.filter((i) => !lancados.ids.has(String(i.id))).length;
    notas.push({
      id, origem: "legado", numero: texto(n.numero_nota), emitente: texto(n.emitente_nome), emitenteDoc: texto(n.emitente_cnpj),
      data: texto(n.data_emissao)?.slice(0, 10) ?? texto(n.created_at)?.slice(0, 10) ?? null, valor: numero(n.valor_total),
      itens: itens.length, pendentes,
    });
  }

  notas.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
  return { notas, ausente: false, parcial, semItens };
}

export type ItemConferencia = {
  id: string;
  seq: number | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  quantidade: number | null;
  unidade: string | null;
  unitario: number | null;
  total: number | null;
  gtin: string | null;
  /** Lote que já recebeu este item (por aqui ou pela aprovação da controladoria). */
  loteId: string | null;
};

export type NotaConferencia = {
  id: string;
  origem: Origem;
  numero: string | null;
  emitente: string | null;
  emitenteDoc: string | null;
  data: string | null;
  valor: number | null;
  status: string | null;
  compra: boolean;
  itens: ItemConferencia[];
};

/** Nota com itens; tenta a canônica primeiro (ou a legada, com ?origem=legado). */
export async function carregarNotaParaConferencia(
  supabase: Db, clientId: string, id: string, preferir: Origem,
): Promise<NotaConferencia | null> {
  async function canonica(): Promise<NotaConferencia | null> {
    const { data, error } = await supabase
      .from("fiscal_invoices")
      .select("id, number, issuer_cnpj, issuer_name, recipient_cnpj, issued_at, gross_value, status, source, raw_xml")
      .eq("id", id).eq("client_id", clientId).maybeSingle();
    if (error || !data) return null;
    const n = data as Registro;
    const { data: its } = await supabase
      .from("fiscal_invoice_items")
      .select("id, sequence, description, ncm, cfop, quantity, unit, unit_price, total_price, linked_stock_batch_id")
      .eq("fiscal_invoice_id", id).order("sequence", { ascending: true });
    const gtins = n.source === "xml_upload" && typeof n.raw_xml === "string" && n.raw_xml.trimStart().startsWith("<")
      ? gtinsPorDescricao(n.raw_xml) : new Map<string, string>();
    const itens = ((its ?? []) as Registro[]).map<ItemConferencia>((i) => {
      const descricao = texto(i.description) ?? "Item sem descrição";
      return {
        id: String(i.id), seq: numero(i.sequence), descricao, ncm: texto(i.ncm), cfop: texto(i.cfop),
        quantidade: numero(i.quantity), unidade: texto(i.unit), unitario: numero(i.unit_price),
        total: numero(i.total_price) ?? (numero(i.quantity) !== null && numero(i.unit_price) !== null ? Math.round(numero(i.quantity)! * numero(i.unit_price)! * 100) / 100 : null),
        gtin: gtins.get(normalizarTexto(descricao)) ?? null, loteId: texto(i.linked_stock_batch_id),
      };
    });
    const { data: tit } = await supabase.from("titulos_financeiros").select("tipo").eq("client_id", clientId).eq("fiscal_invoice_id", id).neq("status", "cancelado");
    return {
      id, origem: "canonica", numero: texto(n.number), emitente: texto(n.issuer_name), emitenteDoc: texto(n.issuer_cnpj),
      data: texto(n.issued_at)?.slice(0, 10) ?? null, valor: numero(n.gross_value), status: texto(n.status),
      compra: notaEhCompra({
        numero: texto(n.number), tiposTitulos: ((tit ?? []) as Registro[]).map((t) => String(t.tipo)),
        cfops: itens.map((i) => i.cfop), emitenteDoc: texto(n.issuer_cnpj), destinatarioDoc: texto(n.recipient_cnpj),
      }),
      itens,
    };
  }

  async function legado(): Promise<NotaConferencia | null> {
    const { data, error } = await supabase
      .from("fiscal_notes")
      .select("id, numero_nota, emitente_cnpj, emitente_nome, data_emissao, created_at, valor_total, status")
      .eq("id", id).eq("client_id", clientId).maybeSingle();
    if (error || !data) return null;
    const n = data as Registro;
    const { data: its } = await supabase
      .from("fiscal_note_items")
      .select("id, descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total")
      .eq("note_id", id).order("descricao");
    const itens = ((its ?? []) as Registro[]).map<ItemConferencia>((i) => ({
      id: String(i.id), seq: null, descricao: texto(i.descricao) ?? "Item sem descrição", ncm: texto(i.ncm), cfop: texto(i.cfop),
      quantidade: numero(i.quantidade), unidade: texto(i.unidade), unitario: numero(i.valor_unitario),
      total: numero(i.valor_total) ?? (numero(i.quantidade) !== null && numero(i.valor_unitario) !== null ? Math.round(numero(i.quantidade)! * numero(i.valor_unitario)! * 100) / 100 : null),
      gtin: null, loteId: null,
    }));
    const { data: tit } = await supabase.from("titulos_financeiros").select("tipo").eq("client_id", clientId).eq("fiscal_note_id", id).neq("status", "cancelado");
    return {
      id, origem: "legado", numero: texto(n.numero_nota), emitente: texto(n.emitente_nome), emitenteDoc: texto(n.emitente_cnpj),
      data: texto(n.data_emissao)?.slice(0, 10) ?? texto(n.created_at)?.slice(0, 10) ?? null, valor: numero(n.valor_total),
      status: texto(n.status),
      compra: notaEhCompra({
        numero: texto(n.numero_nota), tiposTitulos: ((tit ?? []) as Registro[]).map((t) => String(t.tipo)),
        cfops: itens.map((i) => i.cfop), emitenteDoc: texto(n.emitente_cnpj),
      }),
      itens,
    };
  }

  const ordem = preferir === "legado" ? [legado, canonica] : [canonica, legado];
  let nota: NotaConferencia | null = null;
  for (const f of ordem) {
    nota = await f();
    if (nota) break;
  }
  if (!nota || nota.itens.length === 0) return nota;

  // Lotes que já receberam itens desta nota (por nota_item_id).
  const { data: lotes } = await supabase.from("stock_batches").select("id, nota_item_id")
    .eq("client_id", clientId).in("nota_item_id", nota.itens.map((i) => i.id));
  const porItem = new Map(((lotes ?? []) as Registro[]).map((l) => [String(l.nota_item_id), String(l.id)]));
  nota.itens = nota.itens.map((i) => ({ ...i, loteId: porItem.get(i.id) ?? i.loteId }));
  return nota;
}

export type ApelidoLido = Apelido & { id: string; unidadeNota: string | null; fatorConversao: number | null };

/** Apelidos (de-para, migration 176). Tabela ausente = lista vazia, sem erro. */
export async function carregarApelidos(supabase: Db, clientId: string): Promise<{ apelidos: ApelidoLido[]; ausente: boolean }> {
  const { data, error } = await supabase
    .from("produto_apelidos")
    .select("id, product_id, texto_normalizado, fornecedor_doc, ncm, gtin, unidade_nota, fator_conversao")
    .eq("client_id", clientId)
    .limit(5000);
  if (error) {
    if (!tabelaAusente(error)) console.error("[gestao/estoque/entrada] apelidos:", error.message);
    return { apelidos: [], ausente: true };
  }
  return {
    ausente: false,
    apelidos: ((data ?? []) as Registro[]).map((a) => ({
      id: String(a.id), produtoId: String(a.product_id), texto: String(a.texto_normalizado ?? ""),
      fornecedorDoc: texto(a.fornecedor_doc), ncm: texto(a.ncm), gtin: texto(a.gtin),
      unidadeNota: texto(a.unidade_nota), fatorConversao: numero(a.fator_conversao),
    })),
  };
}
