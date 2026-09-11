/**
 * POST /api/admin/reset-cliente — apaga todo o dado operacional de um cliente.
 *
 * Admin-only (mesma checagem de /api/admin/market/refresh). Dois modos:
 *   { client_id, modo: "inventario" }               → só conta, não escreve
 *   { client_id, modo: "executar", confirmacao }     → apaga; `confirmacao`
 *                                                       tem de ser o e-mail
 *                                                       do cliente, digitado
 * A conta (`clients`) e o plano de contas ficam. Ver lib/admin/reset-cliente.ts.
 *
 * Fica registrado em platform_jobs_log (job_name = reset_cliente) quem
 * disparou, quando e quanto caiu — apagar dado de produção sem trilha não
 * é aceitável mesmo em ambiente de teste.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { roleToPersona } from "@/lib/persona-themes";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { adaptadorSupabase, executar, inventariar } from "@/lib/admin/reset-cliente";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: quem } = await auth
    .from("clients")
    .select("role, email")
    .eq("auth_user_id", user.id)
    .single();
  if (!quem || roleToPersona(quem.role) !== "admin") {
    return NextResponse.json({ error: "Somente admin" }, { status: 403 });
  }

  let body: { client_id?: string; modo?: string; confirmacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const clientId = (body.client_id ?? "").trim();
  if (!UUID_RE.test(clientId)) return NextResponse.json({ error: "client_id inválido" }, { status: 400 });
  if (body.modo !== "inventario" && body.modo !== "executar") {
    return NextResponse.json({ error: "modo deve ser inventario ou executar" }, { status: 400 });
  }

  const db = adaptadorSupabase(createSupabaseServiceClient());
  const cliente = await db.cliente(clientId);
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  if (body.modo === "inventario") {
    return NextResponse.json(await inventariar(db, clientId));
  }

  // Executar: exige o e-mail do cliente digitado — não é um clique acidental.
  const confirmacao = (body.confirmacao ?? "").trim().toLowerCase();
  if (!confirmacao || confirmacao !== (cliente.email ?? "").trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Para executar, digite exatamente o e-mail do cliente em `confirmacao`." },
      { status: 400 },
    );
  }

  const resultado = await executar(db, clientId);
  const depois = await inventariar(db, clientId);

  // Trilha — best-effort, nunca derruba a resposta.
  try {
    await createSupabaseServiceClient().from("platform_jobs_log").insert({
      job_name: "reset_cliente",
      status: resultado.restantes.length === 0 ? "ok" : "partial",
      details: {
        client_id: clientId,
        cliente: cliente.email,
        disparado_por: quem.email ?? user.email ?? user.id,
        total_apagado: resultado.total_apagado,
        passadas: resultado.passadas,
        restantes: resultado.restantes.map(r => `${r.tabela}: ${r.status}`),
        arquivos: resultado.arquivos,
        sobrou_apos: depois.total,
      },
    });
  } catch (e) {
    console.error("[admin/reset-cliente] trilha não gravada:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ...resultado, depois });
}
