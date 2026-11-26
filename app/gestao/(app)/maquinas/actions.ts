"use server";

import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import { hojeISO } from "@/lib/gestao/format";
import { avisoDeLeitura, lerNumero } from "@/lib/gestao/diesel";
import { escolherDieselDoTanque, produtoEhDiesel } from "@/lib/gestao/estoque";
import { carregarComprasDiesel, TIPO_MAQUINA, UUID } from "./dados";

export type EstadoForm = {
  ok?: string;
  erro?: string;
  /** Aviso que o usuário pode confirmar reenviando. */
  aviso?: string;
  /** Valores devolvidos para o formulário não perder o que foi digitado. */
  valores?: Record<string, string>;
  versao: number;
};

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const valoresDe = (fd: FormData, chaves: string[]) => Object.fromEntries(chaves.map((k) => [k, texto(fd, k)]));
const EM_ATIVACAO = "Máquinas e diesel ainda estão sendo ligados à sua conta. Tente de novo em instantes.";

const CAMPOS_ABASTECIMENTO = ["maquina_id", "litros", "leitura", "centro_custo_id", "data", "operador"];

type Db = GestaoContexto["supabase"];

/**
 * Abastecimento → saída de diesel do tanque (estoque gerencial, migration 181).
 * Só acontece quando há produto diesel e tanque (almoxarifado de combustível)
 * cadastrados; sem isso — ou sem a 181 — o abastecimento vale como sempre.
 * Nunca derruba o registro: devolve só uma frase para a mensagem de sucesso.
 * Idempotente no banco (um abastecimento gera no máximo uma saída).
 */
async function saidaDoTanque(
  supabase: Db, clientId: string,
  ab: { id: string; maquinaId: string; centroId: string | null; litros: number; data: string },
): Promise<string> {
  try {
    const [prod, alm, cat] = await Promise.all([
      supabase.from("products").select("id, name, ncm, categoria_gerencial_id, almoxarifado_padrao_id").eq("client_id", clientId).eq("active", true).limit(3000),
      supabase.from("almoxarifados").select("id, tipo, ativo").eq("client_id", clientId),
      supabase.from("categorias_gerenciais").select("id, nome").eq("client_id", clientId),
    ]);
    if (prod.error || alm.error) return ""; // 181 ainda não aplicada (ou leitura falhou)
    const nomeCat = new Map(((cat.data ?? []) as Array<{ id: string; nome: string }>).map((c) => [c.id, c.nome]));
    const produtos = ((prod.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: String(p.id), nome: String(p.name ?? ""), ncm: (p.ncm as string | null) ?? null, ativo: true,
      categoriaNome: p.categoria_gerencial_id ? nomeCat.get(String(p.categoria_gerencial_id)) ?? null : null,
      almoxarifadoPadraoId: (p.almoxarifado_padrao_id as string | null) ?? null,
    }));
    const tanques = ((alm.data ?? []) as Array<Record<string, unknown>>).map((a) => ({ id: String(a.id), tipo: String(a.tipo), ativo: a.ativo !== false }));
    const diesel = produtos.filter(produtoEhDiesel);
    if (diesel.length === 0 || !tanques.some((t) => t.ativo && t.tipo === "combustivel")) return "";

    const { data: lotes } = await supabase.from("stock_batches").select("product_id, almoxarifado_id, quantity_available")
      .eq("client_id", clientId).in("product_id", diesel.map((d) => d.id));
    const saldo = (produtoId: string, almoxId: string) =>
      ((lotes ?? []) as Array<Record<string, unknown>>)
        .filter((l) => l.product_id === produtoId && l.almoxarifado_id === almoxId)
        .reduce((s, l) => s + Number(l.quantity_available ?? 0), 0);
    const escolha = escolherDieselDoTanque(diesel, tanques, saldo);
    if (!escolha) return "";

    const base = {
      p_cliente: clientId, p_produto: escolha.produtoId, p_almoxarifado: escolha.almoxarifadoId, p_quantidade: ab.litros,
      p_destino_tipo: "abastecimento", p_maquina: ab.maquinaId, p_centro: ab.centroId, p_data: ab.data,
      p_referencia_tabela: "abastecimentos", p_referencia_id: ab.id,
    };
    let { error } = await supabase.rpc("registrar_saida_estoque", base);
    if (error && /saldo_insuficiente/.test(error.message ?? "")) {
      // O litro já está no trator: registra e deixa o tanque negativo, com motivo, até a nota entrar.
      ({ error } = await supabase.rpc("registrar_saida_estoque", {
        ...base, p_permitir_negativo: true, p_motivo: "Abastecimento acima do saldo do tanque: falta lançar nota de diesel?",
      }));
      if (!error) return " O tanque ficou negativo no estoque: falta lançar alguma nota de diesel?";
    }
    if (error) {
      console.error("[gestao/maquinas] saída do tanque:", error.code, error.message);
      return "";
    }
    return " Descontado do tanque.";
  } catch (e) {
    console.error("[gestao/maquinas] saída do tanque:", e instanceof Error ? e.message : String(e));
    return "";
  }
}

