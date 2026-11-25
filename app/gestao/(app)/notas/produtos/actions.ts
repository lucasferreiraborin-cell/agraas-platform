"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import {
  ehCategoria, fatorParaProduto, gtinValido, mesmoNome, normalizarDoc, normalizarNcm, normalizarTexto,
} from "@/lib/gestao/de-para";

/**
 * Ações da tela "Produtos da nota". O destino é `products`, o catálogo único
 * do estoque (decisão de 24/11/2026) — o mesmo que a pecuária e a aprovação
 * de NF-e da controladoria já usam. Regras de casa:
 * - Toda leitura e escrita filtra por client_id do contexto: a conta demo é
 *   admin e a RLS sozinha não a isola.
 * - O texto normalizado (chave do apelido) é recalculado AQUI a partir da
 *   descrição; o navegador nunca manda a chave pronta.
 * - Produto existente de outra tela nunca é alterado aqui; só se cria produto
 *   novo, com as colunas que a aprovação de NF-e já grava (name, ncm, unit,
 *   active, notes) mais a categoria.
 */

const ROTA = "/gestao/notas/produtos";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ErroPg = { code?: string; message?: string } | null;
const duplicada = (e: ErroPg) => !!e && (e.code === "23505" || /duplicate key/i.test(e.message ?? ""));
const violouCheck = (e: ErroPg) => !!e && (e.code === "23514" || /check constraint/i.test(e.message ?? ""));
const codigoErro = (e: ErroPg) => (tabelaAusente(e) ? "ativacao" : "falha");

