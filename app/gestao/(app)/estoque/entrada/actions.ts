"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contextoGestao, tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import { normalizarDoc, normalizarNcm, normalizarTexto } from "@/lib/gestao/de-para";
import { fatorImplicito } from "@/lib/gestao/estoque-entrada";
import { lerQuantidade } from "@/lib/gestao/estoque";

/**
 * Conferência da nota → estoque. A gravação é UMA chamada a
 * dar_entrada_nota (migration 181): tudo ou nada, idempotente por item.
 * Depois, o vínculo item → produto (com o fator de conversão confirmado) é
 * lembrado em produto_apelidos (176) para a próxima nota do mesmo
 * fornecedor entrar ligada — melhor esforço: sem a 176, a entrada vale igual.
 */

export type EstadoEntrada = { ok?: string; erro?: string; versao: number };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Sem z.uuid(): ids gerados por md5 (seeds) não têm o nibble de versão do RFC.
const uuid = z.string().regex(UUID_RX);
const uuidOuNulo = uuid.nullable();

const ItemPayload = z.object({
  itemId: uuid,
  origem: z.enum(["canonica", "legado"]),
  incluir: z.boolean(),
  modo: z.enum(["existente", "novo"]),
  produtoId: uuidOuNulo,
  categoriaId: uuidOuNulo,
  novoNome: z.string().max(120),
  novoUnidade: z.string().max(10),
  novoCategoriaPlataforma: z.string().max(30).nullable(),
  destino: z.enum(["estoque", "direto"]),
  almoxarifadoId: uuidOuNulo,
  maquinaId: uuidOuNulo,
  centroId: uuidOuNulo,
  destinoTipo: z.enum(["abastecimento", "manutencao", "aplicacao", "consumo"]).nullable(),
  quantidade: z.string().max(30),
});
const Payload = z.object({ notaId: uuid, origem: z.enum(["canonica", "legado"]), itens: z.array(ItemPayload).min(1).max(300) });

type ErroPg = { code?: string; message?: string } | null;
const duplicada = (e: ErroPg) => !!e && (e.code === "23505" || /duplicate key/i.test(e.message ?? ""));

/** Mensagens das funções da 181 já são frases para o produtor; o resto vira genérico. */
function mensagemDoBanco(e: { code?: string; message?: string }): string {
  const m = (e.message ?? "").trim();
  if (tabelaAusente(e) || e.code === "PGRST202") return "O estoque ainda está sendo ligado à sua conta. Tente de novo em instantes.";
  if (/forbidden/i.test(m)) return "Esta nota não é da sua conta.";
  if (e.code === "22023" || e.code === "P0002") return m.charAt(0).toUpperCase() + m.slice(1) + ".";
  console.error("[gestao/estoque/entrada] dar_entrada_nota:", e.code, m);
  return "Não foi possível dar entrada agora. Nada foi gravado; tente de novo.";
}

type ItemLido = { id: string; descricao: string; ncm: string | null; quantidade: number | null; unidade: string | null };

/** Relê os itens no banco (o navegador nunca manda o texto do apelido). */
async function lerItens(ctx: GestaoContexto, origem: "canonica" | "legado", notaId: string, ids: string[]): Promise<{ itens: ItemLido[]; doc: string | null }> {
  if (origem === "canonica") {
    const [{ data: nota }, { data: its }] = await Promise.all([
      ctx.supabase.from("fiscal_invoices").select("issuer_cnpj").eq("id", notaId).eq("client_id", ctx.clientId).maybeSingle(),
      ctx.supabase.from("fiscal_invoice_items").select("id, description, ncm, quantity, unit").eq("fiscal_invoice_id", notaId).in("id", ids),
    ]);
    if (!nota) return { itens: [], doc: null };
    return {
      doc: (nota.issuer_cnpj as string | null) ?? null,
      itens: ((its ?? []) as Array<Record<string, unknown>>).map((i) => ({
        id: String(i.id), descricao: String(i.description ?? ""), ncm: (i.ncm as string | null) ?? null,
        quantidade: i.quantity == null ? null : Number(i.quantity), unidade: (i.unit as string | null) ?? null,
      })),
    };
  }
  const [{ data: nota }, { data: its }] = await Promise.all([
    ctx.supabase.from("fiscal_notes").select("emitente_cnpj").eq("id", notaId).eq("client_id", ctx.clientId).maybeSingle(),
    ctx.supabase.from("fiscal_note_items").select("id, descricao, ncm, quantidade, unidade").eq("note_id", notaId).in("id", ids),
  ]);
  if (!nota) return { itens: [], doc: null };
  return {
    doc: (nota.emitente_cnpj as string | null) ?? null,
    itens: ((its ?? []) as Array<Record<string, unknown>>).map((i) => ({
      id: String(i.id), descricao: String(i.descricao ?? ""), ncm: (i.ncm as string | null) ?? null,
      quantidade: i.quantidade == null ? null : Number(i.quantidade), unidade: (i.unidade as string | null) ?? null,
    })),
  };
}