export async function registrarAbastecimento(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const versao = prev.versao + 1;
  const valores = valoresDe(fd, CAMPOS_ABASTECIMENTO);
  const falha = (erro: string): EstadoForm => ({ erro, valores, versao });

  const maquinaId = valores.maquina_id;
  if (!UUID.test(maquinaId)) return falha("Escolha a máquina.");

  const litros = lerNumero(valores.litros);
  if (litros == null || litros <= 0) return falha("Informe os litros (maior que zero).");
  if (litros > 5000) return falha("Litros acima de 5.000 em um abastecimento. Confira o valor.");

  let leitura: number | null = null;
  if (valores.leitura) {
    leitura = lerNumero(valores.leitura);
    if (leitura == null || leitura < 0) return falha("Leitura do horímetro/odômetro inválida.");
  }

  const hoje = hojeISO();
  const data = valores.data || hoje;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) return falha("Data inválida.");
  if (data > hoje) return falha("A data não pode estar no futuro.");

  const operador = valores.operador.slice(0, 80) || null;
  let centroId: string | null = null;
  if (valores.centro_custo_id) {
    if (!UUID.test(valores.centro_custo_id)) return falha("Centro de custo inválido.");
    centroId = valores.centro_custo_id;
  }

  const { supabase, clientId } = await contextoGestao();

  const { data: maquina, error: eMaq } = await supabase
    .from("maquinas").select("id").eq("id", maquinaId).eq("client_id", clientId).maybeSingle();
  if (eMaq) return falha(tabelaAusente(eMaq) ? EM_ATIVACAO : "Não foi possível conferir a máquina. Tente de novo.");
  if (!maquina) return falha("Máquina não encontrada.");

  if (centroId) {
    const { data: centro } = await supabase
      .from("centros_custo").select("id").eq("id", centroId).eq("client_id", clientId).maybeSingle();
    if (!centro) return falha("Centro de custo não encontrado.");
  }

  // Leitura menor que a última da máquina: avisa e só grava se o usuário confirmar.
  if (leitura != null && fd.get("confirmar") !== "1") {
    const { data: ultima } = await supabase
      .from("abastecimentos")
      .select("medidor_leitura")
      .eq("client_id", clientId).eq("maquina_id", maquinaId)
      .not("medidor_leitura", "is", null)
      .lte("data", data)
      .order("data", { ascending: false }).order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    const aviso = avisoDeLeitura(ultima ? Number(ultima.medidor_leitura) : null, leitura);
    if (aviso) return { aviso, valores, versao };
  }

  // Preço do litro: média ponderada das notas de diesel, se houver. Sem nota, fica vazio.
  const { compras } = await carregarComprasDiesel(supabase, clientId);
  const litrosNotas = compras.reduce((s, c) => s + c.litros, 0);
  const preco = litrosNotas > 0
    ? Math.round((compras.reduce((s, c) => s + c.valor, 0) / litrosNotas) * 10000) / 10000
    : null;

  const { data: novo, error } = await supabase.from("abastecimentos").insert({
    client_id: clientId,
    maquina_id: maquinaId,
    data,
    litros,
    preco_litro: preco,
    medidor_leitura: leitura,
    operador,
    centro_custo_id: centroId,
    origem: "manual",
  }).select("id").single();
  if (error) return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível salvar o abastecimento. Tente de novo.");

  // Estoque gerencial: o mesmo litro sai do tanque (sem diesel/tanque cadastrado, nada muda).
  const tanque = novo ? await saidaDoTanque(supabase, clientId, { id: String(novo.id), maquinaId, centroId, litros, data }) : "";

  revalidatePath("/gestao/maquinas");
  revalidatePath(`/gestao/maquinas/${maquinaId}`);
  if (tanque) revalidatePath("/gestao/estoque", "layout");
  return {
    ok: `Abastecimento registrado.${tanque}`,
    // Mantém máquina, centro e data para o próximo registro do dia.
    valores: { maquina_id: maquinaId, centro_custo_id: centroId ?? "", data: data === hoje ? "" : data, operador: operador ?? "" },
    versao,
  };
}

const MEDIDORES = ["horimetro", "odometro"];

export async function criarMaquina(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const versao = prev.versao + 1;
  const valores = valoresDe(fd, ["nome", "tipo", "placa_ou_serie", "medidor"]);
  const falha = (erro: string): EstadoForm => ({ erro, valores, versao });

  if (valores.nome.length < 2) return falha("Dê um nome à máquina (ex.: Trator John Deere 6110).");
  if (valores.nome.length > 80) return falha("Nome longo demais (máximo 80 caracteres).");
  if (!(valores.tipo in TIPO_MAQUINA)) return falha("Escolha o tipo da máquina.");
  if (!MEDIDORES.includes(valores.medidor)) return falha("Escolha o tipo de medidor.");
  if (valores.placa_ou_serie.length > 40) return falha("Placa/série longa demais.");

  const { supabase, clientId } = await contextoGestao();

  const { data: existente, error: eDup } = await supabase
    .from("maquinas").select("id").eq("client_id", clientId).ilike("nome", valores.nome.replace(/[%_\\]/g, "\\$&")).limit(1);
  if (eDup) return falha(tabelaAusente(eDup) ? EM_ATIVACAO : "Não foi possível conferir a frota. Tente de novo.");
  if (existente && existente.length > 0) return falha("Já existe uma máquina com esse nome.");

  const { error } = await supabase.from("maquinas").insert({
    client_id: clientId,
    nome: valores.nome,
    tipo: valores.tipo,
    medidor: valores.medidor,
    placa_ou_serie: valores.placa_ou_serie || null,
  });
  if (error) return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível cadastrar a máquina. Tente de novo.");

  revalidatePath("/gestao/maquinas");
  return { ok: `${valores.nome} cadastrada.`, versao };
}
