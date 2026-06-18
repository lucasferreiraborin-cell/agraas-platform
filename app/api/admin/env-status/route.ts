/**
 * Status das variáveis de ambiente críticas. Admin-only.
 * NUNCA retorna o valor — apenas booleano "configurada".
 * Permite ao Lucas ver pelo /admin/saude se algo precisa ser setado.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { roleToPersona } from "@/lib/persona-themes";

export const dynamic = "force-dynamic";

const REQUIRED_VARS = [
  { key: "ANTHROPIC_API_KEY",         purpose: "IA Claude para insights por persona",          required: true,  cron: false },
  { key: "RESEND_API_KEY",            purpose: "E-mails (digest sócios, alertas)",             required: true,  cron: false },
  { key: "NEXT_PUBLIC_SUPABASE_URL",  purpose: "Conexão Supabase",                             required: true,  cron: false },
  { key: "SUPABASE_SERVICE_ROLE_KEY", purpose: "Acesso server-side ao banco",                  required: true,  cron: false },
  { key: "STRIPE_SECRET_KEY",         purpose: "Pagamentos planos",                            required: false, cron: false },
  { key: "CRON_SECRET",               purpose: "Disparo manual de crons (opcional)",           required: false, cron: true  },
  { key: "DIGEST_TRIGGER_TOKEN",      purpose: "Disparo manual de digest sócios (opcional)",   required: false, cron: true  },
];

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clientData } = await auth
    .from("clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientData || roleToPersona(clientData.role) !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const status = REQUIRED_VARS.map((v) => ({
    key: v.key,
    purpose: v.purpose,
    required: v.required,
    cron_only: v.cron,
    configured: Boolean(process.env[v.key]),
  }));

  const missing_required = status.filter((s) => s.required && !s.configured).length;
  const missing_optional = status.filter((s) => !s.required && !s.configured).length;

  return NextResponse.json({
    status,
    summary: {
      missing_required,
      missing_optional,
      total: status.length,
    },
  });
}
