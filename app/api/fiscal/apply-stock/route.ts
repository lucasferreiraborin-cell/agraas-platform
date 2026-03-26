import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

function ncmToCategory(ncm: string): string {
  const prefix = (ncm ?? "").slice(0, 4);
  if (["3002","3004","3808","3006"].includes(prefix)) return "Sanitários";
  if (["2309","2302","2301","1209","1001","1005"].includes(prefix)) return "Nutricionais";
  if (prefix >= "8432" && prefix <= "8436") return "Equipamentos";
  if (["3101","3102","3103","3104","3105"].includes(prefix)) return "Fertilizantes";
  return "Outros";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { note_id } = await req.json();

    const { data: clientData } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    const { data: note } = await supabase
      .from("fiscal_notes").select("valor_total, data_emissao, status").eq("id", note_id).single();
    if (!note) return Response.json({ error: "Nota não encontrada" }, { status: 404 });

    const { data: items } = await supabase
      .from("fiscal_note_items").select("*").eq("note_id", note_id);

    // Insere itens no estoque
    const stockItems = (items ?? []).map((it: any) => ({
      client_id:    clientData.id,
      product_name: it.descricao ?? "Produto sem descrição",
      category:     ncmToCategory(it.ncm ?? ""),
      dose_per_animal: null,
      unit:         it.unidade ?? "un",
      head_count:   0,
    }));
    if (stockItems.length > 0) await supabase.from("supply_inventory_items").insert(stockItems);

    // Upsert supply_financials
    const notaDate = note.data_emissao ? new Date(note.data_emissao) : new Date();
    const periodLabel = `${String(notaDate.getMonth() + 1).padStart(2,"0")}/${notaDate.getFullYear()}`;
    const { data: existing } = await supabase
      .from("supply_financials").select("id, purchases_value")
      .eq("client_id", clientData.id).eq("period_label", periodLabel).single();

    if (existing) {
      await supabase.from("supply_financials")
        .update({ purchases_value: Number(existing.purchases_value ?? 0) + Number(note.valor_total ?? 0) })
        .eq("id", existing.id);
    } else {
      await supabase.from("supply_financials").insert({
        client_id:    clientData.id,
        period_label: periodLabel,
        purchases_value: Number(note.valor_total ?? 0),
        initial_stock_value: 0,
        consumption_value:   0,
        balance_value:       Number(note.valor_total ?? 0),
      });
    }

    // Marca nota como validada
    await supabase.from("fiscal_notes").update({ status: "validada" }).eq("id", note_id);

    return Response.json({ success: true, items_added: stockItems.length, period: periodLabel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
