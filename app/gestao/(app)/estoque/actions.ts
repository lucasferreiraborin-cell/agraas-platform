"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { categoriaPorNcm, gtinValido, normalizarNcm } from "@/lib/gestao/de-para";
import { lerQuantidade, normalizarNomeCategoria, TIPOS_CATEGORIA, validarNomeCategoria, type TipoCategoria } from "@/lib/gestao/estoque";

/**
 * Cadastros do estoque: produto, almoxarifado e categoria gerencial.
 * Regras de casa: contextoGestao() + client_id explícito em toda leitura e
 * escrita (a conta demo é admin); a RLS e o trigger da 181 conferem de novo
 * que as referências são do mesmo cliente.
 */

export type EstadoCadastro = {
  ok?: string;
  erro?: string;
  valores?: Record<string, string>;
  versao: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EM_ATIVACAO = "O estoque ainda está sendo ligado à sua conta. Tente de novo em instantes.";
type ErroPg = { code?: string; message?: string } | null;
const duplicada = (e: ErroPg) => !!e && (e.code === "23505" || /duplicate key/i.test(e.message ?? ""));

const texto = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const valoresDe = (fd: FormData, chaves: string[]) => Object.fromEntries(chaves.map((k) => [k, texto(fd, k, 300)]));

function revalidarEstoque() {
  revalidatePath("/gestao/estoque");
  revalidatePath("/gestao/estoque", "layout"); // e todas as abas abaixo
}

// ── Produto ──────────────────────────────────────────────────────────────────

const CAMPOS_PRODUTO = ["id", "nome", "unidade", "categoria_id", "ncm", "almoxarifado_id", "minimo", "maximo", "gtin", "ativo"];

export async function salvarProduto(prev: EstadoCadastro, fd: FormData): Promise<EstadoCadastro> {
  const versao = prev.versao + 1;
  const valores = valoresDe(fd, CAMPOS_PRODUTO);
  const falha = (erro: string): EstadoCadastro => ({ erro, valores, versao });

  const id = valores.id;
  if (id && !UUID.test(id)) return falha("Produto inválido. Atualize a página.");
  const nome = valores.nome.slice(0, 120);
  if (nome.length < 2) return falha("Dê um nome ao produto (ex.: Óleo diesel S10).");
  const unidade = valores.unidade.toUpperCase().slice(0, 10);
  if (!unidade) return falha("Informe a unidade em que o produto é controlado (L, KG, UN...).");
  if (!UUID.test(valores.categoria_id)) return falha("Escolha a categoria. Sem categoria o gasto não aparece nos relatórios.");
  const ncm = valores.ncm ? normalizarNcm(valores.ncm) : null;
  if (valores.ncm && !ncm) return falha("NCM tem 8 dígitos (ex.: 2710.19.21). Deixe em branco se não souber.");
  const almox = valores.almoxarifado_id || null;
  if (almox && !UUID.test(almox)) return falha("Almoxarifado inválido.");
  const minimo = valores.minimo ? lerQuantidade(valores.minimo) : null;
  const maximo = valores.maximo ? lerQuantidade(valores.maximo) : null;
  if (valores.minimo && (minimo === null || minimo < 0)) return falha("Estoque mínimo inválido.");
  if (valores.maximo && (maximo === null || maximo <= 0)) return falha("Estoque máximo inválido.");
  if (minimo !== null && maximo !== null && maximo < minimo) return falha("O máximo não pode ser menor que o mínimo.");
  const gtin = valores.gtin ? gtinValido(valores.gtin.replace(/\D/g, "")) : null;
  if (valores.gtin && !gtin) return falha("Código de barras inválido (confira os dígitos). Deixe em branco se não tiver.");
  const ativo = id ? valores.ativo !== "0" : true;

  const { supabase, clientId } = await contextoGestao();

  const [cat, alm, existentes] = await Promise.all([
    supabase.from("categorias_gerenciais").select("id").eq("id", valores.categoria_id).eq("client_id", clientId).eq("ativo", true).maybeSingle(),
    almox
      ? supabase.from("almoxarifados").select("id").eq("id", almox).eq("client_id", clientId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("products").select("id, name").eq("client_id", clientId).eq("active", true).limit(5000),
  ]);
  if (cat.error) return falha(tabelaAusente(cat.error) ? EM_ATIVACAO : "Não foi possível conferir a categoria. Tente de novo.");
  if (!cat.data) return falha("Categoria não encontrada.");
  if (almox && !alm.data) return falha("Almoxarifado não encontrado.");
  const chave = normalizarNomeCategoria(nome);
  if ((existentes.data ?? []).some((p) => String(p.id) !== id && normalizarNomeCategoria(String(p.name ?? "")) === chave)) {
    return falha(`Já existe um produto ativo chamado "${nome}".`);
  }

  const dados = {
    name: nome,
    unit: unidade,
    ncm,
    categoria_gerencial_id: valores.categoria_id,
    almoxarifado_padrao_id: almox,
    estoque_minimo: minimo,
    estoque_maximo: maximo,
    gtin,
    active: ativo,
  };

  if (id) {
    const { data, error } = await supabase.from("products").update(dados).eq("id", id).eq("client_id", clientId).select("id");
    if (error) return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível salvar o produto. Tente de novo.");
    if (!data || data.length === 0) return falha("Produto não encontrado.");
    revalidarEstoque();
    return { ok: `${nome} salvo.`, valores, versao };
  }

  const { error } = await supabase.from("products").insert({
    ...dados,
    client_id: clientId,
    // Categoria do catálogo da plataforma (sanitário, aplicações), pelo NCM.
    category: categoriaPorNcm(ncm)?.categoria ?? null,
    notes: "Criado no estoque do Agraas Gestão.",
  });
  if (error) return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível cadastrar o produto. Tente de novo.");
  revalidarEstoque();
  return { ok: `${nome} cadastrado.`, versao };
}

// ── Almoxarifado ─────────────────────────────────────────────────────────────

const TIPOS_ALMOX = ["geral", "combustivel", "pecas", "insumos"];

export async function salvarAlmoxarifado(prev: EstadoCadastro, fd: FormData): Promise<EstadoCadastro> {
  const versao = prev.versao + 1;
  const valores = valoresDe(fd, ["id", "nome", "tipo", "capacidade", "ativo"]);
  const falha = (erro: string): EstadoCadastro => ({ erro, valores, versao });

  const id = valores.id;
  if (id && !UUID.test(id)) return falha("Almoxarifado inválido. Atualize a página.");
  const nome = valores.nome.slice(0, 60);
  if (nome.length < 2) return falha("Dê um nome ao almoxarifado (ex.: Tanque de diesel, Peças).");
  if (!TIPOS_ALMOX.includes(valores.tipo)) return falha("Escolha o tipo.");
  let capacidade: number | null = null;
  if (valores.tipo === "combustivel" && valores.capacidade) {
    capacidade = lerQuantidade(valores.capacidade);
    if (capacidade === null || capacidade <= 0 || capacidade > 10_000_000) return falha("Capacidade inválida (em litros).");
  }
  const ativo = id ? valores.ativo !== "0" : true;

  const { supabase, clientId } = await contextoGestao();
  const { data: todos, error: eLista } = await supabase.from("almoxarifados").select("id, nome").eq("client_id", clientId);
  if (eLista) return falha(tabelaAusente(eLista) ? EM_ATIVACAO : "Não foi possível conferir os almoxarifados. Tente de novo.");
  const chave = normalizarNomeCategoria(nome);
  if ((todos ?? []).some((a) => String(a.id) !== id && normalizarNomeCategoria(String(a.nome)) === chave)) {
    return falha(`Já existe um almoxarifado chamado "${nome}".`);
  }

  const dados = { nome, tipo: valores.tipo, capacidade_litros: capacidade, ativo };
  const { data, error } = id
    ? await supabase.from("almoxarifados").update(dados).eq("id", id).eq("client_id", clientId).select("id")
    : await supabase.from("almoxarifados").insert({ ...dados, client_id: clientId }).select("id");
  if (error) {
    if (duplicada(error)) return falha(`Já existe um almoxarifado chamado "${nome}".`);
    return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível salvar o almoxarifado. Tente de novo.");
  }
  if (!data || data.length === 0) return falha("Almoxarifado não encontrado.");
  revalidarEstoque();
  return id ? { ok: `${nome} salvo.`, valores, versao } : { ok: `${nome} cadastrado.`, versao };
}

// ── Categoria gerencial ──────────────────────────────────────────────────────

export async function salvarCategoria(prev: EstadoCadastro, fd: FormData): Promise<EstadoCadastro> {
  const versao = prev.versao + 1;
  const valores = valoresDe(fd, ["id", "grupo", "nome", "tipo", "conta_id", "ativo"]);
  const falha = (erro: string): EstadoCadastro => ({ erro, valores, versao });

  const id = valores.id;
  if (id && !UUID.test(id)) return falha("Categoria inválida. Atualize a página.");
  const erroNome = validarNomeCategoria(valores.nome, "nome") ?? validarNomeCategoria(valores.grupo, "grupo");
  if (erroNome) return falha(erroNome);
  if (!(TIPOS_CATEGORIA as string[]).includes(valores.tipo)) return falha("Escolha o tipo (despesa, receita...).");
  const conta = valores.conta_id || null;
  if (conta && !UUID.test(conta)) return falha("Conta contábil inválida.");
  const ativo = id ? valores.ativo !== "0" : true;

  const { supabase, clientId } = await contextoGestao();
  if (conta) {
    const { data: c } = await supabase.from("chart_of_accounts").select("id").eq("id", conta).eq("client_id", clientId).maybeSingle();
    if (!c) return falha("Conta contábil não encontrada no seu plano de contas.");
  }

  const dados = {
    grupo: valores.grupo.slice(0, 60),
    nome: valores.nome.slice(0, 60),
    tipo: valores.tipo as TipoCategoria,
    conta_contabil_id: conta,
    ativo,
  };
  const { data, error } = id
    ? await supabase.from("categorias_gerenciais").update(dados).eq("id", id).eq("client_id", clientId).select("id")
    : await supabase.from("categorias_gerenciais").insert({ ...dados, client_id: clientId, ordem: 9000 }).select("id");
  if (error) {
    if (duplicada(error)) return falha(`Já existe a categoria "${dados.nome}".`);
    if (error.code === "23514") return falha("Esse nome não serve como categoria. Use um nome que diga para onde vai o dinheiro.");
    return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível salvar a categoria. Tente de novo.");
  }
  if (!data || data.length === 0) return falha("Categoria não encontrada.");
  revalidarEstoque();
  return id ? { ok: `${dados.nome} salva.`, valores, versao } : { ok: `${dados.nome} criada.`, versao };
}

/** "Usar sugestão": cria as categorias da taxonomia que faltam (idempotente no banco). */
export async function usarSugestaoCategorias() {
  const { supabase, clientId } = await contextoGestao();
  const { data, error } = await supabase.rpc("semear_categorias_gerenciais", { p_client: clientId });
  if (error) {
    console.error("[gestao/estoque] semear categorias:", error.message);
    redirect(`/gestao/estoque/categorias?erro=${tabelaAusente(error) || error.code === "PGRST202" ? "ativacao" : "falha"}`);
  }
  revalidarEstoque();
  redirect(`/gestao/estoque/categorias?aviso=sugestao&n=${Number(data ?? 0)}`);
}
