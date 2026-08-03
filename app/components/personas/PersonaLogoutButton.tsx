"use client";

/**
 * Botão de logout compartilhado pelos shells de persona (banco, contador,
 * frigorífico). Fica no rodapé fixo da sidebar do PersonaShell — sempre
 * visível, fora da área rolável da nav.
 *
 * Logout client-side igual ao LogoutButton global: NÃO existe rota
 * /api/auth/logout (um <Link> pra ela dava 404 no clique e no prefetch RSC).
 */

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut } from "lucide-react";

export default function PersonaLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/55 transition duration-200 hover:bg-white/8 hover:text-white"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-white/65 transition group-hover:bg-white/10 group-hover:text-white">
        <LogOut size={15} />
      </span>
      <span>Sair</span>
    </button>
  );
}
