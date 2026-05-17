import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isEmailTemplate, sendTemplateEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { template, to, name } = body as { template?: string; to?: string; name?: string };

  if (!template || !to || !name) {
    return NextResponse.json({ error: "template, to e name são obrigatórios" }, { status: 400 });
  }

  if (!isEmailTemplate(template)) {
    return NextResponse.json({ error: "Template não encontrado" }, { status: 400 });
  }

  const result = await sendTemplateEmail(template, to, name);

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return NextResponse.json({ error: "Resend não configurado neste ambiente" }, { status: 501 });
    }
    console.error("[Email]", result.error);
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
