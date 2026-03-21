"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
    >
      Sair
    </button>
  );
}
