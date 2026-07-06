/**
 * /cadastro/confirmacao — página genérica pós-signup.
 *
 * P2.1 pentest fix: tanto o fluxo de email novo (confirmação pendente) quanto
 * email já cadastrado (Supabase retorna identities:[]) chegam aqui.
 * A UX é idêntica — não revela se o email existia ou não.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifique seu e-mail · Agraas",
  robots: { index: false },
};

export default function CadastroConfirmacaoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="ag-card-strong w-full max-w-md space-y-6 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-[var(--primary)]"
            aria-hidden="true"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Verifique seu e-mail
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
            Se este endereço estiver associado a uma conta Agraas, você receberá
            um e-mail com as instruções para acessar a plataforma.
          </p>
        </div>

        <p className="text-sm text-[var(--text-muted)]">
          Não recebeu?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Tente fazer login
          </Link>{" "}
          ou verifique a pasta de spam.
        </p>
      </div>
    </div>
  );
}
