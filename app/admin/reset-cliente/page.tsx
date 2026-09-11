/**
 * /admin/reset-cliente — zera o dado operacional de um cliente, preservando a
 * conta. Criado em 11/09/2026 para trocar o seed da FSJBE por dados reais.
 *
 * Fluxo: escolher cliente → Inventariar (só conta) → digitar o e-mail do
 * cliente → Apagar → conferir a contagem "depois" (tem de ser zero).
 * A lógica está em lib/admin/reset-cliente.ts; a rota, em
 * app/api/admin/reset-cliente.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { requirePersona, ADMIN_ONLY } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import ResetClienteForm from "@/app/admin/reset-cliente/ResetClienteForm";
import { PRESERVADAS } from "@/lib/admin/reset-cliente";

export const dynamic = "force-dynamic";

export default async function AdminResetClientePage() {
  const ctx = await requirePersona(ADMIN_ONLY);
  const db = createSupabaseServiceClient();

  const { data } = await db
    .from("clients")
    .select("id, name, email, role")
    .order("name", { ascending: true });

  const clientes = (data ?? []) as { id: string; name: string; email: string; role: string }[];

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Admin · Dados de cliente
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">
            Zerar dados de um cliente
          </h1>
          <p className="text-[var(--text-secondary)] mt-3 max-w-2xl">
            Apaga animais, notas fiscais, estoque, vendas, lotes, propriedades e todo o
            resto ligado ao cliente — para começar com dados reais. A conta de acesso
            continua igual; o plano de contas também.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Nunca toca: {PRESERVADAS.join(", ")}.
          </p>
        </header>

        <ResetClienteForm clientes={clientes} />
      </div>
    </PersonaShell>
  );
}
