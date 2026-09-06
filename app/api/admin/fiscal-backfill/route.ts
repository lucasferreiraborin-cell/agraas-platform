/**
 * Backfill fiscal (B0) — reprocessa o raw_xml já armazenado para preencher os
 * campos de ICMS criados pela migration 159.
 *
 * Contexto: o ETL da migration 139 copiou fiscal_notes -> fiscal_invoices, mas
 * DESCARTOU icms_aliquota e icms_valor porque a tabela de destino não tinha
 * colunas para recebê-los. O XML original sobreviveu em fiscal_invoices.raw_xml,
 * então o dado é recuperável por reparse — e o reparse traz mais do que o ETL
 * tinha: base, redução de base, desoneração, benefício e monofasia (CST 61).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REVISÃO ADVERSARIAL DE 05/09/2026 — quatro bloqueantes corrigidos aqui.
 * Esta rota escreve em tabela fiscal com retenção legal e NUNCA rodou ainda,
 * então as correções vieram antes de qualquer dado ser tocado.
 *
 *  1. As linhas existentes vieram de OUTRO parser (ou de PDF, áudio, digitação
 *     manual — ver o CHECK de `source` na 133). Descrição e unidade divergem
 *     por origem, não por erro. Chave que não casa NÃO é item novo: se sobrou
 *     linha existente na mesma nota, é ambiguidade e a nota é PULADA INTEIRA.
 *     Inserir ali criava linha duplicada com os vínculos numa e o fiscal noutra.
 *  2. O fingerprint de ambiguidade agora cobre TUDO que o UPDATE escreve.
 *     Antes omitia a monofasia própria (não-`_ret`), `product_code` e
 *     `sequence` — dois itens de diesel com ad rem diferente passavam como
 *     idênticos e o pareamento posicional trocava os valores.
 *  3. O SELECT das linhas existentes tem ORDER BY id. Sem ele a ordem do
 *     PostgreSQL é indefinida e `bucket[i]` variava entre execuções, gravando
 *     `sequence` e `product_code` na linha errada de forma irreproduzível.
 *  4. As contagens são incrementadas conforme o trabalho ACONTECE, não depois.
 *     Antes, um erro no meio do lote deixava linhas gravadas e reportava zero.
 *
 * Também: paginação com desempate por `id` (sem ele, `remaining: 0` certificava
 * conclusão tendo pulado notas), e o UPDATE OMITE campos nulos — parte do
 * `raw_xml` é PDF em base64 truncado, e um XML cortado devolveria null que
 * apagaria valor bom.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Segurança e reversibilidade:
 *  - Bearer token (BACKFILL_TRIGGER_TOKEN) — mesma disciplina do digest.
 *  - `dryRun=true` por padrão. Escrever exige `dryRun=false` explícito.
 *  - NUNCA deleta linha, NUNCA insere em nota com ambiguidade, e preserva
 *    linked_stock_batch_id / linked_animal_id / linked_application_id.
 *  - Idempotente: pula itens com fiscal_parsed_at preenchido, salvo `force=true`.
 *
 * Rodar em lotes: `?limit=100&offset=0`, avançando até `remaining` zerar.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { parseNfeItems, toInvoiceItemRow } from "@/lib/fiscal/nfe-parser";

export const runtime = "nodejs";
export const maxDuration = 300;

type ItemRow = ReturnType<typeof toInvoiceItemRow>;

type ExistingItem = {
  id: string;
  sequence: number | null;
  product_code: string | null;
  ncm: string | null;
  cfop: string | null;
  total_price: number | null;
  quantity: number | null;
  unit: string | null;
  description: string | null;
  fiscal_parsed_at: string | null;
};

type Pendencia = {
  invoice_id: string;
  motivo: string;
  existentes: number;
  no_xml: number;
  detalhe?: string;
};

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.BACKFILL_TRIGGER_TOKEN ?? "";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected) && token === expected;
}

/** Número de query string, com piso e teto. NaN e negativo caem no default. */
function intParam(raw: string | null, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Hash curto e estável de descrição de produto (djb2). Só para compor chave. */
function hashDesc(s: unknown): string {
  const norm = (s ?? "").toString().trim().toUpperCase().replace(/\s+/g, " ");
  let h = 5381;
  for (let i = 0; i < norm.length; i++) h = ((h << 5) + h + norm.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Chave de casamento entre item existente e item reparseado.
 *
 * Não usamos `sequence`: o ETL da 139 gerou a sequência com
 * ROW_NUMBER() OVER (ORDER BY fni.id) — ordem de UUID, que não corresponde à
 * ordem dos <det> no XML. Casar por sequência embaralharia os campos fiscais.
 */
function matchKey(
  ncm: unknown, cfop: unknown, total: unknown,
  qtd: unknown, unidade: unknown, descricao: unknown,
): string {
  const n = (ncm ?? "").toString().trim();
  const c = (cfop ?? "").toString().trim();
  const t = total == null ? "" : Number(total).toFixed(2);
  const q = qtd == null ? "" : Number(qtd).toFixed(4);
  const u = (unidade ?? "").toString().trim().toUpperCase();
  return `${n}|${c}|${t}|${q}|${u}|${hashDesc(descricao)}`;
}

/**
 * Assinatura de TUDO que o UPDATE escreve.
 *
 * Se dois itens compartilham a chave de casamento mas divergem em qualquer
 * campo gravado, o pareamento posicional escreveria um no lugar do outro.
 * Omitir um único campo daqui reabre esse buraco — foi o que aconteceu com a
 * monofasia própria na primeira versão.
 */
function assinaturaGravada(row: ItemRow): string {
  const { fiscal_invoice_id: _i, fiscal_parsed_at: _t, ...gravados } = row;
  return JSON.stringify(Object.keys(gravados).sort().map(k => [k, (gravados as Record<string, unknown>)[k]]));
}

/**
 * Remove chaves nulas do payload de UPDATE.
 *
 * Parte do `raw_xml` é PDF em base64 TRUNCADO (o próprio ETL gravou assim). Um
 * XML cortado no meio de uma tag faz o parser devolver vazio, que vira null —
 * e um UPDATE com null apagaria o valor bom que já está no banco. Omitir o
 * nulo é conservador: nunca destrói, no pior caso não preenche.
 */
function semNulos(row: ItemRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "fiscal_invoice_id") continue;
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Token inválido. Use BACKFILL_TRIGGER_TOKEN." }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") !== "false"; // padrão: simula
  const force = url.searchParams.get("force") === "true";
  const limit = intParam(url.searchParams.get("limit"), 100, 1, 500);
  const offset = intParam(url.searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);

  const db = createSupabaseServiceClient();

  const stats = {
    dryRun,
    invoices_lidas: 0,
    invoices_sem_xml: 0,
    invoices_sem_item_no_xml: 0,
    invoices_puladas_por_ambiguidade: 0,
    itens_atualizados: 0,
    itens_inseridos: 0,
    itens_ja_processados: 0,
    itens_existentes_sem_par: 0,
    pendencias: [] as Pendencia[],
    erros: [] as Array<{ invoice_id: string; erro: string; itens_ja_gravados: number }>,
  };

  try {
    const { count: total } = await db
      .from("fiscal_invoices")
      .select("*", { count: "exact", head: true })
      .not("raw_xml", "is", null);

    // Desempate por id: `created_at` foi copiado em bloco pelo ETL e tem
    // empates em massa. Sem o segundo critério, a ordem entre páginas não é
    // estável e há nota nunca visitada enquanto `remaining` chega a zero.
    const { data: invoices, error: invErr } = await db
      .from("fiscal_invoices")
      .select("id, raw_xml")
      .not("raw_xml", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (invErr) throw new Error(`falha ao ler fiscal_invoices: ${invErr.message}`);

    for (const inv of invoices ?? []) {
      const invoiceId = inv.id as string;
      const xml = (inv.raw_xml ?? "") as string;
      stats.invoices_lidas++;

      // O ETL gravou PDFs em base64 truncado no mesmo campo. Aceita prefixo de
      // namespace (`<ns2:det`), que o parser também passou a aceitar.
      if (!/<(?:[A-Za-z_][\w.-]*:)?det[\s>]/.test(xml)) {
        stats.invoices_sem_xml++;
        continue;
      }

      let gravadosNestaNota = 0;
      try {
        const parsed = parseNfeItems(xml);
        if (parsed.length === 0) {
          stats.invoices_sem_item_no_xml++;
          continue;
        }

        const { data: existing, error: exErr } = await db
          .from("fiscal_invoice_items")
          .select("id, sequence, product_code, ncm, cfop, total_price, quantity, unit, description, fiscal_parsed_at")
          .eq("fiscal_invoice_id", invoiceId)
          .order("id", { ascending: true }); // ordem determinística
        if (exErr) throw new Error(`ler itens: ${exErr.message}`);

        const buckets = new Map<string, ExistingItem[]>();
        for (const row of (existing ?? []) as ExistingItem[]) {
          const k = matchKey(row.ncm, row.cfop, row.total_price, row.quantity, row.unit, row.description);
          (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(row);
        }

        const parsedBuckets = new Map<string, ItemRow[]>();
        for (const item of parsed) {
          const row = toInvoiceItemRow(item, invoiceId, "xml_reparse");
          const k = matchKey(item.ncm, item.cfop, item.valorTotal, item.quantidade, item.unidade, item.descricao);
          (parsedBuckets.get(k) ?? parsedBuckets.set(k, []).get(k)!).push(row);
        }

        const updates: Array<{ id: string; row: ItemRow }> = [];
        const inserts: ItemRow[] = [];
        const pendenciasDaNota: Pendencia[] = [];
        let jaProcessados = 0;

        for (const [k, rows] of parsedBuckets) {
          const bucket = buckets.get(k) ?? [];

          if (bucket.length === 0) { inserts.push(...rows); continue; }
          buckets.delete(k); // só aqui — o balde foi de fato consumido

          if (bucket.length !== rows.length) {
            pendenciasDaNota.push({
              invoice_id: invoiceId, motivo: "contagem divergente entre banco e XML",
              existentes: bucket.length, no_xml: rows.length, detalhe: k,
            });
            continue;
          }

          // Mesma contagem: só é seguro parear posicionalmente se TODOS os
          // payloads gravados forem idênticos entre si — aí a ordem não importa.
          if (rows.length > 1 && new Set(rows.map(assinaturaGravada)).size > 1) {
            pendenciasDaNota.push({
              invoice_id: invoiceId, motivo: "itens indistinguiveis com dados gravados diferentes",
              existentes: bucket.length, no_xml: rows.length, detalhe: k,
            });
            continue;
          }

          for (let i = 0; i < rows.length; i++) {
            if (bucket[i].fiscal_parsed_at && !force) { jaProcessados++; continue; }
            updates.push({ id: bucket[i].id, row: rows[i] });
          }
        }

        const sobraram = [...buckets.values()].reduce((n, arr) => n + arr.length, 0);

        // CONSERVADORISMO: inserir enquanto sobra linha existente sem par
        // significa que a chave derivou (descrição ou unidade gravadas por
        // outro parser), não que o item é novo. Inserir criaria duplicata com
        // os vínculos numa linha e o fiscal noutra. Pula a nota inteira.
        if (inserts.length > 0 && sobraram > 0) {
          stats.invoices_puladas_por_ambiguidade++;
          stats.pendencias.push({
            invoice_id: invoiceId,
            motivo: "chave divergiu — inserir duplicaria linha. Nota pulada inteira",
            existentes: sobraram, no_xml: inserts.length,
          });
          continue;
        }

        if (!dryRun) {
          for (const u of updates) {
            const { error } = await db
              .from("fiscal_invoice_items").update(semNulos(u.row)).eq("id", u.id);
            if (error) throw new Error(`update item ${u.id}: ${error.message}`);
            stats.itens_atualizados++;  // conta ao acontecer, não no fim
            gravadosNestaNota++;
          }
          if (inserts.length > 0) {
            const { error } = await db.from("fiscal_invoice_items").insert(inserts);
            if (error) throw new Error(`insert itens: ${error.message}`);
            stats.itens_inseridos += inserts.length;
            gravadosNestaNota += inserts.length;
          }
        } else {
          stats.itens_atualizados += updates.length;
          stats.itens_inseridos += inserts.length;
        }

        stats.itens_ja_processados += jaProcessados;
        stats.itens_existentes_sem_par += sobraram;
        stats.pendencias.push(...pendenciasDaNota);
      } catch (err) {
        stats.erros.push({
          invoice_id: invoiceId,
          erro: err instanceof Error ? err.message : String(err),
          itens_ja_gravados: gravadosNestaNota, // o operador precisa saber o que reverter
        });
      }
    }

    const processadas = offset + (invoices?.length ?? 0);
    return NextResponse.json({
      ok: true,
      ...stats,
      pendencias: stats.pendencias.slice(0, 50),
      pendencias_omitidas: Math.max(0, stats.pendencias.length - 50),
      total_com_xml: total ?? 0,
      offset, limit,
      remaining: Math.max(0, (total ?? 0) - processadas),
      proximo_offset: processadas,
      aviso: dryRun ? "SIMULAÇÃO — nada foi gravado. Use ?dryRun=false para aplicar." : undefined,
    });
  } catch (err) {
    console.error("[fiscal-backfill] falha:", err);
    return NextResponse.json(
      { error: "Falha no backfill", detail: err instanceof Error ? err.message : String(err), stats },
      { status: 500 },
    );
  }
}
