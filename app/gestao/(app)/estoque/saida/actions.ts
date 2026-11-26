"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO } from "@/lib/gestao/format";
import { ehTipoSaida, EXIGE, lerQuantidade } from "@/lib/gestao/estoque";

/**
 * Saída do estoque e ajuste pela conferência do tanque. Toda gravação é uma
 * função da migration 181 (custo médio, baixa proporcional, auditoria);
 * aqui só validação de forma e mensagens. Abastecimento de máquina NÃO sai
 * por aqui: é registrado em Máquinas e diesel, que gera a saída do tanque —
 * assim o consumo por máquina e o estoque contam o mesmo litro.
 */

export type EstadoSaida = {
  ok?: string;
  erro?: string;
  /** Saldo insuficiente: a tela oferece "registrar mesmo assim" com motivo. */
  semSaldo?: number;
  valores?: Record<string, string>;
  versao: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS = ["produto_id", "almoxarifado_id", "quantidade", "tipo", "maquina_id", "centro_id", "data", "motivo"];
const texto = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const EM_ATIVACAO = "O estoque ainda está sendo ligado à sua conta. Tente de novo em instantes.";

function dataValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export async function registrarSaida(prev: EstadoSaida, fd: FormData): Promise<EstadoSaida> {
  const versao = prev.versao + 1;
  const valores = Object.fromEntries(CAMPOS.map((k) => [k, texto(fd, k)]));
  const falha = (erro: string, semSaldo?: number): EstadoSaida => ({ erro, semSaldo, valores, versao });

  if (!UUID.test(valores.produto_id)) return falha("Escolha o produto.");
  const almox = valores.almoxarifado_id && valores.almoxarifado_id !== "sem" ? valores.almoxarifado_id : null;
  if (almox && !UUID.test(almox)) return falha("Almoxarifado inválido.");
  const quantidade = lerQuantidade(valores.quantidade);
  if (quantidade === null || quantidade <= 0) return falha("Informe a quantidade (maior que zero).");
  if (!ehTipoSaida(valores.tipo) || valores.tipo === "abastecimento") return falha("Escolha o tipo de saída.");
  const exige = EXIGE[valores.tipo];
  const maquina = valores.maquina_id || null;
  const centro = valores.centro_id || null;
  if ((maquina && !UUID.test(maquina)) || (centro && !UUID.test(centro))) return falha("Destino inválido.");
  if (exige.maquina && !maquina) return falha("Manutenção pede a máquina.");
  if (exige.centro && !centro) return falha("Aplicação e consumo pedem o centro de custo (talhão, lote, estrutura).");
  const motivo = valores.motivo || null;
  if (exige.motivo && (!motivo || motivo.length < 3)) return falha("Ajuste de inventário pede o motivo (ex.: contagem do mês, vencido, quebra).");
  const hoje = hojeISO();
  const data = valores.data || hoje;
  if (!dataValida(data) || data > hoje) return falha("Data inválida (não pode ser no futuro).");
  const forcar = fd.get("forcar") === "1";
  if (forcar && (!motivo || motivo.length < 3)) return falha("Para registrar sem saldo, diga o motivo (ex.: nota ainda não lançada).", prev.semSaldo);

  const { supabase, clientId } = await contextoGestao();
  const { data: r, error } = await supabase.rpc("registrar_saida_estoque", {
    p_cliente: clientId,
    p_produto: valores.produto_id,
    p_almoxarifado: almox,
    p_quantidade: quantidade,
    p_destino_tipo: valores.tipo,
    p_maquina: maquina,
    p_centro: centro,
    p_data: data,
    p_motivo: motivo,
    p_permitir_negativo: forcar,
  });
  if (error) {
    if (/saldo_insuficiente/.test(error.message ?? "")) {
      const saldo = Number(error.details);
      return falha(
        `Saldo insuficiente: há ${Number.isFinite(saldo) ? saldo.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : "pouco"} no almoxarifado. Confira a quantidade — ou, se a nota ainda não foi lançada, registre mesmo assim com o motivo.`,
        Number.isFinite(saldo) ? saldo : 0,
      );
    }
    if (tabelaAusente(error) || error.code === "PGRST202") return falha(EM_ATIVACAO);
    if (error.code === "22023" || error.code === "P0002") return falha((error.message ?? "").charAt(0).toUpperCase() + (error.message ?? "").slice(1) + ".");
    console.error("[gestao/estoque/saida]", error.code, error.message);
    return falha("Não foi possível registrar a saída. Nada foi gravado; tente de novo.");
  }

  const res = (r ?? {}) as { custo_total?: number | null; ficou_negativo?: boolean };
  revalidatePath("/gestao/estoque", "layout");
  return {
    ok: `Saída registrada${data !== hoje ? ` em ${dataBR(data)}` : ""}.${res.custo_total != null ? ` Custo: ${brl(res.custo_total)}.` : ""}${res.ficou_negativo ? " O saldo ficou negativo: lance a nota que falta." : ""}`,
    // Mantém produto, almoxarifado, tipo e destino para a próxima do dia.
    valores: { produto_id: valores.produto_id, almoxarifado_id: valores.almoxarifado_id, tipo: valores.tipo, maquina_id: valores.maquina_id, centro_id: valores.centro_id, data: data === hoje ? "" : data },
    versao,
  };
}

/**
 * Conferência do tanque: a contagem da régua vira ajuste. A diferença é
 * recalculada AQUI pelo saldo atual (o navegador só manda a contagem).
 */
export async function lancarAjusteConferencia(fd: FormData) {
  const produto = texto(fd, "produto_id", 60);
  const almox = texto(fd, "almoxarifado_id", 60);
  const contagem = lerQuantidade(texto(fd, "contagem", 30));
  const motivo = texto(fd, "motivo");
  const base = `/gestao/estoque/tanque`;
  if (!UUID.test(produto) || !UUID.test(almox) || contagem === null || contagem < 0) redirect(`${base}?erro=dados`);
  if (motivo.length < 3) redirect(`${base}?erro=motivo`);

  const { supabase, clientId } = await contextoGestao();
  const { data: lotes, error: eLotes } = await supabase.from("stock_batches").select("quantity_available")
    .eq("client_id", clientId).eq("product_id", produto).eq("almoxarifado_id", almox);
  if (eLotes) redirect(`${base}?erro=${tabelaAusente(eLotes) ? "ativacao" : "falha"}`);
  const saldo = Math.round((lotes ?? []).reduce((s, l) => s + Number(l.quantity_available ?? 0), 0) * 1e6) / 1e6;
  const diferenca = Math.round((contagem - saldo) * 1e6) / 1e6;
  if (diferenca === 0) redirect(`${base}?aviso=sem-diferenca`);

  const { error } = diferenca < 0
    ? await supabase.rpc("registrar_saida_estoque", {
        p_cliente: clientId, p_produto: produto, p_almoxarifado: almox, p_quantidade: -diferenca,
        p_destino_tipo: "ajuste", p_motivo: motivo,
      })
    : await supabase.rpc("registrar_entrada_avulsa", {
        p_cliente: clientId, p_produto: produto, p_almoxarifado: almox, p_quantidade: diferenca, p_motivo: motivo,
      });
  if (error) {
    console.error("[gestao/estoque/tanque] ajuste:", error.code, error.message);
    redirect(`${base}?erro=${tabelaAusente(error) || error.code === "PGRST202" ? "ativacao" : /saldo_insuficiente/.test(error.message ?? "") ? "saldo" : "falha"}`);
  }
  revalidatePath("/gestao/estoque", "layout");
  redirect(`${base}?aviso=ajustado&dif=${encodeURIComponent(String(diferenca))}`);
}
