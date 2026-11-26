/**
 * Leitura do banco para os exports do Agraas Gestão: pacote do contador (mês)
 * e "seus dados" (tudo). Sessão do usuário (RLS, nunca service role) e SEMPRE
 * .eq("client_id") — a conta demo é admin e a RLS da 172 deixa o admin ver
 * todos os clientes.
 *
 * Paginada: o PostgREST devolve no máximo `max-rows` linhas por chamada (1.000
 * no Supabase). Um `.limit(10000)` sozinho corta em silêncio — num export de
 * "todos os seus dados", isso seria perder dado sem avisar.
 */

import type { GestaoContexto } from "./contexto";
import { tabelaAusente } from "./contexto";
import { somaDias } from "./format";
import type { Periodo } from "./resultado";
import type { NotaRef } from "./exportar-formatos";
import {
  COLUNAS_ABASTECIMENTO, COLUNAS_NOTA_ANTERIOR, COLUNAS_NOTA_PRINCIPAL, COLUNAS_TITULO, unificarNotas,
  type AbastecimentoExport, type CentroExport, type ContaExport, type DadosPacote, type LinhaNotaAnterior,
  type LinhaNotaPrincipal, type MaquinaExport, type TituloExport,
} from "./pacote-contador";
import type { DadosMeusDados, TabelaLida, XmlGuardado } from "./meus-dados";

type Db = GestaoContexto["supabase"];
type ErroPg = { code?: string; message: string };
type Resposta = { data: unknown; error: ErroPg | null; count?: number | null };

export type Leitura<T> = { linhas: T[]; erro: ErroPg | null; ausente: boolean; truncado: boolean };
export type Falha = { ok: false; motivo: "ausente" | "erro"; detalhe?: string };

/** Coluna inexistente (migration da coluna não aplicada). `tabelaAusente` sozinho confunde as duas. */
export function colunaAusente(e: ErroPg | null | undefined): boolean {
  return !!e && (e.code === "42703" || /column .* does not exist/i.test(e.message ?? ""));
}
const ausente = (e: ErroPg | null | undefined) => !!e && tabelaAusente(e) && !colunaAusente(e);

/**
 * Lê todas as páginas. A primeira pede a contagem exata; o laço anda pelo
 * tamanho do que voltou, então funciona mesmo se o servidor limitar abaixo
 * de `tamanho`.
 */
export async function lerTodas<T>(
  pagina: (de: number, ate: number, contar: boolean) => PromiseLike<Resposta>,
  { tamanho = 1000, limite = 50_000 }: { tamanho?: number; limite?: number } = {},
): Promise<Leitura<T>> {
  const linhas: T[] = [];
  let total: number | null = null;
  for (;;) {
    const de = linhas.length;
    const r = await pagina(de, de + tamanho - 1, de === 0);
    if (r.error) return { linhas, erro: r.error, ausente: ausente(r.error), truncado: false };
    if (de === 0 && typeof r.count === "number") total = r.count;
    const lote = (Array.isArray(r.data) ? r.data : []) as T[];
    for (const l of lote) linhas.push(l);
    const acabou = lote.length === 0 || (total !== null ? linhas.length >= total : lote.length < tamanho);
    if (acabou) return { linhas, erro: null, ausente: false, truncado: false };
    if (linhas.length >= limite) return { linhas, erro: null, ausente: false, truncado: true };
  }
}

const contagem = (contar: boolean) => (contar ? { count: "exact" as const } : undefined);

function pedacos<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

const unicos = (xs: Array<string | null | undefined>) => [...new Set(xs.filter((x): x is string => !!x))];

