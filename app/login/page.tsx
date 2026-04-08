"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import AgraasLogo from "@/app/components/AgraasLogo";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { Fingerprint, Wheat, ShieldCheck } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: Fingerprint,
    title: "Passaporte Digital",
    description: "Identidade digital única para cada animal — rastreabilidade completa da fazenda ao porto.",
  },
  {
    icon: Wheat,
    title: "Grain ID",
    description: "Documentação de embarque, laudos de qualidade e rastreio de grãos em tempo real.",
  },
  {
    icon: ShieldCheck,
    title: "Conformidade Halal",
    description: "Certificação Halal integrada, matriz de conformidade e relatórios para exportação.",
  },
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ═══ LEFT — Institutional ═══════════════════════════════════════════ */}
      <div className="relative flex w-full flex-col justify-between bg-[#1A5C38] px-8 py-10 text-white lg:w-[60%] lg:px-16 lg:py-14">
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(93,156,68,0.25)_0%,transparent_60%)]" />

        <div className="relative z-10">
          {/* Logo + Halal */}
          <div className="flex items-center gap-5">
            <AgraasLogo size={56} />
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.06em] lg:text-5xl">Agraas</h1>
              <p className="mt-1 text-sm text-white/60">Intelligence Layer</p>
            </div>
            <div className="ml-auto hidden sm:block">
              <HalalBadgeSVG size={52} />
            </div>
          </div>

          {/* Tagline */}
          <p className="mt-8 max-w-md text-lg font-medium leading-8 text-white/90 lg:mt-12 lg:text-xl">
            A infraestrutura digital do agro brasileiro
          </p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
            Rastreabilidade, performance produtiva e inteligência operacional para a cadeia pecuária e agrícola.
          </p>

          {/* Value props */}
          <div className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-14">
            {VALUE_PROPS.map((vp) => {
              const Icon = vp.icon;
              return (
                <div key={vp.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon size={20} className="text-emerald-300" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">{vp.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/50">{vp.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 mt-10 text-[11px] text-white/30 lg:mt-0">
          Agraas Platform v1.0 · Certificado pelo MAPA
        </p>
      </div>

      {/* ═══ RIGHT — Form ══════════════════════════════════════════════════ */}
      <div className="flex w-full flex-1 items-center justify-center bg-white px-6 py-12 lg:w-[40%] lg:px-12">
        <div className="w-full max-w-sm">
          {!showReset ? (
            <>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Acesse sua conta para continuar.
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
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
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
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="ag-form-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-green)] transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowReset(true); setResetEmail(email); }}
                  className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition"
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

              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Redefinir senha
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Informe seu e-mail e enviaremos um link de redefinição.
              </p>

              {resetSent ? (
                <div className="mt-6 rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700">
                  Enviamos um link de redefinição para seu e-mail.
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
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                      placeholder="seu@email.com"
                    />
                  </div>

                  {resetError && (
                    <div className="ag-form-error">
                      {resetError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-green)] transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
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