/**
 * Grava (ou repõe) o apelido texto+fornecedor → produto com o fator que o
 * produtor confirmou. Mesma regra de app/gestao/(app)/notas/produtos
 * (gravarApelido) — TODO: unificar num helper compartilhado do de-para
 * quando a tela de produtos da nota e o estoque forem integrados.
 */
async function lembrarVinculo(ctx: GestaoContexto, produtoId: string, item: ItemLido, doc: string | null, quantidadeEntrada: number): Promise<void> {
  const textoNorm = normalizarTexto(item.descricao);
  if (!textoNorm || textoNorm.length > 300) return;
  const fornecedorDoc = normalizarDoc(doc);
  const unidadeNota = (item.unidade ?? "").trim().toUpperCase().slice(0, 10) || null;
  const fator = unidadeNota ? fatorImplicito(item.quantidade, quantidadeEntrada) : null;
  const dados = {
    product_id: produtoId,
    texto_original: item.descricao.slice(0, 300),
    ncm: normalizarNcm(item.ncm),
    // gtin fica de fora: quem grava é a tela de produtos da nota (lê o XML).
    unidade_nota: fator !== null ? unidadeNota : null,
    fator_conversao: fator,
  };
  const buscar = () => {
    const q = ctx.supabase.from("produto_apelidos").select("id").eq("client_id", ctx.clientId).eq("texto_normalizado", textoNorm);
    return (fornecedorDoc ? q.eq("fornecedor_doc", fornecedorDoc) : q.is("fornecedor_doc", null)).maybeSingle();
  };
  const atual = await buscar();
  if (atual.error) return; // 176 ainda não aplicada, ou leitura falhou: a entrada já valeu
  if (atual.data) {
    await ctx.supabase.from("produto_apelidos").update(dados).eq("id", String(atual.data.id)).eq("client_id", ctx.clientId);
    return;
  }
  const novo = await ctx.supabase.from("produto_apelidos").insert({
    client_id: ctx.clientId, texto_normalizado: textoNorm, fornecedor_doc: fornecedorDoc, ...dados,
  });
  if (duplicada(novo.error)) {
    const deNovo = await buscar();
    if (deNovo.data) await ctx.supabase.from("produto_apelidos").update(dados).eq("id", String(deNovo.data.id)).eq("client_id", ctx.clientId);
  }
}

