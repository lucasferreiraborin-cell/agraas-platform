import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

type EmailTemplate = "welcome" | "payment_confirmed" | "payment_reminder";

const TEMPLATES: Record<EmailTemplate, { subject: string; html: (name: string) => string }> = {
  welcome: {
    subject: "Bem-vindo à Agraas",
    html: (name) => `
      <h2>Olá, ${name}!</h2>
      <p>Sua conta Agraas foi ativada com sucesso.</p>
      <p>Acesse a plataforma para começar a rastrear seu rebanho com inteligência.</p>
      <p><a href="https://agraas-platform.vercel.app">Acessar Agraas</a></p>
      <p>— Equipe Agraas</p>
    `,
  },
  payment_confirmed: {
    subject: "Pagamento confirmado — Agraas",
    html: (name) => `
      <h2>${name}, seu pagamento foi confirmado!</h2>
      <p>Obrigado por assinar a Agraas. Seu plano está ativo.</p>
      <p><a href="https://agraas-platform.vercel.app/configuracoes/assinatura">Ver assinatura</a></p>
      <p>— Equipe Agraas</p>
    `,
  },
  payment_reminder: {
    subject: "Lembrete de vencimento — Agraas",
    html: (name) => `
      <h2>${name}, sua assinatura vence em 3 dias.</h2>
      <p>Garanta que seu método de pagamento está atualizado para evitar interrupções.</p>
      <p><a href="https://agraas-platform.vercel.app/configuracoes/assinatura">Verificar assinatura</a></p>
      <p>— Equipe Agraas</p>
    `,
  },
};

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend não configurado neste ambiente" }, { status: 501 });
  }

  const body = await req.json().catch(() => ({}));
  const { template, to, name } = body as { template?: string; to?: string; name?: string };

  if (!template || !to || !name) {
    return NextResponse.json({ error: "template, to e name são obrigatórios" }, { status: 400 });
  }

  const tpl = TEMPLATES[template as EmailTemplate];
  if (!tpl) return NextResponse.json({ error: "Template não encontrado" }, { status: 400 });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "Agraas <noreply@agraas.com.br>",
      to,
      subject: tpl.subject,
      html: tpl.html(name),
    });

    if (error) {
      console.error("[Email]", error);
      return NextResponse.json({ error: "Erro ao enviar email" }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[Email]", err);
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 502 });
  }
}
