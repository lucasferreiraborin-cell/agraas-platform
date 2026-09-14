import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isEmailTemplate, sendTemplateEmail } from "@/lib/email";
import { roleToPersona } from "@/lib/persona-themes";

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

  // AUTH-07 (14/09): a rota era um relay — qualquer usuário logado mandava
  // template para destinatário arbitrário com `name` cru no HTML. Agora só
  // admin envia a terceiros; usuário comum só para o próprio e-mail; e o
  // nome vai sem markup, limitado a 80 caracteres.
  const { data: quem } = await supabase.from("clients").select("role, name").eq("auth_user_id", user.id).single();
  const ehAdmin = roleToPersona(quem?.role) === "admin";
  const destino = to.trim().toLowerCase();
  if (!ehAdmin && destino !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "Você só pode enviar para o seu próprio e-mail." }, { status: 403 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino) || destino.length > 254) {
    return NextResponse.json({ error: "Destinatário inválido" }, { status: 400 });
  }
  const nomeSeguro = name.replace(/[<>&"'`]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || quem?.name || "produtor";

  const result = await sendTemplateEmail(template, destino, nomeSeguro);

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return NextResponse.json({ error: "Resend não configurado neste ambiente" }, { status: 501 });
    }
    console.error("[Email]", result.error);
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
