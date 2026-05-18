import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Role =
  | "admin"
  | "client"
  | "buyer"
  | "mentor_externo"
  | "viewer";

export type RoleInfo = {
  role: Role;
  isMentorExterno: boolean;
  canEdit: boolean;
  userId: string | null;
  defaultClientId: string | null;
};

const ANONYMOUS: RoleInfo = {
  role: "viewer",
  isMentorExterno: false,
  canEdit: false,
  userId: null,
  defaultClientId: null,
};

/**
 * Resolve a role do usuário autenticado via cookies SSR.
 *
 * Hierarquia de checagem:
 *  1. Anônimo (sem sessão)               → 'viewer', canEdit=false
 *  2. is_mentor_externo() = true (RPC)   → 'mentor_externo', canEdit=false
 *  3. clients.role pelo auth_user_id     → role do tenant, canEdit=true
 *  4. Fallback (user existe mas sem row) → 'viewer', canEdit=false
 *
 * mentor_externo é checado ANTES do clients.role porque a conta compartilhada
 * mentoria.fsjbe não tem clients.auth_user_id próprio (o link é via
 * mentor_assignments).
 */
export async function getCurrentRole(): Promise<RoleInfo> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return ANONYMOUS;

  // 1) Checa mentor_externo via RPC (usa auth.uid() internamente)
  const { data: isMentor, error: mentorErr } = await supabase.rpc(
    "is_mentor_externo"
  );
  if (!mentorErr && isMentor === true) {
    const defaultClientId =
      (user.app_metadata?.default_client_id as string | undefined) ?? null;
    return {
      role: "mentor_externo",
      isMentorExterno: true,
      canEdit: false,
      userId: user.id,
      defaultClientId,
    };
  }

  // 2) Pega role do clients linkado por auth_user_id
  const { data: clientData } = await supabase
    .from("clients")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!clientData) {
    return {
      role: "viewer",
      isMentorExterno: false,
      canEdit: false,
      userId: user.id,
      defaultClientId: null,
    };
  }

  const role = (clientData.role as Role) ?? "viewer";
  return {
    role,
    isMentorExterno: false,
    canEdit: role !== "viewer",
    userId: user.id,
    defaultClientId: clientData.id ?? null,
  };
}
