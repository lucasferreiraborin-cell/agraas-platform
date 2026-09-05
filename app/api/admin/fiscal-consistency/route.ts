/**
 * Job de consistência fiscal (B0b) — compara os dois destinos de escrita.
 *
 * Enquanto FISCAL_WRITE_MODE='dual', toda nota deve existir nas duas tabelas
 * com o mesmo id (correspondência estabelecida pelo ETL da migration 139) e
 * com os mesmos itens. Este job mede a divergência em vez de supor que não há.
 *
 * É a condição de saída da transição: a leitura só migra para a canônica, e a
 * escrita legada só é desligada, depois deste job voltar limpo.
 *
 * Somente leitura. Nunca corrige nada — corrigir escondido é como o cisma
 * entre as duas tabelas passou três meses sem ninguém ver.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { itemsFingerprint } from "@/lib/fiscal/invoice-writer";
import { FISCAL_WRITE_MODE } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const maxDuration = 300;

type Divergencia = {
  note_id: string;
  tipo:
    | "ausente_na_canonica"
    | "ausente_no_legado"
    | "contagem_de_itens"
    | "assinatura_de_itens"
    | "valor_total"
    | "status";
  legado: string | number | null;
  canonico: string | number | null;
};

/** Status legado esperado para cada status canônico (inverso de mapLegacyStatus). */
const STATUS_EQUIVALENTE: Record<string, string> = {
  pendente: "pending_review",
  validada: "reviewed",
  erro: "rejected",
};

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const expected = process.env.BACKFILL_TRIGGER_TOKEN ?? "";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Token inválido. Use BACKFILL_TRIGGER_TOKEN." }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 1000);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const db = createSupabaseServiceClient();

  try {
    const { count: totalLegado } = await db
      .from("fiscal_notes")
      .select("*", { count: "exact", head: true });
    const { count: totalCanonico } = await db
      .from("fiscal_invoices")
      .select("*", { count: "exact", head: true });

    const { data: notas, error: notasErr } = await db
      .from("fiscal_notes")
      .select("id, valor_total, status")
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (notasErr) throw new Error(`fiscal_notes: ${notasErr.message}`);

    const ids = (notas ?? []).map(n => n.id as string);
    if (ids.length === 0) {
      return NextResponse.json({
        ok: true, write_mode: FISCAL_WRITE_MODE,
        total_legado: totalLegado ?? 0, total_canonico: totalCanonico ?? 0,
        notas_comparadas: 0, divergencias: [], remaining: 0,
      });
    }

    const [{ data: invoices }, { data: legacyItems }, { data: canonItems }] = await Promise.all([
      db.from("fiscal_invoices").select("id, gross_value, status").in("id", ids),
      db.from("fiscal_note_items").select("note_id, ncm, cfop, valor_total").in("note_id", ids),
      db.from("fiscal_invoice_items").select("fiscal_invoice_id, ncm, cfop, total_price").in("fiscal_invoice_id", ids),
    ]);

    const invById = new Map((invoices ?? []).map(i => [i.id as string, i]));

    const legacyByNote = new Map<string, Array<{ ncm: unknown; cfop: unknown; total: unknown }>>();
    for (const it of legacyItems ?? []) {
      const k = it.note_id as string;
      const arr = legacyByNote.get(k) ?? [];
      arr.push({ ncm: it.ncm, cfop: it.cfop, total: it.valor_total });
      legacyByNote.set(k, arr);
    }

    const canonByNote = new Map<string, Array<{ ncm: unknown; cfop: unknown; total: unknown }>>();
    for (const it of canonItems ?? []) {
      const k = it.fiscal_invoice_id as string;
      const arr = canonByNote.get(k) ?? [];
      arr.push({ ncm: it.ncm, cfop: it.cfop, total: it.total_price });
      canonByNote.set(k, arr);
    }

    const divergencias: Divergencia[] = [];

    for (const nota of notas ?? []) {
      const id = nota.id as string;
      const inv = invById.get(id);

      if (!inv) {
        divergencias.push({ note_id: id, tipo: "ausente_na_canonica", legado: "existe", canonico: null });
        continue;
      }

      const li = legacyByNote.get(id) ?? [];
      const ci = canonByNote.get(id) ?? [];

      if (li.length !== ci.length) {
        divergencias.push({ note_id: id, tipo: "contagem_de_itens", legado: li.length, canonico: ci.length });
      } else if (li.length > 0) {
        // Assinatura ordenada: o ETL da 139 gravou os itens em ordem de UUID,
        // então comparar por posição acusaria divergência falsa.
        const fl = itemsFingerprint(li);
        const fc = itemsFingerprint(ci);
        if (fl !== fc) {
          divergencias.push({ note_id: id, tipo: "assinatura_de_itens", legado: fl, canonico: fc });
        }
      }

      const vl = nota.valor_total == null ? null : Number(nota.valor_total);
      const vc = inv.gross_value == null ? null : Number(inv.gross_value);
      if (vl !== null && vc !== null && Math.abs(vl - vc) > 0.01) {
        divergencias.push({ note_id: id, tipo: "valor_total", legado: vl, canonico: vc });
      }

      const esperado = STATUS_EQUIVALENTE[(nota.status ?? "").toString()];
      if (esperado && inv.status !== esperado) {
        divergencias.push({
          note_id: id, tipo: "status",
          legado: nota.status as string, canonico: inv.status as string,
        });
      }
    }

    const processadas = offset + (notas?.length ?? 0);
    const porTipo = divergencias.reduce<Record<string, number>>((acc, d) => {
      acc[d.tipo] = (acc[d.tipo] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      write_mode: FISCAL_WRITE_MODE,
      total_legado: totalLegado ?? 0,
      total_canonico: totalCanonico ?? 0,
      delta_de_totais: (totalLegado ?? 0) - (totalCanonico ?? 0),
      notas_comparadas: notas?.length ?? 0,
      divergencias_por_tipo: porTipo,
      divergencias: divergencias.slice(0, 100),
      divergencias_omitidas: Math.max(0, divergencias.length - 100),
      offset,
      remaining: Math.max(0, (totalLegado ?? 0) - processadas),
      proximo_offset: processadas,
      veredito:
        divergencias.length === 0
          ? "lote consistente"
          : `${divergencias.length} divergencias — nao desligar a escrita legada`,
    });
  } catch (err) {
    console.error("[fiscal-consistency] falha:", err);
    return NextResponse.json(
      { error: "Falha na checagem", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
