/**
 * /api/admin/contas — contas (linhas de `clients`) e seus papéis.
 *
 * Criado em 14/09/2026 depois de o login fsjdbe@gmail.com enxergar notas de
 * outro cliente: as policies de RLS liberam tudo para `is_admin()`, e várias
 * contas estavam com role 'admin'. Decisão do Lucas: só lucas@agraas.com.br
 * é admin; cada login vê só o próprio cliente.
 *
 *   GET            → lista contas (id, nome, e-mail, role, tem login?, duplicidade de e-mail)
 *   POST {client_id, role} → altera o papel. Regras: não rebaixa a si mesmo,
 *                    nunca deixa a plataforma sem admin, role de uma lista fechada.
 *
 * Roda com a service key (a RLS de `clients` não permite ao admin editar
 * outros — e não deve). Trilha em platform_jobs_log.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { roleToPersona } from "@/lib/persona-themes";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const ROLES_PERMITIDOS = ["client", "accountant", "buyer", "bank", "admin"] as const;
type Role = (typeof ROLES_PERMITIDOS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function exigirAdmin() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const { data: eu } = await auth.from("clients").select("id, role, email").eq("auth_user_id", user.id).single();
  if (!eu || roleToPersona(eu.role) !== "admin") {
    return { erro: NextResponse.json({ error: "Somente admin" }, { status: 403 }) };
  }
  return { user, eu };
}

export type ContaResumo = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  tem_login: boolean;
  email_duplicado: boolean;
  created_at?: string | null;
};

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);
  const guard = await exigirAdmin();
  if ("erro" in guard) return guard.erro;

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from("clients")
    .select("id, name, email, role, auth_user_id, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const porEmail = new Map<string, number>();
  for (const c of data ?? []) {
    const e = (c.email ?? "").toLowerCase();
    if (e) porEmail.set(e, (porEmail.get(e) ?? 0) + 1);
  }
  const contas: ContaResumo[] = (data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    role: c.role,
    tem_login: Boolean(c.auth_user_id),
    email_duplicado: (porEmail.get((c.email ?? "").toLowerCase()) ?? 0) > 1,
    created_at: c.created_at,
  }));
  return NextResponse.json({ contas, eu: guard.eu.id });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);
  const guard = await exigirAdmin();
  if ("erro" in guard) return guard.erro;

  let body: { client_id?: string; role?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Payload inválido" }, { status: 400 }); }

  const clientId = (body.client_id ?? "").trim();
  const role = (body.role ?? "").trim() as Role;
  if (!UUID_RE.test(clientId)) return NextResponse.json({ error: "client_id inválido" }, { status: 400 });
  if (!ROLES_PERMITIDOS.includes(role)) {
    return NextResponse.json({ error: `role deve ser um de: ${ROLES_PERMITIDOS.join(", ")}` }, { status: 400 });
  }
  if (clientId === guard.eu.id && role !== "admin") {
    return NextResponse.json({ error: "Você não pode rebaixar a própria conta." }, { status: 400 });
  }

  const db = createSupabaseServiceClient();
  const { data: alvo } = await db.from("clients").select("id, email, role").eq("id", clientId).maybeSingle();
  if (!alvo) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  if (alvo.role === "admin" && role !== "admin") {
    const { count } = await db.from("clients").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "Não é possível remover o último admin." }, { status: 400 });
  }

  const { error } = await db.from("clients").update({ role }).eq("id", clientId);
  if (error) {
    // Ex.: CHECK de role sem 'accountant' enquanto a migration 162 não for aplicada.
    return NextResponse.json({ error: `Banco recusou: ${error.message}` }, { status: 400 });
  }

  try {
    await db.from("platform_jobs_log").insert({
      job_name: "alterar_role",
      status: "ok",
      details: { client_id: clientId, email: alvo.email, de: alvo.role, para: role, por: guard.eu.email },
    });
  } catch { /* trilha best-effort */ }

  return NextResponse.json({ ok: true, client_id: clientId, de: alvo.role, para: role });
}
