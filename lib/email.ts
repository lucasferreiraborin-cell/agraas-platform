// Templates Resend + função de envio compartilhada entre /api/email (POST
// autenticado) e webhooks server-to-server (Stripe etc.).

export type EmailTemplate = "welcome" | "payment_confirmed" | "payment_reminder";

const TEMPLATES: Record<
  EmailTemplate,
  { subject: string; html: (name: string) => string }
> = {
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

export function isEmailTemplate(value: string): value is EmailTemplate {
  return value in TEMPLATES;
}

export type SendTemplateEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "send_failed"; error?: unknown };

export async function sendTemplateEmail(
  template: EmailTemplate,
  to: string,
  name: string,
): Promise<SendTemplateEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, reason: "not_configured" };
  }

  const tpl = TEMPLATES[template];

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
      return { ok: false, reason: "send_failed", error };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "send_failed", error: err };
  }
}
