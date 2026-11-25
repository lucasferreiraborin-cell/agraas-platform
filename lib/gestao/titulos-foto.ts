/**
 * Foto da nota → contas a pagar/receber (portal Gestão, 24/11/2026).
 *
 * A foto não traz o XML (<cobr>), então a regra é mais conservadora que a de
 * `titulos.ts`:
 *  - a IA leu o quadro FATURA/DUPLICATAS → cada duplicata válida (valor > 0 e
 *    vencimento real) vira um título "aberto", com aviso de conferência;
 *  - não leu, mas a nota tem valor total E data → nasce UM título "a
 *    conferir": vencimento provisório = data de emissão, nota explicando;
 *  - sem valor ou sem data → nenhum título. Vencimento não se inventa.
 * Nunca nasce "pago": "à vista" lido de foto não prova pagamento.
 *
 * `planejarTitulosDaFoto` é PURA (testada); `gravarTitulosDaFoto` NUNCA lança —
 * quem chama é a importação da nota, que não pode quebrar pelo financeiro.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { tabelaAusente } from "@/lib/gestao/contexto";
import { decidirDirecao } from "@/lib/fiscal/duplicatas";
import { dataIsoValida, docSemPontuacao } from "@/lib/fiscal/nota-foto";

export type DuplicataLida = { numero: string; vencimento: string; valor: number | null };

export type EntradaTitulosFoto = {
  clientId: string;
  /** id em fiscal_notes (fluxo legado). */
  fiscalNoteId: string | null;
  /** id em fiscal_invoices (fluxo canônico). */
  fiscalInvoiceId: string | null;
  numeroNota: string;
  /** yyyy-mm-dd ou "" */
  dataEmissao: string;
  valorTotal: number | null;
  emitente: { nome: string; doc: string };
  destinatario: { nome: string; doc: string };
  /** "0" entrada, "1" saída, "" ilegível — como marcado no DANFE. */
  tipoOperacao: string;
  duplicatas: DuplicataLida[];
  /** NCM dos itens (só dígitos). */
  ncms: string[];
  documentoCliente?: string | null;
};

export type LinhaTituloFoto = {
  client_id: string;
  tipo: "pagar" | "receber";
  descricao: string;
  contraparte_nome: string | null;
  contraparte_doc: string | null;
  numero_parcela: string | null;
  valor: number;
  vencimento: string;
  status: "aberto";
  fiscal_note_id: string | null;
  fiscal_invoice_id: string | null;
  origem: "nfe";
  natureza: "custo" | "estoque";
  notas: string;
};

export type PlanoTitulosFoto = {
  linhas: LinhaTituloFoto[];
  modo: "duplicatas" | "a_conferir" | "nenhum";
  motivo?: string;
};

const centavos = (v: number) => Math.round(v * 100) / 100;
const DIESEL = "27101921";

