"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { ATIVIDADES, CENTRO_TIPO_NOME, type CentroTipo } from "@/lib/gestao/atividades";

const TIPOS = Object.keys(CENTRO_TIPO_NOME) as CentroTipo[];

function texto(fd: FormData, chave: string): string {
  const v = fd.get(chave);
  return typeof v === "string" ? v.trim() : "";
}

/** "1.250,5" ou "1250.5" → número; vazio → null; inválido → NaN. */
function numero(bruto: string): number | null {
  if (!bruto) return null;
  const limpo = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(bruto) ? bruto.replace(/\./g, "") : bruto;
  return /^\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : Number.NaN;
}

function volta(erro: string): never {
  redirect(`/gestao/atividades?erro=${encodeURIComponent(erro)}#novo`);
}

export async function criarCentro(formData: FormData) {
  const ctx = await contextoGestao();

  const ativ = ATIVIDADES.find((a) => a.codigo === texto(formData, "atividade"));
  if (!ativ) volta("Escolha uma atividade.");

  const nome = texto(formData, "nome");
  if (nome.length < 2 || nome.length > 80) volta("Dê um nome ao centro, de 2 a 80 letras.");

  const tipoBruto = texto(formData, "tipo");
  const tipo = (TIPOS as string[]).includes(tipoBruto) ? (tipoBruto as CentroTipo) : ativ.centroPadrao;

  const cultura = texto(formData, "cultura").slice(0, 60) || null;

  let safra: string | null = null;
  let areaHa: number | null = null;
  let cabecas: number | null = null;

  if (ativ.setor === "agricultura") {
    safra = texto(formData, "safra") || null;
    if (safra && !/^\d{4}\/\d{2}$/.test(safra)) volta("Safra no formato 2026/27.");
    areaHa = numero(texto(formData, "area_ha"));
    if (areaHa !== null && (Number.isNaN(areaHa) || areaHa <= 0 || areaHa > 9_999_999)) volta("Área em hectares inválida.");
  } else if (ativ.setor === "pecuaria") {
    const c = numero(texto(formData, "cabecas"));
    if (c !== null && (Number.isNaN(c) || !Number.isInteger(c) || c < 0 || c > 10_000_000)) {
      volta("Número de cabeças inválido (use número inteiro).");
    }
    cabecas = c;
  }

  const { error } = await ctx.supabase.from("centros_custo").insert({
    client_id: ctx.clientId,
    nome,
    tipo,
    atividade: ativ.codigo,
    cultura,
    safra,
    area_ha: areaHa,
    cabecas,
  });

  if (error) {
    if (tabelaAusente(error)) volta("Centros de custo estão em ativação. Tente de novo em instantes.");
    volta("Não foi possível salvar. Confira os campos e tente de novo.");
  }

  revalidatePath("/gestao/atividades");
  redirect("/gestao/atividades?ok=1");
}
