"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [done, setDone]               = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Supabase redireciona com #access_token no hash — precisa trocar pela sessão
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Não foi possível redefinir a senha. O link pode ter expirado.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 2500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7F4]">
      <div className="w-full max-w-md px-6">
        <div className="mb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--text-muted)]">
            Plataforma
          </p>
          <h1 className="mt-3 text-[3.5rem] font-semibold leading-none tracking-[-0.07em] text-[var(--text-primary)]">
            Agraas
          </h1>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Nova senha
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Escolha uma nova senha para sua conta.
          </p>

          {done ? (
            <div className="mt-6 rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700">
              ✓ Senha redefinida com sucesso. Redirecionando...
            </div>
          ) : !sessionReady ? (
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-700">
              Aguardando validação do link... Se nada acontecer, solicite um novo link de redefinição.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  placeholder="mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
