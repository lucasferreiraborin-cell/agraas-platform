/**
 * /admin/contas — quem é quem: cada linha de `clients`, seu papel e se tem
 * login. Criado em 14/09/2026 para o Lucas deixar SÓ lucas@agraas.com.br
 * como admin e conferir se há e-mail duplicado (duas contas para a FSJBE).
 */

import { requirePersona, ADMIN_ONLY } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import ContasForm from "@/app/admin/contas/ContasForm";

export const dynamic = "force-dynamic";

export default async function AdminContasPage() {
  const ctx = await requirePersona(ADMIN_ONLY);

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Admin · Contas e papéis
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">
            Quem vê o quê
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 max-w-2xl">
            A RLS libera tudo para quem tem papel <span className="font-mono">admin</span>. Cada
            conta que não for a sua deve ser <span className="font-mono">client</span> (produtor),
            <span className="font-mono"> accountant</span> (contador), <span className="font-mono">buyer</span> (frigorífico)
            ou <span className="font-mono">bank</span>. E-mail duplicado = duas contas para a mesma pessoa —
            o login cai numa, os dados estão na outra.
          </p>
        </header>
        <ContasForm />
      </div>
    </PersonaShell>
  );
}
