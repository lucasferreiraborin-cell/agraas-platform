import { tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import type { TipoCategoria } from "@/lib/gestao/estoque";

/**
 * Leituras do estoque gerencial (migration 181). Toda consulta filtra
 * client_id: a conta demo é admin e a RLS sozinha não a isola.
 * `ausente` = a 181 ainda não foi aplicada (as telas mostram "em ativação").
 */

type Db = GestaoContexto["supabase"];
type Registro = Record<string, unknown>;

export type Categoria = {
  id: string; grupo: string; nome: string; tipo: TipoCategoria; ativo: boolean; ordem: number; contaContabilId: string | null;
};
export type Almoxarifado = { id: string; nome: string; tipo: string; capacidadeLitros: number | null; ativo: boolean };
export type Produto = {
  id: string; nome: string; unidade: string | null; ncm: string | null; categoriaPlataforma: string | null;
  categoriaId: string | null; almoxarifadoPadraoId: string | null; minimo: number | null; maximo: number | null;
  gtin: string | null; ativo: boolean;
};
export type Lote = {
  id: string; productId: string; almoxarifadoId: string | null; quantidade: number; recebido: number | null;
  custoUnit: number | null; entrada: string | null; numero: string | null; documento: string | null;
  fornecedor: string | null; notaItemId: string | null;
};
export type CentroOpcao = { id: string; nome: string; atividade: string };
export type MaquinaOpcao = { id: string; nome: string };

export const TIPO_ALMOX_NOME: Record<string, string> = {
  geral: "Geral", combustivel: "Tanque de combustível", pecas: "Peças", insumos: "Insumos",
};

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const numero = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

export type Cadastros = {
  ausente: boolean;
  falhou: boolean;
  categorias: Categoria[];
  almoxarifados: Almoxarifado[];
  produtos: Produto[];
};

/** Categorias, almoxarifados e produtos do cliente. */
export async function carregarCadastros(supabase: Db, clientId: string): Promise<Cadastros> {
  const [cat, alm, prod] = await Promise.all([
    supabase.from("categorias_gerenciais").select("id, grupo, nome, tipo, ativo, ordem, conta_contabil_id")
      .eq("client_id", clientId).order("ordem").order("nome").limit(500),
    supabase.from("almoxarifados").select("id, nome, tipo, capacidade_litros, ativo")
      .eq("client_id", clientId).order("nome").limit(200),
    supabase.from("products")
      .select("id, name, unit, ncm, category, categoria_gerencial_id, almoxarifado_padrao_id, estoque_minimo, estoque_maximo, gtin, active")
      .eq("client_id", clientId).order("name").limit(3000),
  ]);
  const ausente = tabelaAusente(cat.error) || tabelaAusente(alm.error) || tabelaAusente(prod.error);
  const vazio: Cadastros = { ausente, falhou: false, categorias: [], almoxarifados: [], produtos: [] };
  if (ausente) return vazio;
  const falhou = !!(cat.error || alm.error || prod.error);
  if (falhou) console.error("[gestao/estoque] cadastros:", cat.error?.message, alm.error?.message, prod.error?.message);

  return {
    ausente: false,
    falhou,
    categorias: ((cat.data ?? []) as Registro[]).map((c) => ({
      id: String(c.id), grupo: String(c.grupo ?? ""), nome: String(c.nome ?? ""), tipo: (c.tipo as TipoCategoria) ?? "despesa",
      ativo: c.ativo !== false, ordem: Number(c.ordem ?? 0), contaContabilId: texto(c.conta_contabil_id),
    })),
    almoxarifados: ((alm.data ?? []) as Registro[]).map((a) => ({
      id: String(a.id), nome: String(a.nome ?? ""), tipo: String(a.tipo ?? "geral"),
      capacidadeLitros: numero(a.capacidade_litros), ativo: a.ativo !== false,
    })),
    produtos: ((prod.data ?? []) as Registro[]).map((p) => ({
      id: String(p.id), nome: String(p.name ?? "").trim() || "Produto sem nome", unidade: texto(p.unit), ncm: texto(p.ncm),
      categoriaPlataforma: texto(p.category), categoriaId: texto(p.categoria_gerencial_id),
      almoxarifadoPadraoId: texto(p.almoxarifado_padrao_id), minimo: numero(p.estoque_minimo), maximo: numero(p.estoque_maximo),
      gtin: texto(p.gtin), ativo: p.active !== false,
    })),
  };
}

/** Lotes do cliente (inclusive zerados, para estorno e histórico). */
export async function carregarLotes(supabase: Db, clientId: string): Promise<{ lotes: Lote[]; falhou: boolean }> {
  const { data, error } = await supabase
    .from("stock_batches")
    .select("id, product_id, almoxarifado_id, quantity_available, quantity, quantity_received, unit_cost, entry_date, batch_number, document_source, supplier_name, nota_item_id")
    .eq("client_id", clientId)
    .order("entry_date", { ascending: false })
    .limit(5000);
  if (error) {
    if (!tabelaAusente(error)) console.error("[gestao/estoque] lotes:", error.message);
    return { lotes: [], falhou: !tabelaAusente(error) };
  }
  const lotes = ((data ?? []) as Registro[])
    .filter((l) => typeof l.product_id === "string")
    .map((l) => ({
      id: String(l.id),
      productId: String(l.product_id),
      almoxarifadoId: texto(l.almoxarifado_id),
      quantidade: numero(l.quantity_available) ?? numero(l.quantity) ?? 0,
      recebido: numero(l.quantity_received),
      custoUnit: numero(l.unit_cost),
      entrada: texto(l.entry_date)?.slice(0, 10) ?? null,
      numero: texto(l.batch_number),
      documento: texto(l.document_source),
      fornecedor: texto(l.supplier_name),
      notaItemId: texto(l.nota_item_id),
    }));
  return { lotes, falhou: false };
}

/** Centros de custo ativos (com atividade, para agrupar no select). */
export async function carregarCentros(supabase: Db, clientId: string): Promise<CentroOpcao[]> {
  const { data } = await supabase.from("centros_custo").select("id, nome, atividade")
    .eq("client_id", clientId).eq("ativo", true).order("nome");
  return ((data ?? []) as Registro[]).map((c) => ({ id: String(c.id), nome: String(c.nome ?? ""), atividade: String(c.atividade ?? "outra") }));
}

export async function carregarMaquinasAtivas(supabase: Db, clientId: string): Promise<MaquinaOpcao[]> {
  const { data } = await supabase.from("maquinas").select("id, nome").eq("client_id", clientId).eq("ativo", true).order("nome");
  return ((data ?? []) as Registro[]).map((m) => ({ id: String(m.id), nome: String(m.nome ?? "") }));
}

export type Movimento = {
  id: string; productId: string | null; loteId: string | null; tipo: string | null; destino: string | null;
  quantidade: number; almoxarifadoId: string | null; maquinaId: string | null; centroId: string | null;
  custoUnit: number | null; custoTotal: number | null; motivo: string | null; data: string | null;
  referenciaTabela: string | null; referenciaId: string | null; criadoPor: string | null; criadoEm: string | null;
};

/** Movimentos do cliente, do mais recente ao mais antigo. */
export async function carregarMovimentos(
  supabase: Db, clientId: string, opcoes: { limite?: number; desde?: string; almoxarifadoId?: string } = {},
): Promise<{ movimentos: Movimento[]; falhou: boolean; ausente: boolean }> {
  let q = supabase
    .from("stock_movements")
    .select("id, product_id, batch_id, movement_type, destino_tipo, quantity, almoxarifado_id, maquina_id, centro_custo_id, custo_unitario, custo_total, motivo, data_movimento, reference_table, reference_id, criado_por, created_at")
    .eq("client_id", clientId)
    .order("data_movimento", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(opcoes.limite ?? 300);
  if (opcoes.desde) q = q.gte("data_movimento", opcoes.desde);
  if (opcoes.almoxarifadoId) q = q.eq("almoxarifado_id", opcoes.almoxarifadoId);
  const { data, error } = await q;
  if (error) {
    const ausente = tabelaAusente(error);
    if (!ausente) console.error("[gestao/estoque] movimentos:", error.message);
    return { movimentos: [], falhou: !ausente, ausente };
  }
  return {
    ausente: false,
    falhou: false,
    movimentos: ((data ?? []) as Registro[]).map((m) => ({
      id: String(m.id),
      productId: texto(m.product_id),
      loteId: texto(m.batch_id),
      tipo: texto(m.movement_type),
      destino: texto(m.destino_tipo),
      quantidade: numero(m.quantity) ?? 0,
      almoxarifadoId: texto(m.almoxarifado_id),
      maquinaId: texto(m.maquina_id),
      centroId: texto(m.centro_custo_id),
      custoUnit: numero(m.custo_unitario),
      custoTotal: numero(m.custo_total),
      motivo: texto(m.motivo),
      data: texto(m.data_movimento)?.slice(0, 10) ?? texto(m.created_at)?.slice(0, 10) ?? null,
      referenciaTabela: texto(m.reference_table),
      referenciaId: texto(m.reference_id),
      criadoPor: texto(m.criado_por),
      criadoEm: texto(m.created_at),
    })),
  };
}
