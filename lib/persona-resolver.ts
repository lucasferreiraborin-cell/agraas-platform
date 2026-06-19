/**
 * Resolver de persona — única fonte de verdade para "quem está vendo o que".
 *
 * Lógica:
 * 1. Lê role de `clients` via supabase server client (RLS aplicada).
 * 2. Mapeia role → persona (admin/produtor/frigorífico/banco) via roleToPersona.
 * 3. Se o usuário for admin, lê cookie `agraas_view_as` — se presente, retorna
 *    aquela persona como "efetiva". Admin pode simular qualquer perfil para QA.
 *
 * Quem chama esse resolver pode confiar que:
 * - `effectivePersona` é o que a UI deve renderizar
 * - `isAdmin` indica se o switcher de persona deve aparecer
 * - `realRole` é o que está no banco (verdade absoluta)
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PERSONA_THEMES, roleToPersona, type Persona, type PersonaTheme } from "@/lib/persona-themes";

export type PersonaContext = {
  userId: string;
  clientId: string;
  clientName: string;
  realRole: string;
  realPersona: Persona;
  effectivePersona: Persona;
  isAdmin: boolean;
  isViewingAs: boolean;
  theme: PersonaTheme;
};

const VIEW_AS_COOKIE = "agraas_view_as";

export async function resolvePersona(): Promise<PersonaContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clientData } = await supabase
    .from("clients")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientData) return null;

  const realPersona = roleToPersona(clientData.role);
  const isAdmin = realPersona === "admin";

  let effectivePersona = realPersona;
  let isViewingAs = false;

  if (isAdmin) {
    const cookieStore = await cookies();
    const viewAs = cookieStore.get(VIEW_AS_COOKIE)?.value as Persona | undefined;
    if (viewAs && viewAs in PERSONA_THEMES && viewAs !== "admin") {
      effectivePersona = viewAs;
      isViewingAs = true;
    }
  }

  return {
    userId: user.id,
    clientId: clientData.id,
    clientName: clientData.name,
    realRole: clientData.role,
    realPersona,
    effectivePersona,
    isAdmin,
    isViewingAs,
    theme: PERSONA_THEMES[effectivePersona],
  };
}

/**
 * Guard server-side: garante que apenas personas autorizadas acessem a rota.
 * Redireciona para login (não autenticado) ou para a home da própria persona
 * (autenticado mas no lugar errado).
 *
 * Admin sempre passa em qualquer guard — exceto se ele estiver "viewing as"
 * uma persona específica, aí respeita a simulação.
 */
export async function requirePersona(allowed: Persona[]): Promise<PersonaContext> {
  const ctx = await resolvePersona();
  if (!ctx) redirect("/login");

  // Admin sem cookie de view_as: passa em tudo.
  // Admin com cookie: respeita simulação (tem que estar em `allowed`).
  if (ctx.isAdmin && !ctx.isViewingAs) return ctx;

  if (!allowed.includes(ctx.effectivePersona)) {
    redirect(ctx.theme.home);
  }

  return ctx;
}

/**
 * Conjuntos pré-definidos pra simplificar uso nas páginas.
 */
export const PRODUCER_ROUTES: Persona[] = ["produtor", "admin"];
export const FRIGORIFICO_ROUTES: Persona[] = ["frigorifico", "admin"];
export const BANCO_ROUTES: Persona[] = ["banco", "admin"];
export const CONTADOR_ROUTES: Persona[] = ["contador", "admin"];
export const ADMIN_ONLY: Persona[] = ["admin"];
