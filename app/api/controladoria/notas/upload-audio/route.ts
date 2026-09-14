/**
 * POST /api/controladoria/notas/upload-audio — modo "Ditado" do modal.
 *
 * Ainda não há transcrição de áudio na stack (o Claude não recebe áudio, e
 * não existe serviço de speech-to-text contratado). Em vez de um 404 que o
 * modal traduzia como "Sprint G2", a rota responde 501 com a orientação
 * correta — o usuário sabe na hora o que fazer.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  return Response.json(
    {
      error: "Ditado por voz ainda não está disponível. Envie o XML, o PDF (DANFE) ou a planilha da nota.",
      disponivel: false,
    },
    { status: 501 },
  );
}
