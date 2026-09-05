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
 * Segurança e reversibilidade:
 *  - Bearer token (BACKFILL_TRIGGER_TOKEN) — mesma disciplina do digest.
 *  - `dryRun=true` por padrão. Escrever exige `dryRun=false` explícito.
 *  - NUNCA deleta linha. Atualiza as existentes e insere só o que não casou,
 *    preservando linked_stock_batch_id / linked_animal_id / linked_application_id,
 *    que foram preenchidos depois do ETL e não estão no XML.
 *  - Idempotente: pula itens com fiscal_parsed_at preenchido, salvo `force=true`.
 *
 * Rodar em lotes: `?limit=100&offset=0`, avançando o offset até `remaining` zerar.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { parseNfeItems, toInvoiceItemRow } from "@/lib/fiscal/nfe-parser";

export const runtime = "nodejs";
export const maxDuration = 300;

type ExistingItem = {
  id: string;
  sequence: number | null;
  ncm: string | null;
  cfop: string | null;
  total_price: number | null;
  quantity: number | null;
  unit: string | null;
  description: string | null;
  fiscal_parsed_at: string | null;
};

type Ambiguidade = {
  invoice_id: string;
  chave: string;
  existentes: number;
  no_xml: number;
  motivo: string;
};

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.BACKFILL_TRIGGER_TOKEN ?? "";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected) && token === expected;
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
 * ROW_NUMBER() OVER (ORDER BY fni.id) — ou seja, pela ordem do UUID, que é
 * aleatória e não corresponde à ordem dos <det> no XML. Casar por sequência
 * embaralharia os campos fiscais entre itens da mesma nota.
 *
 * Desempate por quantidade, unidade e hash da descrição além de NCM/CFOP/valor:
 * duas linhas de adubo com NCM e CFOP iguais mas quantidades diferentes deixam
 * de colidir.
 */
function matchKey(
  ncm: unknown,
  cfop: unknown,
  total: unknown,
  qtd: unknown,
  unidade: unknown,
  descricao: unknown,
): string {
  const n = (ncm ?? "").toString().trim();
  const c = (cfop ?? "").toString().trim();
  const t = total == null ? "" : Number(total).toFixed(2);
  const q = qtd == null ? "" : Number(qtd).toFixed(4);
  const u = (unidade ?? "").toString().trim().toUpperCase();
  return `${n}|${c}|${t}|${q}|${u}|${hashDesc(descricao)}`;
}

