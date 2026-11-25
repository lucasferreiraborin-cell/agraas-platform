"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import {
  ATIVIDADES_ESCOLHA, CENTROS_FIXOS, montarCentro, semDuplicados,
  type CentroNovo, type EntradaAtividade,
} from "@/lib/gestao/comecar";

export type EstadoPasso1 = {
  erro?: string;
  versao: number;
};

const texto = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

/** Passo 1: cria um centro de custo por atividade marcada + Administrativo e Máquinas e frota. */
export async function criarEstruturaInicial(prev: EstadoPasso1, fd: FormData): Promise<EstadoPasso1> {
  const versao = prev.versao + 1;
  const falha = (erro: string): EstadoPasso1 => ({ erro, versao });

  const marcadas = fd.getAll("atividade").filter((v): v is string => typeof v === "string");
  const unicas = [...new Set(marcadas)].filter((c) => ATIVIDADES_ESCOLHA.some((a) => a.codigo === c));
  if (unicas.length === 0) return falha("Marque pelo menos uma atividade para continuar.");

  const novos: CentroNovo[] = [];
  for (const codigo of unicas) {
    const entrada: EntradaAtividade = {
      codigo,
      nome: texto(fd, `nome_${codigo}`),
      cultura: texto(fd, `cultura_${codigo}`),
      cabecas: texto(fd, `cabecas_${codigo}`),
      area: texto(fd, `area_${codigo}`),
      safra: texto(fd, `safra_${codigo}`),
    };
    const r = montarCentro(entrada);
    if ("erro" in r) return falha(r.erro);
    novos.push(r.centro);
  }

  const ctx = await contextoGestao();

  const { data: existentes, error: eLer } = await ctx.supabase
    .from("centros_custo").select("nome").eq("client_id", ctx.clientId).limit(2000);
  if (eLer) {
    return falha(tabelaAusente(eLer)
      ? "Centros de custo estão em ativação. Tente de novo em instantes."
      : "Não foi possível conferir o que já existe. Tente de novo.");
  }

  const nomes = (existentes ?? []).map((r) => String((r as { nome: unknown }).nome ?? ""));
  const criar = semDuplicados([...novos, ...CENTROS_FIXOS], nomes);

  if (criar.length > 0) {
    const { error } = await ctx.supabase.from("centros_custo").insert(
      criar.map((c) => ({ client_id: ctx.clientId, ...c })),
    );
    if (error) {
      return falha(tabelaAusente(error)
        ? "Centros de custo estão em ativação. Tente de novo em instantes."
        : "Não foi possível salvar. Confira os campos e tente de novo.");
    }
  }

  revalidatePath("/gestao");
  revalidatePath("/gestao/atividades");
  revalidatePath("/gestao/comecar");
  redirect("/gestao/comecar?passo=2");
}