/** Número, série e chave das notas ligadas aos títulos (podem ser de outro mês). */
async function carregarRefsNotas(
  db: Db, clientId: string, idsPrincipal: string[], idsAnterior: string[],
): Promise<{ ok: true; mapa: Map<string, NotaRef> } | { ok: false; detalhe: string }> {
  const mapa = new Map<string, NotaRef>();
  const consultas = [
    ...pedacos(idsPrincipal, 100).map(async (lote) => {
      const { data, error } = await db.from("fiscal_invoices").select("id, number, series, model, access_key")
        .eq("client_id", clientId).in("id", lote);
      if (error) return ausente(error) ? null : error.message;
      for (const r of (data ?? []) as Array<{ id: string; number: string | null; series: string | null; model: string | null; access_key: string | null }>) {
        mapa.set(r.id, { numero: r.number, serie: r.series, modelo: r.model, chave: r.access_key });
      }
      return null;
    }),
    ...pedacos(idsAnterior, 100).map(async (lote) => {
      const { data, error } = await db.from("fiscal_notes").select("id, numero_nota, serie, modelo_nf, chave_acesso")
        .eq("client_id", clientId).in("id", lote);
      if (error) return ausente(error) ? null : error.message;
      for (const r of (data ?? []) as Array<{ id: string; numero_nota: string | null; serie: string | null; modelo_nf: number | null; chave_acesso: string | null }>) {
        mapa.set(r.id, { numero: r.numero_nota, serie: r.serie, modelo: r.modelo_nf, chave: r.chave_acesso });
      }
      return null;
    }),
  ];
  const erros = (await Promise.all(consultas)).filter((e): e is string => !!e);
  return erros.length ? { ok: false, detalhe: erros.join(" | ") } : { ok: true, mapa };
}

export type DadosPacoteBanco = Omit<DadosPacote, "clientName" | "hoje" | "geradoEm">;

/** Tudo o que o pacote do mês precisa. */
export async function carregarPacote(db: Db, clientId: string, periodo: Periodo): Promise<{ ok: true; dados: DadosPacoteBanco } | Falha> {
  const { inicio, fim } = periodo;
  // Janela folgada para timestamps (meia-noite UTC do dia 1 até meia-noite de
  // Brasília do mês seguinte); o corte exato por dia é feito em unificarNotas.
  const iniTs = `${inicio}T00:00:00Z`;
  const fimTs = `${somaDias(fim, 1)}T03:00:00Z`;

  const [titulos, abertos, abast, maquinas, centros, contas, notas, notasSemData, anteriores, anterioresSemData] = await Promise.all([
    lerTodas<TituloExport>((de, ate, c) => db.from("titulos_financeiros").select(COLUNAS_TITULO, contagem(c))
      .eq("client_id", clientId)
      .or(`and(vencimento.gte.${inicio},vencimento.lte.${fim}),and(data_baixa.gte.${inicio},data_baixa.lte.${fim})`)
      .order("id").range(de, ate)),
    lerTodas<TituloExport>((de, ate, c) => db.from("titulos_financeiros").select(COLUNAS_TITULO, contagem(c))
      .eq("client_id", clientId).eq("status", "aberto").lte("vencimento", fim)
      .order("id").range(de, ate)),
    lerTodas<AbastecimentoExport>((de, ate, c) => db.from("abastecimentos").select(COLUNAS_ABASTECIMENTO, contagem(c))
      .eq("client_id", clientId).gte("data", inicio).lte("data", fim)
      .order("id").range(de, ate)),
    lerTodas<MaquinaExport>((de, ate, c) => db.from("maquinas").select("id, nome, tipo, placa_ou_serie, medidor", contagem(c))
      .eq("client_id", clientId).order("id").range(de, ate)),
    lerTodas<CentroExport>((de, ate, c) => db.from("centros_custo")
      .select("id, nome, tipo, atividade, cultura, safra, area_ha, cabecas, ativo", contagem(c))
      .eq("client_id", clientId).order("id").range(de, ate)),
    lerTodas<ContaExport>((de, ate, c) => db.from("bank_accounts").select("id, banco_nome, agencia, conta, descricao", contagem(c))
      .eq("client_id", clientId).order("id").range(de, ate)),
    lerTodas<LinhaNotaPrincipal>((de, ate, c) => db.from("fiscal_invoices").select(COLUNAS_NOTA_PRINCIPAL, contagem(c))
      .eq("client_id", clientId).gte("issued_at", iniTs).lt("issued_at", fimTs)
      .order("id").range(de, ate)),
    lerTodas<LinhaNotaPrincipal>((de, ate, c) => db.from("fiscal_invoices").select(COLUNAS_NOTA_PRINCIPAL, contagem(c))
      .eq("client_id", clientId).is("issued_at", null).gte("created_at", iniTs).lt("created_at", fimTs)
      .order("id").range(de, ate)),
    lerTodas<LinhaNotaAnterior>((de, ate, c) => db.from("fiscal_notes").select(COLUNAS_NOTA_ANTERIOR, contagem(c))
      .eq("client_id", clientId).gte("data_emissao", inicio).lte("data_emissao", fim)
      .order("id").range(de, ate)),
    lerTodas<LinhaNotaAnterior>((de, ate, c) => db.from("fiscal_notes").select(COLUNAS_NOTA_ANTERIOR, contagem(c))
      .eq("client_id", clientId).is("data_emissao", null).gte("created_at", iniTs).lt("created_at", fimTs)
      .order("id").range(de, ate)),
  ]);

  if (titulos.ausente && abast.ausente) return { ok: false, motivo: "ausente" };
  const leituras = [titulos, abertos, abast, maquinas, centros, contas, notas, notasSemData, anteriores, anterioresSemData];
  const falhas = leituras.filter((l) => l.erro && !l.ausente);
  if (falhas.length) return { ok: false, motivo: "erro", detalhe: falhas.map((l) => l.erro?.message).join(" | ") };

  const ligados = [...titulos.linhas, ...abertos.linhas];
  const refs = await carregarRefsNotas(
    db, clientId,
    unicos(ligados.map((t) => t.fiscal_invoice_id)),
    unicos(ligados.map((t) => t.fiscal_note_id)),
  );
  if (!refs.ok) return { ok: false, motivo: "erro", detalhe: refs.detalhe };

  return {
    ok: true,
    dados: {
      periodo,
      titulosMes: titulos.linhas,
      emAberto: abertos.linhas,
      abastecimentos: abast.linhas,
      maquinas: maquinas.linhas,
      centros: centros.linhas,
      contas: contas.linhas,
      notasRef: refs.mapa,
      notasMes: unificarNotas([...notas.linhas, ...notasSemData.linhas], [...anteriores.linhas, ...anterioresSemData.linhas], periodo),
    },
  };
}

