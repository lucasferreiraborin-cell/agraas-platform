"use client";

import { Suspense, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import AuthShell from "@/app/components/ui/AuthShell";

function Formulario() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const semConta = params.get("erro") === "sem-conta";

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push("/gestao");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

  return (
    <>
      <div>
        <p className="text-[.75rem] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Agraas Gestão</p>
        <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
          Entrar na gestão da fazenda
        </h1>
        <p className="mt-2 text-[.9375rem] text-[var(--text-muted)]">
          Notas, contas, diesel e fechamento do mês — pecuária e lavoura no mesmo lugar.
        </p>
      </div>

      {semConta && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[.8125rem] text-amber-800">
          Seu acesso ainda não está ligado a uma fazenda. Fale com a equipe Agraas.
        </div>
      )}

      <form onSubmit={entrar} className="mt-8 space-y-4">
        <div>
          <label htmlFor="g-email" className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">E-mail</label>
          <input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className={inputCls} placeholder="seu@email.com" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="g-senha" className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">Senha</label>
          <input id="g-senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className={inputCls} placeholder="••••••••" autoComplete="current-password" />
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">{error}</div>
        )}
        <button type="submit" disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? (<><Loader2 size={16} className="animate-spin" /> Entrando</>) : (<>Entrar <ArrowRight size={15} /></>)}
        </button>
      </form>

      <p className="mt-8 text-center text-[.8125rem] text-[var(--text-muted)]">
        Esqueceu a senha?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">Recuperar acesso</Link>
        {" · "}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">Rastreio e passaporte</Link>
      </p>
    </>
  );
}

export default function GestaoEntrarPage() {
  return (
    <AuthShell
      sidebarTitle="Agraas Gestão"
      sidebarMessage="A nota entra. Conta a pagar, estoque, custo e contabilidade saem prontos."
      sidebarBadges={["NF-e", "Contas a pagar", "Diesel", "LCDPR"]}
    >
      <Suspense fallback={null}>
        <Formulario />
      </Suspense>
    </AuthShell>
  );
}
