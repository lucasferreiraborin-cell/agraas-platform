"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { hojeISO } from "@/lib/gestao/format";

const FORMAS = ["Pix", "Boleto", "Transferência", "Dinheiro", "Cartão"] as const;
const ROTA = "/gestao/financeiro";

export type EstadoNovo = {
  erro?: string;
  valores?: Record<string, string>;
};

function texto(fd: FormData, nome: string, max = 200): string {
  const v = fd.get(nome);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Aceita "1234.50" e "1.234,50". */
function parseValor(bruto: string): number | null {
  let s = bruto.replace(/\s|R\$/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 999_999_999) return null;
  return Math.round(n * 100) / 100;
}

function dataValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Soma `n` meses mantendo o dia (ou o último dia do mês, se não existir). */
function somaMeses(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = m - 1 + n;
  const ano = y + Math.floor(idx / 12);
  const mes = ((idx % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dia = Math.min(d, ultimo);
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só volta para dentro do próprio módulo. */
function destino(voltar: string, params: Record<string, string>): string {
  const base = voltar.startsWith(ROTA) && !voltar.startsWith("//") ? voltar : ROTA;
  const [caminho, qs = ""] = base.split("?");
  const sp = new URLSearchParams(qs);
  sp.delete("aviso");
  sp.delete("erro");
  for (const [k, v] of Object.entries(params)) sp.set(k, v);
  return `${caminho}?${sp.toString()}`;
}

export async function darBaixa(fd: FormData) {
  const ctx = await contextoGestao();
  const voltar = texto(fd, "voltar", 500);
  const id = texto(fd, "id", 60);
  const dataBaixa = texto(fd, "data_baixa", 10);
  const valorBaixa = parseValor(texto(fd, "valor_baixa", 30));
  const forma = texto(fd, "forma_pagamento", 30);

  if (!UUID.test(id)) redirect(destino(voltar, { erro: "nao-encontrado" }));
  if (!dataValida(dataBaixa) || dataBaixa > hojeISO()) redirect(destino(voltar, { erro: "data" }));
  if (valorBaixa === null) redirect(destino(voltar, { erro: "valor" }));
  if (!(FORMAS as readonly string[]).includes(forma)) redirect(destino(voltar, { erro: "forma" }));

  const { data, error } = await ctx.supabase
    .from("titulos_financeiros")
    .update({ status: "pago", data_baixa: dataBaixa, valor_baixa: valorBaixa, forma_pagamento: forma })
    .eq("id", id)
    .eq("client_id", ctx.clientId)
    .eq("status", "aberto")
    .select("id");

  if (error) redirect(destino(voltar, { erro: tabelaAusente(error) ? "ativacao" : "falha" }));
  if (!data || data.length === 0) redirect(destino(voltar, { erro: "nao-encontrado" }));

  revalidatePath(ROTA);
  revalidatePath("/gestao");
  redirect(destino(voltar, { aviso: "baixa" }));
}

export async function desfazerBaixa(fd: FormData) {
  const ctx = await contextoGestao();
  const voltar = texto(fd, "voltar", 500);
  const id = texto(fd, "id", 60);
  if (!UUID.test(id)) redirect(destino(voltar, { erro: "nao-encontrado" }));

  const { data, error } = await ctx.supabase
    .from("titulos_financeiros")
    .update({ status: "aberto", data_baixa: null, valor_baixa: null, forma_pagamento: null })
    .eq("id", id)
    .eq("client_id", ctx.clientId)
    .eq("status", "pago")
    .select("id");

  if (error) redirect(destino(voltar, { erro: tabelaAusente(error) ? "ativacao" : "falha" }));
  if (!data || data.length === 0) redirect(destino(voltar, { erro: "nao-encontrado" }));

  revalidatePath(ROTA);
  revalidatePath("/gestao");
  redirect(destino(voltar, { aviso: "desfeita" }));
}

export async function criarLancamento(_prev: EstadoNovo, fd: FormData): Promise<EstadoNovo> {
  const ctx = await contextoGestao();

  const valores = {
    tipo: texto(fd, "tipo", 10),
    descricao: texto(fd, "descricao", 160),
    contraparte: texto(fd, "contraparte", 120),
    valor: texto(fd, "valor", 30),
    vencimento: texto(fd, "vencimento", 10),
    parcelas: texto(fd, "parcelas", 3) || "1",
    centro: texto(fd, "centro", 60),
    notas: texto(fd, "notas", 500),
  };
  const falha = (erro: string): EstadoNovo => ({ erro, valores });

  if (valores.tipo !== "pagar" && valores.tipo !== "receber") return falha("Escolha se é conta a pagar ou a receber.");
  if (valores.descricao.length < 2) return falha("Descreva o lançamento em poucas palavras.");
  const total = parseValor(valores.valor);
  if (total === null) return falha("Informe um valor maior que zero.");
  if (!dataValida(valores.vencimento)) return falha("Informe uma data de vencimento válida.");
  const n = Number(valores.parcelas);
  if (!Number.isInteger(n) || n < 1 || n > 60) return falha("O número de parcelas deve ficar entre 1 e 60.");
  if (Math.round((total / n) * 100) < 1) return falha("O valor é pequeno demais para tantas parcelas.");

  let centroId: string | null = null;
  if (valores.centro) {
    if (!UUID.test(valores.centro)) return falha("Centro de custo inválido.");
    const { data: c, error: ec } = await ctx.supabase
      .from("centros_custo")
      .select("id")
      .eq("id", valores.centro)
      .eq("client_id", ctx.clientId)
      .maybeSingle();
    if (ec) return falha(tabelaAusente(ec) ? "O módulo ainda está em ativação. Tente em instantes." : "Não foi possível validar o centro de custo.");
    if (!c) return falha("Centro de custo não encontrado.");
    centroId = c.id as string;
  }

  // Divide em centavos; a última parcela absorve a diferença.
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / n);
  const linhas = Array.from({ length: n }, (_, i) => {
    const cent = i === n - 1 ? centavos - base * (n - 1) : base;
    return {
      client_id: ctx.clientId,
      tipo: valores.tipo,
      descricao: valores.descricao,
      contraparte_nome: valores.contraparte || null,
      numero_parcela: n > 1 ? `${i + 1}/${n}` : null,
      valor: cent / 100,
      vencimento: somaMeses(valores.vencimento, i),
      centro_custo_id: centroId,
      origem: "manual",
      notas: valores.notas || null,
    };
  });

  const { error } = await ctx.supabase.from("titulos_financeiros").insert(linhas);
  if (error) {
    return falha(tabelaAusente(error)
      ? "O módulo ainda está em ativação. Tente em instantes."
      : "Não foi possível salvar. Confira os dados e tente de novo.");
  }

  revalidatePath(ROTA);
  revalidatePath("/gestao");
  redirect(`${ROTA}?tipo=${valores.tipo}&aviso=criado&n=${n}`);
}
