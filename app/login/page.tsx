"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Forgot password state
  const [showReset, setShowReset]         = useState(false);
  const [resetEmail, setResetEmail]       = useState("");
  const [resetLoading, setResetLoading]   = useState(false);
  const [resetSent, setResetSent]         = useState(false);
  const [resetError, setResetError]       = useState("");

  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetError("Não foi possível enviar o e-mail. Verifique o endereço.");
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7F4]">
      <div className="w-full max-w-md px-6">
        <div className="mb-10 flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--text-muted)]">
              Plataforma
            </p>
            <h1 className="mt-3 text-[3.5rem] font-semibold leading-none tracking-[-0.07em] text-[var(--text-primary)]">
              Agraas
            </h1>
            <p className="mt-3 text-base text-[var(--text-secondary)]">
              Intelligence Layer
            </p>
          </div>
          <HalalBadgeSVG size={100} />
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-soft)]">
          {!showReset ? (
            <>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Entrar na plataforma
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Acesso restrito a usuários cadastrados.
              </p>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowReset(true); setResetEmail(email); }}
                  className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
                >
                  Esqueci minha senha
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setShowReset(false); setResetSent(false); setResetError(""); }}
                className="mb-5 flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
              >
                ← Voltar para o login
              </button>

              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Redefinir senha
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Informe seu e-mail e enviaremos um link de redefinição.
              </p>

              {resetSent ? (
                <div className="mt-6 rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700">
                  ✓ Enviamos um link de redefinição para seu e-mail.
                </div>
              ) : (
                <form onSubmit={handleResetRequest} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                      placeholder="seu@email.com"
                    />
                  </div>

                  {resetError && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      {resetError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  >
                    {resetLoading ? "Enviando..." : "Enviar link de redefinição"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