export function planejarTitulosDaFoto(e: EntradaTitulosFoto): PlanoTitulosFoto {
  // Sem vínculo com a nota não há chave de idempotência (mesma regra de titulos.ts).
  if (!e.fiscalNoteId && !e.fiscalInvoiceId) return { linhas: [], modo: "nenhum", motivo: "sem vínculo com a nota" };

  const dir = decidirDirecao({
    tpNF: e.tipoOperacao.trim() || null,
    documentoEmitente: e.emitente.doc,
    documentoDestinatario: e.destinatario.doc,
    documentoCliente: e.documentoCliente,
  });
  const outra = dir.papelCliente === "emitente" ? e.destinatario : e.emitente;
  const contraparteNome = outra.nome.trim() || null;
  const contraparteDoc = docSemPontuacao(outra.doc) || null;
  const base = [`NF-e${e.numeroNota ? ` ${e.numeroNota}` : ""}`, contraparteNome].filter(Boolean).join(" · ");

  // Mesma regra de titulos.ts: compra só de diesel é estoque (o custo entra no abastecimento).
  const soDiesel = e.ncms.length > 0 && e.ncms.every((n) => n.startsWith(DIESEL));
  const natureza: LinhaTituloFoto["natureza"] = dir.tipo === "pagar" && soDiesel ? "estoque" : "custo";
  const avisos: string[] = [];
  if (natureza === "custo" && dir.tipo === "pagar" && e.ncms.some((n) => n.startsWith(DIESEL))) {
    avisos.push("Nota com diesel e outros itens: o diesel pode contar duas vezes com os abastecimentos — confira.");
  }
  if (dir.confianca === "baixa") avisos.push(`Direção (${dir.tipo}) suposta: confira se é conta a pagar ou a receber.`);

  const comum = {
    client_id: e.clientId,
    tipo: dir.tipo,
    contraparte_nome: contraparteNome,
    contraparte_doc: contraparteDoc,
    status: "aberto" as const,
    fiscal_note_id: e.fiscalNoteId,
    fiscal_invoice_id: e.fiscalInvoiceId,
    origem: "nfe" as const,
    natureza,
  };

  // ── Duplicatas lidas ────────────────────────────────────────────────────
  const usados = new Set<string>();
  const parcelas: Array<{ numero: string; vencimento: string; valor: number }> = [];
  e.duplicatas.forEach((d, i) => {
    if (d.valor === null || !Number.isFinite(d.valor) || d.valor <= 0) return;
    if (!dataIsoValida(d.vencimento)) return;
    let numero = (d.numero ?? "").trim().slice(0, 20) || String(i + 1);
    // Número repetido quebraria a unicidade (nota, parcela) da 172.
    if (usados.has(numero)) {
      let k = 2;
      while (usados.has(`${numero}-${k}`)) k++;
      numero = `${numero}-${k}`;
    }
    usados.add(numero);
    parcelas.push({ numero, vencimento: d.vencimento, valor: centavos(d.valor) });
  });

  if (parcelas.length > 0) {
    parcelas.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }));
    const soma = centavos(parcelas.reduce((s, p) => s + p.valor, 0));
    const divergencia = e.valorTotal !== null && e.valorTotal > 0 && Math.abs(soma - e.valorTotal) > 0.01
      ? `Soma das parcelas lidas (${soma.toFixed(2)}) difere do total da nota (${e.valorTotal.toFixed(2)}).`
      : null;
    const linhas = parcelas.map<LinhaTituloFoto>((p, i, arr) => ({
      ...comum,
      descricao: arr.length > 1 ? `${base} · parcela ${p.numero}` : base,
      numero_parcela: p.numero,
      valor: p.valor,
      vencimento: p.vencimento,
      notas: [
        "Lido da foto do DANFE: confira valor e vencimento.",
        ...(i === arr.length - 1 && divergencia ? [divergencia] : []),
        ...avisos,
      ].join(" "),
    }));
    return { linhas, modo: "duplicatas" };
  }

  // ── Sem duplicatas: um título "a conferir", só com valor E data ────────
  if (e.valorTotal === null || !(e.valorTotal > 0)) return { linhas: [], modo: "nenhum", motivo: "foto sem valor total" };
  if (!dataIsoValida(e.dataEmissao)) return { linhas: [], modo: "nenhum", motivo: "foto sem data de emissão" };

  return {
    modo: "a_conferir",
    linhas: [{
      ...comum,
      descricao: `${base} · a conferir`,
      numero_parcela: null,
      valor: centavos(e.valorTotal),
      vencimento: e.dataEmissao,
      notas: [
        "A conferir: a foto não trouxe as parcelas. Vencimento provisório = data de emissão; ajuste o vencimento e a forma de pagamento.",
        ...avisos,
      ].join(" "),
    }],
  };
}

export type ResultadoGravacaoTitulos =
  | { ok: true; inseridos: number }
  | { ok: false; motivo: "tabela_ausente" | "erro"; detalhe?: string };

/** Grava as linhas planejadas. Nunca lança. Sem a migration 172 → 'tabela_ausente'. */
export async function gravarTitulosDaFoto(
  supabase: SupabaseClient,
  linhas: LinhaTituloFoto[],
): Promise<ResultadoGravacaoTitulos> {
  if (linhas.length === 0) return { ok: true, inseridos: 0 };
  try {
    const { error } = await supabase.from("titulos_financeiros").insert(linhas);
    if (!error) return { ok: true, inseridos: linhas.length };
    if (tabelaAusente(error)) return { ok: false, motivo: "tabela_ausente" };
    return { ok: false, motivo: "erro", detalhe: error.message };
  } catch (err) {
    return { ok: false, motivo: "erro", detalhe: err instanceof Error ? err.message : String(err) };
  }
}
