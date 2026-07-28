import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * BackLink — link de navegação "voltar para X" padronizado.
 *
 * Fonte única para os links de retorno de nível de página (topo de telas de
 * detalhe/formulário). Não usar para navegação em passos de wizard (isso é
 * `onClick` local, não `href`) nem para sub-rails de navegação já existentes
 * (ControladoriaSidebarNav, sidebars de persona, AdminSwitcher).
 *
 * Em contextos de fundo escuro (ex.: dentro de `PersonaShell`), sobrescreva a
 * cor via `className` usando o modificador `!` do Tailwind, ex.:
 *   <BackLink href="/banco" label="Voltar para o portfólio"
 *     className="!text-white/65 hover:!text-white/90" />
 */
export function BackLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] ${className}`}
    >
      <ArrowLeft size={14} />
      {label}
    </Link>
  );
}
