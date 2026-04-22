"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import AuthShell from "@/app/components/ui/AuthShell";

const SIDEBAR_MESSAGES_LOGIN = [
  "Do pasto brasileiro ao comprador do outro lado do mundo.",
  "Cada animal, cada saca, auditável em tempo real.",
  "A camada de confiança do agro brasileiro.",
];

const SIDEBAR_MESSAGES_RESET = [
  "Recuperar o acesso é simples. Enviamos um link direto para seu e-mail.",
];

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const [showReset, setShowReset]         = useState(false);
  const [resetEmail, setResetEmail]       = useState("");
  const [resetLoading, setResetLoading]   = useState(false);
  const [resetSent, setResetSent]         = useState(false);
  const [resetError, setResetError]       = useState("");

  const [messageIdx, setMessageIdx] = useState(0);
  const messages = showReset ? SIDEBAR_MESSAGES_RESET : SIDEBAR_MESSAGES_LOGIN;

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  useEffect(() => {
    if (showReset) return;
    const id = setInterval(() => {
      setMessageIdx((i) => (i + 1) % SIDEBAR_MESSAGES_LOGIN.length);
    }, 6000);
    return () => clearInterval(id);
  }, [showReset]);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

  return (
    <AuthShell
      sidebarMessage={messages[messageIdx]}
      sidebarBadges={["Halal", "EUDR", "MAPA", "SIF"]}
    >
      {!showReset ? (
        <>
          <div>
            <h1 className="text-[1.8rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
              Entrar na plataforma
            </h1>
            <p className="mt-2 text-[.9375rem] text-[var(--text-muted)]">
              Acesse o passaporte digital, scores e marketplace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(true);
                    setResetEmail(email);
                  }}
                  className="text-[.75rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--primary)]"
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[.875rem] text-[var(--text-muted)]">
            Não tem conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setShowReset(false);
              setResetSent(false);
              setResetError("");
            }}
            className="mb-6 inline-flex items-center gap-1.5 text-[.8125rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            ← Voltar para o login
          </button>

          <div>
            <h1 className="text-[1.8rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
              Redefinir senha
            </h1>
            <p className="mt-2 text-[.9375rem] text-[var(--text-muted)]">
              Enviaremos um link de redefinição para seu e-mail.
            </p>
          </div>

          {resetSent ? (
            <div className="mt-8 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-5 py-4 text-[.875rem] text-[var(--primary)]">
              ✓ Link enviado. Verifique sua caixa de entrada (e o spam).
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  E-mail
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="seu@email.com"
                />
              </div>

              {resetError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">
                  {resetError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {resetLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando
                  </>
                ) : (
                  "Enviar link"
                )}
              </button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  );
}
