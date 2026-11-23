import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type GestaoContexto = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  email: string;
  clientId: string;
  clientName: string;
};

/**
 * Resolve usuário + cliente do portal Agraas Gestão. Toda leitura passa pela
 * sessão do usuário (RLS), nunca pelo service role.
 */
export async function contextoGestao(): Promise<GestaoContexto> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/gestao/entrar");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) redirect("/gestao/entrar?erro=sem-conta");

  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    clientId: client.id as string,
    clientName: (client.name as string) ?? "Minha fazenda",
  };
}

/**
 * true quando o erro do PostgREST indica tabela inexistente (migration ainda
 * não aplicada). As telas mostram "em ativação" em vez de quebrar.
 */
export function tabelaAusente(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "");
}
