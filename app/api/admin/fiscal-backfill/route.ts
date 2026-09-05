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
  fiscal_parsed_at: string | null;
};

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.BACKFILL_TRIGGER_TOKEN ?? "";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected) && token === expected;
}

/**
 * Chave de casamento entre item existente e item reparseado.
 *
 * Não usamos `sequence`: o ETL da 139 gerou a sequência com
 * ROW_NUMBER() OVER (ORDER BY fni.id) — ou seja, pela ordem do UUID, que é
 * aleatória e não corresponde à ordem dos <det> no XML. Casar por sequência
 * embaralharia os campos fiscais entre itens da mesma nota.
 */
function matchKey(ncm: unknown, cfop: unknown, total: unknown): string {
  const n = (ncm ?? "").toString().trim();
  const c = (cfop ?? "").toString().trim();
  const t = total == null ? "" : Number(total).toFixed(2);
  return `${n}|${c}|${t}`;
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
          .select("id, sequence, ncm, cfop, total_price, fiscal_parsed_at")
          .eq("fiscal_invoice_id", inv.id);

        // Baldes por chave de casamento — várias linhas podem compartilhar a
        // mesma chave (mesmo produto repetido na nota); consumimos em ordem.
        const buckets = new Map<string, ExistingItem[]>();
        for (const row of (existing ?? []) as ExistingItem[]) {
          const k = matchKey(row.ncm, row.cfop, row.total_price);
          const arr = buckets.get(k);
          if (arr) arr.push(row);
          else buckets.set(k, [row]);
        }

        const updates: Array<{ id: string; row: ReturnType<typeof toInvoiceItemRow> }> = [];
        const inserts: ReturnType<typeof toInvoiceItemRow>[] = [];

        for (const item of parsed) {
          const row = toInvoiceItemRow(item, inv.id as string, "xml_reparse");
          const bucket = buckets.get(matchKey(item.ncm, item.cfop, item.valorTotal));
          const target = bucket?.shift();

          if (!target) {
            inserts.push(row);
            continue;
          }
          if (target.fiscal_parsed_at && !force) {
            stats.itens_ja_processados++;
            continue;
          }
          updates.push({ id: target.id, row });
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
