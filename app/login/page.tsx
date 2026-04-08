"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import AgraasLogo from "@/app/components/AgraasLogo";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { ShieldCheck, Wheat, Award } from "lucide-react";

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
    <div className="flex min-h-screen flex-col md:flex-row">

      {/* ── LEFT — Institutional ─────────────────────────────────────────── */}
      <div
        className="flex w-full flex-col justify-between px-8 py-8 text-white md:w-[55%] md:px-14 md:py-12"
        style={{ background: "linear-gradient(160deg, #3d762c 0%, #294f1d 100%)" }}
      >
        {/* Mobile: compact header · Desktop: full layout */}
        <div>
          {/* Logo + Badge */}
          <div className="flex items-center justify-center gap-5 md:justify-start">
            <AgraasLogo size={64} />
            <HalalBadgeSVG size={80} />
          </div>

          {/* Tagline — hidden on mobile */}
          <p className="mt-6 hidden text-lg font-normal leading-8 text-white/85 md:block" style={{ fontFamily: "Inter, sans-serif" }}>
            A infraestrutura digital do agro brasileiro
          </p>

          {/* Divider — hidden on mobile */}
          <div className="mt-8 hidden border-t border-white/20 md:block" />

          {/* Value props — hidden on mobile */}
          <div className="mt-8 hidden space-y-6 md:block">
            <ValueProp icon={ShieldCheck} title="Passaporte Digital" description="Rastreabilidade individual por animal" />
            <ValueProp icon={Wheat} title="Grain ID" description="Grãos rastreados do talhão a Jeddah" />
            <ValueProp icon={Award} title="Conformidade Halal" description="Certificação verificável para o mercado árabe" />
          </div>
        </div>

        {/* Footer — hidden on mobile */}
        <p className="mt-10 hidden text-[11px] text-white/40 md:block">
          Agraas Platform v1.0 · 2026
        </p>
      </div>

      {/* ── RIGHT — Form ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-10" style={{ background: "#f8faf7" }}>
        <div className="w-full max-w-sm">

          {/* Small logo icon */}
          <div className="mb-8 flex justify-center md:justify-start">
            <AgraasLogo size={36} />
          </div>

          {!showReset ? (
            <>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "Inter, sans-serif" }}>
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Acesse sua conta Agraas
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
                    placeholder="seu@email.com"
                    style={{ borderRadius: 18 }}
                    className="w-full border border-[#d1e8c7] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#5d9c44] focus:ring-2 focus:ring-[#5d9c44]/20"
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
                    placeholder="••••••••"
                    style={{ borderRadius: 18 }}
                    className="w-full border border-[#d1e8c7] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#5d9c44] focus:ring-2 focus:ring-[#5d9c44]/20"
                  />
                </div>

                {error && (
                  <div className="ag-form-error">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ borderRadius: 18, height: 48, fontFamily: "Inter, sans-serif" }}
                  className="w-full bg-[#5d9c44] text-[15px] font-semibold text-white transition hover:bg-[#4f8a38] disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setShowReset(true); setResetEmail(email); }}
                    className="text-[13px] text-[#5d9c44] transition hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>

              <div className="mt-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs text-[var(--text-muted)]">Plataforma restrita a clientes Agraas</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setShowReset(false); setResetSent(false); setResetError(""); }}
                className="mb-6 text-[13px] text-[#5d9c44] transition hover:underline"
              >
                ← Voltar para o login
              </button>

              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                Redefinir senha
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Informe seu e-mail e enviaremos um link de redefinição.
              </p>

              {resetSent ? (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
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
                      placeholder="seu@email.com"
                      style={{ borderRadius: 18 }}
                      className="w-full border border-[#d1e8c7] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#5d9c44] focus:ring-2 focus:ring-[#5d9c44]/20"
                    />
                  </div>

                  {resetError && (
                    <div className="ag-form-error">{resetError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{ borderRadius: 18, height: 48, fontFamily: "Inter, sans-serif" }}
                    className="w-full bg-[#5d9c44] text-[15px] font-semibold text-white transition hover:bg-[#4f8a38] disabled:opacity-60"
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

function ValueProp({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <Icon size={20} className="mt-0.5 shrink-0 text-white/80" />
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm text-white/55">{description}</p>
      </div>
    </div>
  );
}
