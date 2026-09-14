/**
 * POST /api/cadastro/finalizar — cria a linha em `clients` (e o intake) para
 * um usuário recém-criado no Auth.
 *
 * Por que existe (AUTH-03 + DB-01, raio-x 14/09/2026): a página de cadastro
 * inseria em `clients` direto do navegador, com o `role` vindo do request
 * (forjável) e sem ler o erro — e a policy clients_insert (132) só permite
 * is_admin(), então o insert falhava em silêncio e a pessoa ficava com login
 * sem cliente. Aqui o insert roda com a service key, o role vem de uma lista
 * fechada (nunca 'admin'), e o erro chega à tela.
 *
 * Confiança no auth_user_id do corpo: o usuário acabou de ser criado e pode
 * não ter sessão (confirmação de e-mail). Validamos com a Admin API que o
 * usuário existe, que o e-mail confere e que foi criado há menos de 15 min;
 * e recusamos se já houver linha para ele.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { roleDoPerfil, rotaPosCadastro, ROLES_DE_CADASTRO } from "@/lib/cadastro-roles";

export const runtime = "nodejs";

const Body = z.object({
  auth_user_id: z.string().uuid(),
  email:        z.string().email().max(254),
  profileType:  z.string().min(1).max(40),
  name:         z.string().max(120).optional().default(""),
  farmName:     z.string().max(160).optional().default(""),
  companyName:  z.string().max(160).optional().default(""),
  state:        z.string().max(2).optional().default(""),
  rebanhoSize:  z.string().max(40).optional().default(""),
  especie:      z.string().max(40).optional().default(""),
  notes:        z.string().max(2000).optional().default(""),
  phone:        z.string().max(40).optional().default(""),
});

const JANELA_MIN = 15;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Payload inválido" }, { status: 400 });
  }
  const b = parsed.data;

  const db = createSupabaseServiceClient();

  // 1. O usuário existe no Auth, é este e-mail, e é recém-criado.
  const { data: au, error: auErr } = await db.auth.admin.getUserById(b.auth_user_id);
  if (auErr || !au?.user) return NextResponse.json({ error: "Usuário não encontrado no Auth" }, { status: 404 });
  if ((au.user.email ?? "").toLowerCase() !== b.email.toLowerCase()) {
    return NextResponse.json({ error: "E-mail não confere com o usuário" }, { status: 403 });
  }
  const idadeMin = (Date.now() - new Date(au.user.created_at).getTime()) / 60_000;
  if (!Number.isFinite(idadeMin) || idadeMin > JANELA_MIN) {
    return NextResponse.json({ error: "Janela de finalização expirada. Entre e complete o perfil pelo painel." }, { status: 403 });
  }

  // 2. Já tem cliente? Então só devolve para onde ir.
  const { data: existente } = await db.from("clients").select("id, role").eq("auth_user_id", b.auth_user_id).maybeSingle();
  if (existente) {
    return NextResponse.json({ ok: true, ja_existia: true, client_id: existente.id, role: existente.role, rota: rotaPosCadastro(existente.role) });
  }

  // 3. Papel de lista fechada — nunca admin.
  const roleDesejado = roleDoPerfil(b.profileType);
  if (!(ROLES_DE_CADASTRO as readonly string[]).includes(roleDesejado)) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }
  const nome = (b.profileType === "fazendeiro" ? b.farmName || b.name : b.companyName || b.name).trim() || b.email;

  let role = roleDesejado;
  let aviso: string | null = null;
  let ins = await db.from("clients").insert({ name: nome, email: b.email, role, auth_user_id: b.auth_user_id }).select("id").single();

  // CHECK de role sem 'accountant' (migration 162 não aplicada): a pessoa
  // não pode ficar sem cliente. Entra como 'client' com o perfil declarado
  // guardado no intake; o admin ajusta em /admin/contas quando a 162 subir.
  if (ins.error && role === "accountant" && /check|role/i.test(ins.error.message)) {
    role = "client";
    aviso = "Perfil de contador ainda não habilitado neste ambiente — conta criada como produtor; o administrador ajusta.";
    ins = await db.from("clients").insert({ name: nome, email: b.email, role, auth_user_id: b.auth_user_id }).select("id").single();
  }
  if (ins.error || !ins.data) {
    return NextResponse.json({ error: `Não foi possível criar o cliente: ${ins.error?.message ?? "erro desconhecido"}` }, { status: 500 });
  }

  // 4. Intake — registro do que foi DECLARADO; falha aqui não derruba o cadastro.
  let intake_ok = true;
  const { error: intakeErr } = await db.from("onboarding_intake").insert({
    client_id: ins.data.id,
    perfil_declarado: b.profileType,
    farm_name: b.farmName || null,
    uf: b.state || null,
    rebanho_faixa: b.rebanhoSize || null,
    especie: b.especie || null,
    company_name: b.companyName || null,
    notes: b.notes || null,
    telefone: b.phone || null,
    origem: "cadastro_web",
  });
  if (intakeErr) { intake_ok = false; console.error("[cadastro/finalizar] intake não gravado:", intakeErr.message); }

  return NextResponse.json({ ok: true, client_id: ins.data.id, role, rota: rotaPosCadastro(role), aviso, intake_ok });
}