export async function confirmarEntrada(prev: EstadoEntrada, fd: FormData): Promise<EstadoEntrada> {
  const versao = prev.versao + 1;
  const falha = (erro: string): EstadoEntrada => ({ erro, versao });

  let bruto: unknown;
  try { bruto = JSON.parse(String(fd.get("payload") ?? "")); } catch { return falha("Não foi possível ler a conferência. Atualize a página."); }
  const lido = Payload.safeParse(bruto);
  if (!lido.success) return falha("Algum campo veio inválido. Atualize a página e confira de novo.");
  const { notaId, origem } = lido.data;
  const marcados = lido.data.itens.filter((i) => i.incluir);
  if (marcados.length === 0) return falha("Marque ao menos um item para dar entrada.");

  // Validação de forma (o banco confere posse, categoria, almoxarifado e saldo).
  const pItens: Array<Record<string, unknown>> = [];
  const quantidades = new Map<string, number>();
  for (const [n, i] of marcados.entries()) {
    const rot = `Item ${n + 1}`;
    const quantidade = lerQuantidade(i.quantidade);
    if (quantidade === null || quantidade <= 0) return falha(`${rot}: informe a quantidade que entra no estoque.`);
    quantidades.set(i.itemId, quantidade);
    const item: Record<string, unknown> = { origem, item_id: i.itemId, destino: i.destino, quantidade };
    if (i.modo === "existente") {
      if (!i.produtoId) return falha(`${rot}: escolha o produto ou crie um novo.`);
      item.produto_id = i.produtoId;
      if (i.categoriaId) item.categoria_gerencial_id = i.categoriaId;
    } else {
      const nome = i.novoNome.replace(/\s+/g, " ").trim();
      if (nome.length < 2) return falha(`${rot}: dê um nome ao produto novo.`);
      if (!i.novoUnidade.trim()) return falha(`${rot}: informe a unidade do produto novo.`);
      if (!i.categoriaId) return falha(`${rot}: escolha a categoria do produto novo.`);
      item.novo_produto = {
        nome, unidade: i.novoUnidade.trim().toUpperCase(), categoria_gerencial_id: i.categoriaId,
        almoxarifado_padrao_id: i.destino === "estoque" ? i.almoxarifadoId : null,
        categoria: i.novoCategoriaPlataforma,
      };
    }
    if (i.destino === "estoque") {
      if (!i.almoxarifadoId) return falha(`${rot}: escolha o almoxarifado.`);
      item.almoxarifado_id = i.almoxarifadoId;
    } else {
      if (!i.maquinaId && !i.centroId) return falha(`${rot}: escolha a máquina ou o centro de custo.`);
      item.maquina_id = i.maquinaId;
      item.centro_custo_id = i.centroId;
      if (i.destinoTipo) item.destino_tipo = i.destinoTipo;
    }
    pItens.push(item);
  }

  const ctx = await contextoGestao();
  // Produto novo com nome igual a um ativo: o banco reusa o existente (não duplica).
  const { data, error } = await ctx.supabase.rpc("dar_entrada_nota", { p_cliente: ctx.clientId, p_itens: pItens });
  if (error) return falha(mensagemDoBanco(error));

  const r = (data ?? {}) as { lancados?: number; ignorados?: string[]; fornecedores_criados?: number; produtos_criados?: unknown[]; lotes?: Array<{ item_id: string; produto_id: string }> };
  const lotes = r.lotes ?? [];

  if (lotes.length > 0) {
    try {
      const { itens, doc } = await lerItens(ctx, origem, notaId, lotes.map((l) => l.item_id));
      const porId = new Map(itens.map((i) => [i.id, i]));
      for (const l of lotes) {
        const item = porId.get(l.item_id);
        const q = quantidades.get(l.item_id);
        if (item && q) await lembrarVinculo(ctx, l.produto_id, item, doc, q);
      }
    } catch (e) {
      console.error("[gestao/estoque/entrada] lembrar vínculo:", e instanceof Error ? e.message : String(e));
    }
  }

  revalidatePath("/gestao/estoque", "layout");
  revalidatePath("/gestao/notas/produtos");

  // Volta para a nota com o resumo na URL: a lista de pendentes muda e o
  // formulário remonta do zero (o estado dele é por posição do item).
  const qs = new URLSearchParams({
    aviso: "entrada",
    n: String(r.lancados ?? 0),
    ign: String(r.ignorados?.length ?? 0),
    prod: String(r.produtos_criados?.length ?? 0),
    forn: String(r.fornecedores_criados ?? 0),
  });
  if (origem === "legado") qs.set("origem", "legado");
  redirect(`/gestao/estoque/entrada/${notaId}?${qs.toString()}`);
}

/** Desfaz uma entrada que ainda não teve saída; o item volta a ficar pendente. */
export async function estornarEntrada(fd: FormData) {
  const lote = String(fd.get("lote") ?? "");
  const voltar = String(fd.get("voltar") ?? "/gestao/estoque/movimentacoes");
  const motivo = String(fd.get("motivo") ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const destino = voltar.startsWith("/gestao/estoque") && !voltar.startsWith("//") ? voltar.split("?")[0] : "/gestao/estoque/movimentacoes";
  if (!UUID_RX.test(lote)) redirect(`${destino}?erro=estorno`);
  if (motivo.length < 3) redirect(`${destino}?erro=motivo`);

  const { supabase, clientId } = await contextoGestao();
  const { error } = await supabase.rpc("estornar_entrada_estoque", { p_cliente: clientId, p_lote: lote, p_motivo: motivo });
  if (error) {
    const codigo = /lote_movimentado/.test(error.message ?? "") ? "movimentado" : tabelaAusente(error) ? "ativacao" : "estorno";
    if (codigo === "estorno") console.error("[gestao/estoque] estorno:", error.message);
    redirect(`${destino}?erro=${codigo}`);
  }
  revalidatePath("/gestao/estoque", "layout");
  redirect(`${destino}?aviso=estornado`);
}