/* ───────────────────────────── Seus dados (tudo) ───────────────────────────── */

type Linha = Record<string, unknown>;

// fiscal_invoices: sem raw_xml (vira arquivo) nem ai_extraction (rascunho interno da leitura).
const NOTAS_BASE =
  "id, access_key, number, series, model, direction, issued_at, received_at, issuer_cnpj, issuer_name, issuer_state, recipient_cnpj, recipient_name, gross_value, net_value, total_taxes, icms_value, ipi_value, pis_value, cofins_value, funrural_value, status, source, ai_confidence, needs_human_review, reviewed_at, review_notes, property_id, created_at, updated_at";
const NOTAS_COMPLETAS = `${NOTAS_BASE}, cbs_value, ibs_value, cbs_credito_presumido, ibs_credito_presumido, valor_liquido_fiscal`;
// fiscal_notes: sem xml_content (vira arquivo).
const ANTERIORES_BASE = "id, numero_nota, serie, emitente_cnpj, emitente_nome, data_emissao, valor_total, status, created_at";
const ANTERIORES_COMPLETAS = `${ANTERIORES_BASE}, chave_acesso, modelo_nf, supplier_id, auto_stock_entry, cbs_value, ibs_value`;

const LIMITE_XML = 3000;

/** Tenta as colunas completas; se alguma ainda não existir no banco (migration pendente), volta às de base. */
async function lerComAlternativa(
  ler: (colunas: string) => Promise<Leitura<Linha>>, completas: string, base: string,
): Promise<Leitura<Linha>> {
  const r = await ler(completas);
  return colunaAusente(r.erro) ? ler(base) : r;
}

const tabela = (l: Leitura<Linha>): TabelaLida => ({ linhas: l.linhas, ausente: l.ausente });

