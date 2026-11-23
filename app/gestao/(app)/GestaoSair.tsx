"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function GestaoSair() {
  const router = useRouter();
  async function sair() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    await supabase.auth.signOut();
    router.push("/gestao/entrar");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={sair}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3.5 py-2 text-[.8rem] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:text-[var(--text-primary)]"
    >
      <LogOut size={14} />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
