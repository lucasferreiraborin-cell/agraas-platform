/**
 * Pacote do contador (CSV) — contas e abastecimentos de um mês.
 * GET ?mes=yyyy-mm · separador ";" · BOM UTF-8 · números com vírgula.
 * Leitura pela sessão do usuário (RLS) e sempre filtrada pelo client_id do contexto.
 */
import { NextRequest } from "next/server";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { atividade } from "@/lib/gestao/atividades";
import { dataBR, hojeISO, limitesDoMes } from "@/lib/gestao/format";
import { CSV_BOM, csvLinha, csvNumero, csvTexto, mesDaQuery, valorDiesel } from "@/lib/gestao/resultado";

export const dynamic = "force-dynamic";

type Titulo = {
  tipo: string; descricao: string; contraparte_nome: string | null; contraparte_doc: string | null;
  numero_parcela: string | null; valor: number | string; vencimento: string; status: string;
  data_baixa: string | null; valor_baixa: number | string | null; forma_pagamento: string | null;
  centro_custo_id: string | null; origem: string;
};
type Abast = {
  data: string; maquina_id: string; litros: number | string; preco_litro: number | string | null;
  medidor_leitura: number | string | null; operador: string | null; centro_custo_id: string | null; origem: string;
};

const STATUS: Record<string, string> = { aberto: "Em aberto", pago: "Pago", cancelado: "Cancelado" };
const TIPO: Record<string, string> = { pagar: "A pagar", receber: "A receber" };
const ORIGEM: Record<string, string> = { manual: "Manual", nfe: "Nota fiscal", planilha: "Planilha", tag: "Tag de abastecimento" };

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { supabase, clientId, clientName } = await contextoGestao();
  const mes = mesDaQuery(new URL(req.url).searchParams.get("mes") ?? undefined, hojeISO());
  const p = limitesDoMes(mes);

  const [titulosQ, abastQ, centrosQ, maquinasQ] = await Promise.all([
    supabase.from("titulos_financeiros")
      .select("tipo, descricao, contraparte_nome, contraparte_doc, numero_parcela, valor, vencimento, status, data_baixa, valor_baixa, forma_pagamento, centro_custo_id, origem")
      .eq("client_id", clientId)
      .or(`and(vencimento.gte.${p.inicio},vencimento.lte.${p.fim}),and(data_baixa.gte.${p.inicio},data_baixa.lte.${p.fim})`)
      .order("vencimento").limit(10000),
    supabase.from("abastecimentos")
      .select("data, maquina_id, litros, preco_litro, medidor_leitura, operador, centro_custo_id, origem")
      .eq("client_id", clientId).gte("data", p.inicio).lte("data", p.fim).order("data").limit(10000),
    supabase.from("centros_custo").select("id, nome, atividade").eq("client_id", clientId),
    supabase.from("maquinas").select("id, nome").eq("client_id", clientId),
  ]);

  const ausente = tabelaAusente(titulosQ.error) && tabelaAusente(abastQ.error);
  if (ausente) return new Response("Módulo em ativação.", { status: 503 });
  if ((titulosQ.error && !tabelaAusente(titulosQ.error)) || (abastQ.error && !tabelaAusente(abastQ.error))) {
    return new Response("Não foi possível gerar o pacote agora.", { status: 500 });
  }

  const titulos = (titulosQ.error ? [] : titulosQ.data ?? []) as unknown as Titulo[];
  const abast = (abastQ.error ? [] : abastQ.data ?? []) as unknown as Abast[];
  const centros = new Map(((centrosQ.error ? [] : centrosQ.data ?? []) as unknown as { id: string; nome: string; atividade: string }[])
    .map((c) => [c.id, c]));
  const maquinas = new Map(((maquinasQ.error ? [] : maquinasQ.data ?? []) as unknown as { id: string; nome: string }[])
    .map((m) => [m.id, m.nome]));

  const nomeCentro = (id: string | null) => (id ? centros.get(id)?.nome ?? "" : "");
  const nomeAtiv = (id: string | null) => (id && centros.get(id) ? atividade(centros.get(id)!.atividade).nome : "");

  const linhas: string[] = [];
  linhas.push(csvLinha([csvTexto(`Pacote do contador — ${clientName}`), `${dataBR(p.inicio)} a ${dataBR(p.fim)}`]));
  linhas.push("");
  linhas.push(csvLinha([csvTexto("CONTAS A PAGAR E A RECEBER")]));
  linhas.push(csvLinha([
    "Tipo", "Descrição", "Contraparte", "Documento", "Parcela", "Vencimento", "Valor", "Situação",
    "Data da baixa", "Valor da baixa", "Forma de pagamento", "Centro de custo", "Atividade", "Origem",
  ]));
  for (const t of titulos) {
    linhas.push(csvLinha([
      csvTexto(TIPO[t.tipo] ?? t.tipo), csvTexto(t.descricao), csvTexto(t.contraparte_nome), csvTexto(t.contraparte_doc),
      csvTexto(t.numero_parcela), dataBR(t.vencimento), csvNumero(t.valor), csvTexto(STATUS[t.status] ?? t.status),
      t.data_baixa ? dataBR(t.data_baixa) : "", csvNumero(t.valor_baixa), csvTexto(t.forma_pagamento),
      csvTexto(nomeCentro(t.centro_custo_id)), csvTexto(nomeAtiv(t.centro_custo_id)), csvTexto(ORIGEM[t.origem] ?? t.origem),
    ]));
  }
  linhas.push("");
  linhas.push(csvLinha([csvTexto("ABASTECIMENTOS DE DIESEL")]));
  linhas.push(csvLinha([
    "Data", "Máquina", "Litros", "Preço por litro", "Total", "Leitura do medidor", "Operador",
    "Centro de custo", "Atividade", "Origem",
  ]));
  for (const a of abast) {
    linhas.push(csvLinha([
      dataBR(a.data), csvTexto(maquinas.get(a.maquina_id) ?? ""), csvNumero(a.litros), csvNumero(a.preco_litro, 4),
      a.preco_litro != null ? csvNumero(valorDiesel(a)) : "", csvNumero(a.medidor_leitura, 1), csvTexto(a.operador),
      csvTexto(nomeCentro(a.centro_custo_id)), csvTexto(nomeAtiv(a.centro_custo_id)), csvTexto(ORIGEM[a.origem] ?? a.origem),
    ]));
  }

  return new Response(CSV_BOM + linhas.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agraas-pacote-contador-${mes.slice(0, 7)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
