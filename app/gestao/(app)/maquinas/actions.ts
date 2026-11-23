"use server";

import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { hojeISO } from "@/lib/gestao/format";
import { avisoDeLeitura, lerNumero } from "@/lib/gestao/diesel";
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

  const { error } = await supabase.from("abastecimentos").insert({
    client_id: clientId,
    maquina_id: maquinaId,
    data,
    litros,
    preco_litro: preco,
    medidor_leitura: leitura,
    operador,
    centro_custo_id: centroId,
    origem: "manual",
  });
  if (error) return falha(tabelaAusente(error) ? EM_ATIVACAO : "Não foi possível salvar o abastecimento. Tente de novo.");

  revalidatePath("/gestao/maquinas");
  revalidatePath(`/gestao/maquinas/${maquinaId}`);
  return {
    ok: "Abastecimento registrado.",
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
