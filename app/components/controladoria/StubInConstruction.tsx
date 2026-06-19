import type { LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";

/**
 * Stub padrão das subpáginas do módulo Controladoria que ainda
 * não foram implementadas (Sprint G2). Mantém badge, título e
 * descrição reais — para o usuário não ver tela vazia.
 */
export default function StubInConstruction({
  badge,
  title,
  description,
  bullets,
  icon: Icon = Wrench,
}: {
  badge: string;
  title: string;
  description: string;
  bullets?: string[];
  icon?: LucideIcon;
}) {
  return (
    <main className="space-y-8">
      <PageHeader badge={badge} title={title} description={description} />

      <section className="ag-card-strong p-10">
        <div className="flex items-start gap-5">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--text-secondary)]">
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Sprint G2
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              Em construção
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Esta área entra na próxima onda do módulo Controladoria. A casca
              já está alocada na navegação para refletir o escopo final do
              wedge.
            </p>
            {bullets && bullets.length > 0 && (
              <ul className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
