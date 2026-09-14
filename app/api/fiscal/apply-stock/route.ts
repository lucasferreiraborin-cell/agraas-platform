/**
 * POST /api/fiscal/apply-stock — aplica os itens de uma NF-e ao estoque de
 * insumos e marca a nota como validada.
 *
 * Reescrita em 14/09/2026 (raio-x F7 / DT-03): a versão anterior não
 * verificava posse, não recusava reenvio (a única guarda era o botão
 * desabilitado na UI — reenvio duplicava supply_inventory_items e somava o
 * valor de novo em supply_financials) e ignorava o erro de cada escrita,
 * devolvendo `success` sempre.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { updateCanonicalStatus } from "@/lib/fiscal/invoice-writer";
import { FISCAL_WRITES_CANONICAL, FISCAL_WRITES_LEGACY } from "@/lib/feature-flags";
import { partesDataIso } from "@/lib/date-br";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Categoria de estoque por prefixo de NCM (4 dígitos). PREMISSA operacional, não fiscal. */
export function ncmToCategory(ncm: string): string {
  const prefix = (ncm ?? "").slice(0, 4);
  if (["3002", "3004", "3808", "3006"].includes(prefix)) return "Sanitários";
  if (["2309", "2302", "2301", "1209", "1001", "1005"].includes(prefix)) return "Nutricionais";
  if (prefix >= "8432" && prefix <= "8436") return "Equipamentos";
  if (["3101", "3102", "3103", "3104", "3105"].includes(prefix)) return "Fertilizantes";
  return "Outros";
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    let body: { note_id?: string };
    try { body = await req.json(); } catch { return Response.json({ error: "Corpo inválido" }, { status: 400 }); }
    const noteId = (body.note_id ?? "").trim();
    if (!UUID_RE.test(noteId)) return Response.json({ error: "note_id inválido" }, { status: 400 });

    const { data: clientData } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    const { data: note } = await supabase
      .from("fiscal_notes").select("id, client_id, valor_total, data_emissao, status").eq("id", noteId).maybeSingle();
    if (!note) return Response.json({ error: "Nota não encontrada" }, { status: 404 });
    if (note.client_id !== clientData.id) return Response.json({ error: "Nota não pertence a este cliente" }, { status: 403 });
    // Idempotência no servidor: uma nota validada já foi aplicada.
    if (note.status === "validada") {
      return Response.json({ error: "Esta nota já foi aplicada ao estoque.", ja_aplicada: true }, { status: 409 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("fiscal_note_items").select("descricao, ncm, unidade, quantidade, valor_total").eq("note_id", noteId);
    if (itemsErr) return Response.json({ error: `Itens: ${itemsErr.message}` }, { status: 500 });

    const falhas: string[] = [];

    const stockItems = (items ?? []).map(it => ({
      client_id:       clientData.id,
      product_name:    it.descricao ?? "Produto sem descrição",
      category:        ncmToCategory(it.ncm ?? ""),
      dose_per_animal: null,
      unit:            it.unidade ?? "un",
      head_count:      0,
    }));
    if (stockItems.length > 0) {
      const { error } = await supabase.from("supply_inventory_items").insert(stockItems);
      if (error) falhas.push(`supply_inventory_items: ${error.message}`);
    }

    // Período pela data de emissão, sem `new Date(iso)` (fuso).
    const p = partesDataIso(note.data_emissao);
    const agora = new Date();
    const periodLabel = p
      ? `${String(p.mes).padStart(2, "0")}/${p.ano}`
      : `${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;
    const valor = Number(note.valor_total ?? 0);

    const { data: existing, error: finErr } = await supabase
      .from("supply_financials").select("id, purchases_value, balance_value")
      .eq("client_id", clientData.id).eq("period_label", periodLabel).maybeSingle();
    if (finErr) falhas.push(`supply_financials (leitura): ${finErr.message}`);
    else if (existing) {
      const { error } = await supabase.from("supply_financials")
        .update({
          purchases_value: Number(existing.purchases_value ?? 0) + valor,
          balance_value:   Number(existing.balance_value ?? 0) + valor,
        })
        .eq("id", existing.id);
      if (error) falhas.push(`supply_financials (update): ${error.message}`);
    } else {
      const { error } = await supabase.from("supply_financials").insert({
        client_id:           clientData.id,
        period_label:        periodLabel,
        purchases_value:     valor,
        initial_stock_value: 0,
        consumption_value:   0,
        balance_value:       valor,
      });
      if (error) falhas.push(`supply_financials (insert): ${error.message}`);
    }

    // Só marca como validada se as escritas de estoque entraram — senão o
    // reenvio ficaria bloqueado com o estoque pela metade.
    if (falhas.length > 0) {
      return Response.json({ error: `Estoque não aplicado por completo: ${falhas.join("; ")}`, falhas }, { status: 500 });
    }

    if (FISCAL_WRITES_LEGACY) {
      const { error } = await supabase.from("fiscal_notes").update({ status: "validada" }).eq("id", noteId).eq("client_id", clientData.id);
      if (error) falhas.push(`status legado: ${error.message}`);
    }
    if (FISCAL_WRITES_CANONICAL) {
      const up = await updateCanonicalStatus(supabase, noteId, "validada");
      if (!up.ok) falhas.push(`status canônico: ${up.error}`);
    }

    return Response.json({
      success: falhas.length === 0,
      items_added: stockItems.length,
      period: periodLabel,
      valor_aplicado: valor,
      falhas,
    }, { status: falhas.length === 0 ? 200 : 207 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