/** Payload fiscal de um item, para detectar ambiguidade real entre itens iguais. */
function fiscalFingerprint(row: ReturnType<typeof toInvoiceItemRow>): string {
  return JSON.stringify([
    row.cst, row.icms_base, row.icms_reducao_base_pct, row.icms_aliquota,
    row.icms_valor, row.icms_desonerado, row.icms_mot_desoneracao,
    row.beneficio_codigo, row.icms_mono_qtd_bc_ret, row.icms_mono_ad_rem_ret,
    row.icms_mono_valor_ret, row.ipi_valor,
  ]);
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
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const db = createSupabaseServiceClient();

  const stats = {
    dryRun,
    invoices_lidas: 0,
    invoices_sem_xml: 0,
    invoices_sem_item_no_xml: 0,
    itens_atualizados: 0,
    itens_inseridos: 0,
    itens_ja_processados: 0,
    itens_existentes_sem_par: 0,
    itens_ambiguos: [] as Ambiguidade[],
    erros: [] as Array<{ invoice_id: string; erro: string }>,
  };

  try {
    const { count: total } = await db
      .from("fiscal_invoices")
      .select("*", { count: "exact", head: true })
      .not("raw_xml", "is", null);

    const { data: invoices, error: invErr } = await db
      .from("fiscal_invoices")
      .select("id, raw_xml")
      .not("raw_xml", "is", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (invErr) throw new Error(`falha ao ler fiscal_invoices: ${invErr.message}`);

    for (const inv of invoices ?? []) {
      const xml = (inv.raw_xml ?? "") as string;
      stats.invoices_lidas++;

      // O ETL gravou PDFs em base64 truncado no mesmo campo. Não é XML.
      if (!xml.includes("<det")) {
        stats.invoices_sem_xml++;
        continue;
      }

      try {
        const parsed = parseNfeItems(xml);
        if (parsed.length === 0) {
          stats.invoices_sem_item_no_xml++;
          continue;
        }

        const { data: existing } = await db
          .from("fiscal_invoice_items")
          .select("id, sequence, ncm, cfop, total_price, quantity, unit, description, fiscal_parsed_at")
          .eq("fiscal_invoice_id", inv.id);

        // Agrupa os dois lados pela mesma chave e resolve balde a balde.
        const buckets = new Map<string, ExistingItem[]>();
        for (const row of (existing ?? []) as ExistingItem[]) {
          const k = matchKey(row.ncm, row.cfop, row.total_price, row.quantity, row.unit, row.description);
          const arr = buckets.get(k);
          if (arr) arr.push(row);
          else buckets.set(k, [row]);
        }

        const parsedBuckets = new Map<string, ReturnType<typeof toInvoiceItemRow>[]>();
        for (const item of parsed) {
          const row = toInvoiceItemRow(item, inv.id as string, "xml_reparse");
          const k = matchKey(item.ncm, item.cfop, item.valorTotal, item.quantidade, item.unidade, item.descricao);
          const arr = parsedBuckets.get(k);
          if (arr) arr.push(row);
          else parsedBuckets.set(k, [row]);
        }

        const updates: Array<{ id: string; row: ReturnType<typeof toInvoiceItemRow> }> = [];
        const inserts: ReturnType<typeof toInvoiceItemRow>[] = [];

        for (const [k, rows] of parsedBuckets) {
          const bucket = buckets.get(k) ?? [];
          buckets.delete(k);

          // Nenhuma linha existente casa: item novo, inserimos.
          if (bucket.length === 0) {
            inserts.push(...rows);
            continue;
          }

          // Contagens diferentes: não sabemos qual linha recebe qual payload.
          if (bucket.length !== rows.length) {
            stats.itens_ambiguos.push({
              invoice_id: inv.id as string,
              chave: k,
              existentes: bucket.length,
              no_xml: rows.length,
              motivo: "contagem divergente entre banco e XML",
            });
            continue;
          }

          // Mesma contagem, mas payloads fiscais diferentes entre si: a ordem
          // importaria e não temos como saber qual é qual. Reporta, não escolhe.
          const fingerprints = new Set(rows.map(fiscalFingerprint));
          if (rows.length > 1 && fingerprints.size > 1) {
            stats.itens_ambiguos.push({
              invoice_id: inv.id as string,
              chave: k,
              existentes: bucket.length,
              no_xml: rows.length,
              motivo: "itens indistinguiveis com dados fiscais diferentes",
            });
            continue;
          }

          // Seguro: ou é 1-para-1, ou são N itens idênticos inclusive no fiscal,
          // caso em que a ordem do pareamento não altera o resultado.
          for (let i = 0; i < rows.length; i++) {
            const target = bucket[i];
            if (target.fiscal_parsed_at && !force) {
              stats.itens_ja_processados++;
              continue;
            }
            updates.push({ id: target.id, row: rows[i] });
          }
        }

        // Sobrou linha existente sem contrapartida no XML — não tocamos nela.
        for (const arr of buckets.values()) stats.itens_existentes_sem_par += arr.length;

        if (!dryRun) {
          for (const u of updates) {
            // fiscal_invoice_id não é atualizado: a linha já pertence à nota,
            // e os campos de vínculo (linked_*) ficam intactos por omissão.
            const { fiscal_invoice_id: _ignored, ...fields } = u.row;
            const { error } = await db.from("fiscal_invoice_items").update(fields).eq("id", u.id);
            if (error) throw new Error(`update item ${u.id}: ${error.message}`);
          }
          if (inserts.length > 0) {
            const { error } = await db.from("fiscal_invoice_items").insert(inserts);
            if (error) throw new Error(`insert itens: ${error.message}`);
          }
        }

        stats.itens_atualizados += updates.length;
        stats.itens_inseridos += inserts.length;
      } catch (err) {
        stats.erros.push({
          invoice_id: inv.id as string,
          erro: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const processadas = offset + (invoices?.length ?? 0);
    return NextResponse.json({
      ok: true,
      ...stats,
      total_com_xml: total ?? 0,
      offset,
      limit,
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
