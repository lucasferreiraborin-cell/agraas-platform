import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function DELETE(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { note_id } = await req.json();
    if (!note_id) return Response.json({ error: "note_id obrigatório" }, { status: 400 });

    const { data: clientData } = await supabase
      .from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    // Garante que a nota pertence a esse cliente
    const { data: note } = await supabase
      .from("fiscal_notes").select("id")
      .eq("id", note_id).eq("client_id", clientData.id).single();
    if (!note) return Response.json({ error: "Nota não encontrada" }, { status: 404 });

    // Deleta em cascata: alertas + itens primeiro, depois a nota
    await Promise.all([
      supabase.from("fiscal_alerts").delete().eq("note_id", note_id),
      supabase.from("fiscal_note_items").delete().eq("note_id", note_id),
    ]);
    await supabase.from("fiscal_notes").delete().eq("id", note_id);

    return Response.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