function campo(fd: FormData, nome: string, max: number): string {
  const v = fd.get(nome);
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function voltar(params: Record<string, string>): never {
  redirect(`${ROTA}?${new URLSearchParams(params).toString()}`);
}

type ItemForm = {
  descricao: string; texto: string; fornecedorDoc: string | null; ncm: string | null; gtin: string | null;
  /** Unidade do item na nota (uCom): de onde o fator converte. */
  unidadeNota: string | null;
};

function lerItem(fd: FormData): ItemForm | null {
  const descricao = campo(fd, "descricao", 300);
  const texto = normalizarTexto(descricao);
  if (!texto || texto.length > 300) return null;
  return {
    descricao,
    texto,
    fornecedorDoc: normalizarDoc(campo(fd, "fornecedor_doc", 20)),
    ncm: normalizarNcm(campo(fd, "ncm", 12)),
    gtin: gtinValido(campo(fd, "gtin", 20)),
    unidadeNota: campo(fd, "unidade_nota", 10).toUpperCase() || null,
  };
}

/**
 * Fator digitado: "20", "0,5", "1.000" (milhar BR), "0.001". Vazio → undefined
 * (o servidor sugere); inválido → null (erro para o usuário).
 */
function lerFator(fd: FormData): number | null | undefined {
  let s = campo(fd, "fator", 20).replace(/\s/g, "");
  if (!s) return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null;
  return Math.round(n * 1e6) / 1e6;
}

type Gravacao = { ok: true; id: string } | { ok: false; erro: string };

/**
 * Grava (ou repõe) o apelido texto+fornecedor → product, com a conversão de
 * unidade. Se o produtor já tinha ligado esse texto a outro produto, a
 * escolha nova vale.
 */
async function gravarApelido(ctx: GestaoContexto, productId: string, item: ItemForm, fator: number | null): Promise<Gravacao> {
  const buscar = () => {
    const q = ctx.supabase
      .from("produto_apelidos")
      .select("id")
      .eq("client_id", ctx.clientId)
      .eq("texto_normalizado", item.texto);
    return (item.fornecedorDoc ? q.eq("fornecedor_doc", item.fornecedorDoc) : q.is("fornecedor_doc", null)).maybeSingle();
  };
  const dados = {
    product_id: productId, texto_original: item.descricao, ncm: item.ncm, gtin: item.gtin,
    // Fator sem a unidade de origem não serve ao estoque: os dois andam juntos.
    unidade_nota: fator !== null ? item.unidadeNota : null,
    fator_conversao: item.unidadeNota ? fator : null,
  };
  const atualizar = async (id: string): Promise<Gravacao> => {
    const { error } = await ctx.supabase.from("produto_apelidos").update(dados).eq("id", id).eq("client_id", ctx.clientId);
    return error ? { ok: false, erro: codigoErro(error) } : { ok: true, id };
  };

  const atual = await buscar();
  if (atual.error) return { ok: false, erro: codigoErro(atual.error) };
  if (atual.data) return atualizar(String(atual.data.id));

  const novo = await ctx.supabase
    .from("produto_apelidos")
    .insert({ client_id: ctx.clientId, texto_normalizado: item.texto, fornecedor_doc: item.fornecedorDoc, ...dados })
    .select("id")
    .single();
  if (!novo.error && novo.data) return { ok: true, id: String(novo.data.id) };
  if (duplicada(novo.error)) {
    // Corrida com outro clique: o apelido acabou de nascer; vale a escolha desta ação.
    const deNovo = await buscar();
    if (deNovo.data) return atualizar(String(deNovo.data.id));
  }
  return { ok: false, erro: codigoErro(novo.error) };
}

/** Confirmar a sugestão ou escolher outro produto do catálogo. */
export async function ligarProduto(fd: FormData) {
  const ctx = await contextoGestao();
  const productId = campo(fd, "produto_id", 60);
  const item = lerItem(fd);
  const fatorInformado = lerFator(fd);
  if (!item || !UUID.test(productId)) voltar({ erro: "dados" });
  if (fatorInformado === null) voltar({ erro: "fator" });

  const { data: produto, error } = await ctx.supabase
    .from("products")
    .select("id, unit")
    .eq("id", productId)
    .eq("client_id", ctx.clientId)
    .maybeSingle();
  if (error) voltar({ erro: codigoErro(error) });
  if (!produto) voltar({ erro: "produto" });

  const fator = fatorInformado ?? fatorParaProduto({ descricao: item.descricao, unidade: item.unidadeNota }, produto.unit as string | null);
  const r = await gravarApelido(ctx, String(produto.id), item, fator);
  if (!r.ok) voltar({ erro: r.erro });

  revalidatePath(ROTA);
  voltar({ aviso: "ligado", apelido: r.id });
}

/**
 * Criar o produto no catálogo e já ligar o item. Se já existe produto ATIVO
 * do cliente com o mesmo nome (sem caixa nem acento), liga nele em vez de
 * criar outro — duplicar produto é justamente o que esta tela existe para
 * evitar.
 */
export async function criarProdutoELigar(fd: FormData) {
  const ctx = await contextoGestao();
  const item = lerItem(fd);
  const nome = campo(fd, "nome", 120);
  const categoria = campo(fd, "categoria", 20);
  const unidade = campo(fd, "unidade", 10).toUpperCase() || null;
  const fatorInformado = lerFator(fd);
  if (!item) voltar({ erro: "dados" });
  if (nome.length < 2) voltar({ erro: "nome" });
  if (!ehCategoria(categoria)) voltar({ erro: "categoria" });
  if (fatorInformado === null) voltar({ erro: "fator" });

  const { data: existentes, error: erroLista } = await ctx.supabase
    .from("products")
    .select("id, name, unit")
    .eq("client_id", ctx.clientId)
    .eq("active", true)
    .limit(5000);
  if (erroLista) voltar({ erro: codigoErro(erroLista) });

  const igual = (existentes ?? []).find((p) => mesmoNome(String(p.name ?? ""), nome));
  let productId: string | null = igual ? String(igual.id) : null;
  let criado = false;
  // Ligando num produto que já existia, a conversão é para a unidade DELE.
  const unidadeDestino = igual ? ((igual.unit as string | null) ?? null) : unidade;
  const fator = fatorInformado ?? fatorParaProduto({ descricao: item.descricao, unidade: item.unidadeNota }, unidadeDestino);

  if (!productId) {
    const base = {
      client_id: ctx.clientId,
      name: nome,
      unit: unidade,
      ncm: item.ncm,
      active: true,
      notes: `Criado no portal Gestão a partir do item de nota "${item.descricao.slice(0, 200)}".`,
    };
    // `products` nasceu fora das migrations: se houver CHECK de categoria que
    // não conheça o valor (ex.: "diesel"), tenta "outro" e depois sem categoria,
    // em vez de travar o produtor.
    let erroNovo: ErroPg = null;
    for (const cat of [categoria, "outro", null]) {
      const { data: novo, error } = await ctx.supabase
        .from("products")
        .insert({ ...base, category: cat })
        .select("id")
        .single();
      if (novo && !error) {
        productId = String(novo.id);
        criado = true;
        break;
      }
      erroNovo = error;
      if (!violouCheck(error)) break;
    }
    if (!productId) voltar({ erro: codigoErro(erroNovo) });
  }

  const r = await gravarApelido(ctx, productId, item, fator);
  if (!r.ok) {
    // Produto recém-criado sem nenhum apelido não ajuda ninguém: desfaz.
    if (criado) await ctx.supabase.from("products").delete().eq("id", productId).eq("client_id", ctx.clientId);
    voltar({ erro: r.erro });
  }

  revalidatePath(ROTA);
  voltar({ aviso: criado ? "criado" : "ligado", apelido: r.id });
}

/** Desfaz uma ligação: o item volta para a lista de pendentes. O produto fica. */
export async function desligarApelido(fd: FormData) {
  const ctx = await contextoGestao();
  const id = campo(fd, "id", 60);
  if (!UUID.test(id)) voltar({ erro: "nao-encontrado" });

  const { data, error } = await ctx.supabase
    .from("produto_apelidos")
    .delete()
    .eq("id", id)
    .eq("client_id", ctx.clientId)
    .select("id");
  if (error) voltar({ erro: codigoErro(error) });
  if (!data || data.length === 0) voltar({ erro: "nao-encontrado" });

  revalidatePath(ROTA);
  voltar({ aviso: "desfeito" });
}
