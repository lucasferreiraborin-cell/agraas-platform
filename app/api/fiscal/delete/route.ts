/**
 * DELETE /api/fiscal/delete — exclui uma nota do cliente logado.
 *
 * Reescrita em 14/09/2026 (raio-x F3): a versão anterior apagava com o
 * client de cookies e descartava o resultado. Como nenhuma migration
 * versionada cria política de DELETE em fiscal_notes / fiscal_note_items,
 * o comando podia apagar 0 linhas em silêncio e a rota respondia
 * `{ success: true }` — a nota continuava na lista.
 *
 * Agora: (1) a posse é verificada com o client do usuário (RLS de SELECT
 * existe); (2) a exclusão roda com a service key, que não depende de
 * política; (3) cada delete devolve `count` e a resposta só é sucesso se a
 * nota realmente saiu.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { FISCAL_WRITES_CANONICAL, FISCAL_WRITES_LEGACY } from "@/lib/feature-flags";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    let body: { note_id?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Corpo inválido" }, { status: 400 });
    }
    const noteId = (body.note_id ?? "").trim();
    if (!UUID_RE.test(noteId)) return Response.json({ error: "note_id inválido" }, { status: 400 });

    const { data: clientData } = await supabase
      .from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    // Posse: a nota tem de ser deste cliente. Procuramos nos dois destinos,
    // porque em modo 'canonical' não há linha legada.
    const db = createSupabaseServiceClient();
    const [legado, canonico] = await Promise.all([
      db.from("fiscal_notes").select("id, client_id").eq("id", noteId).maybeSingle(),
      db.from("fiscal_invoices").select("id, client_id").eq("id", noteId).maybeSingle(),
    ]);
    const dona = legado.data?.client_id ?? canonico.data?.client_id ?? null;
    if (!dona) return Response.json({ error: "Nota não encontrada" }, { status: 404 });
    if (dona !== clientData.id) return Response.json({ error: "Nota não pertence a este cliente" }, { status: 403 });

    const apagados = { alertas: 0, itens: 0, nota: 0, canonica: 0 };
    const falhas: string[] = [];

    if (FISCAL_WRITES_LEGACY || legado.data) {
      const [a, i] = await Promise.all([
        db.from("fiscal_notes_alerts_legacy").delete({ count: "exact" }).eq("note_id", noteId),
        db.from("fiscal_note_items").delete({ count: "exact" }).eq("note_id", noteId),
      ]);
      if (a.error) falhas.push(`alertas: ${a.error.message}`); else apagados.alertas = a.count ?? 0;
      if (i.error) falhas.push(`itens: ${i.error.message}`);   else apagados.itens   = i.count ?? 0;

      if (legado.data) {
        const n = await db.from("fiscal_notes").delete({ count: "exact" }).eq("id", noteId).eq("client_id", clientData.id);
        if (n.error) falhas.push(`nota: ${n.error.message}`); else apagados.nota = n.count ?? 0;
      }
    }

    if ((FISCAL_WRITES_CANONICAL || canonico.data) && canonico.data) {
      // fiscal_alerts referencia fiscal_invoices; apagamos antes por segurança
      // caso a FK não seja ON DELETE CASCADE neste banco.
      await db.from("fiscal_alerts").delete().eq("fiscal_invoice_id", noteId);
      const c = await db.from("fiscal_invoices").delete({ count: "exact" }).eq("id", noteId).eq("client_id", clientData.id);
      if (c.error) falhas.push(`canônica: ${c.error.message}`); else apagados.canonica = c.count ?? 0;
    }

    const saiu = apagados.nota > 0 || apagados.canonica > 0;
    if (!saiu) {
      return Response.json(
        { error: `A nota não foi excluída${falhas.length ? ` (${falhas.join("; ")})` : ""}.`, apagados, falhas },
        { status: 500 },
      );
    }
    return Response.json({ success: true, apagados, falhas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