export type DadosMeusDadosBanco = Omit<DadosMeusDados, "clientName" | "geradoEm">;

/** Todas as tabelas do cliente no Gestão, mais as notas com itens e os XML guardados. */
export async function carregarMeusDados(db: Db, clientId: string): Promise<{ ok: true; dados: DadosMeusDadosBanco } | Falha> {
  const todos = (nome: string, colunas = "*") =>
    lerTodas<Linha>((de, ate, c) => db.from(nome).select(colunas, contagem(c)).eq("client_id", clientId).order("id").range(de, ate));

  const [centros, titulos, contas, maquinas, abastecimentos, notas, itens, anteriores, itensAnteriores, xmlsPrincipais, xmlsAnteriores] = await Promise.all([
    todos("centros_custo"),
    todos("titulos_financeiros"),
    todos("bank_accounts"),
    todos("maquinas"),
    todos("abastecimentos"),
    lerComAlternativa((cols) => todos("fiscal_invoices", cols), NOTAS_COMPLETAS, NOTAS_BASE),
    // Itens não têm client_id: o filtro vai pela nota (inner join), como em maquinas/dados.ts.
    lerTodas<Linha>((de, ate, c) => db.from("fiscal_invoice_items").select("*, fiscal_invoices!inner(client_id)", contagem(c))
      .eq("fiscal_invoices.client_id", clientId).order("id").range(de, ate)),
    lerComAlternativa((cols) => todos("fiscal_notes", cols), ANTERIORES_COMPLETAS, ANTERIORES_BASE),
    todos("fiscal_note_items"),
    lerTodas<{ id: string; access_key: string | null; number: string | null; raw_xml: string | null }>(
      (de, ate, c) => db.from("fiscal_invoices").select("id, access_key, number, raw_xml", contagem(c))
        .eq("client_id", clientId).not("raw_xml", "is", null).order("id").range(de, ate),
      { tamanho: 100, limite: LIMITE_XML },
    ),
    lerTodas<{ id: string; numero_nota: string | null; xml_content: string | null; chave_acesso?: string | null }>(
      (de, ate, c) => db.from("fiscal_notes").select("id, numero_nota, xml_content", contagem(c))
        .eq("client_id", clientId).not("xml_content", "is", null).order("id").range(de, ate),
      { tamanho: 100, limite: LIMITE_XML },
    ),
  ]);

  const leituras = [centros, titulos, contas, maquinas, abastecimentos, notas, itens, anteriores, itensAnteriores, xmlsPrincipais, xmlsAnteriores];
  const falhas = leituras.filter((l) => l.erro && !l.ausente);
  if (falhas.length) return { ok: false, motivo: "erro", detalhe: falhas.map((l) => l.erro?.message).join(" | ") };

  // A chave do XML do fluxo anterior vem da própria leitura das notas (evita pedir a coluna duas vezes).
  const chaveAnterior = new Map(anteriores.linhas.map((r) => [String(r.id), (r.chave_acesso as string | null | undefined) ?? null]));
  const xmls: XmlGuardado[] = [
    ...xmlsPrincipais.linhas.map((r) => ({ id: r.id, tabela: "principal" as const, chave: r.access_key, numero: r.number, xml: r.raw_xml ?? "" })),
    ...xmlsAnteriores.linhas.map((r) => ({ id: r.id, tabela: "anterior" as const, chave: chaveAnterior.get(r.id) ?? null, numero: r.numero_nota, xml: r.xml_content ?? "" })),
  ];

  return {
    ok: true,
    dados: {
      centros: tabela(centros),
      titulos: tabela(titulos),
      contas: tabela(contas),
      maquinas: tabela(maquinas),
      abastecimentos: tabela(abastecimentos),
      notas: tabela(notas),
      notasItens: tabela(itens),
      notasAnteriores: tabela(anteriores),
      notasAnterioresItens: tabela(itensAnteriores),
      xmls,
      xmlsIncompletos: xmlsPrincipais.truncado || xmlsAnteriores.truncado,
    },
  };
}
