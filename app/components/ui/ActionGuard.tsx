"use client";

import { useRole } from "@/app/components/RoleContext";
import type { ReactNode } from "react";

interface ActionGuardProps {
  /** Conteúdo a ser protegido (botão, link, formulário, etc.) */
  children: ReactNode;
  /** Conteúdo alternativo quando usuário não pode editar (só usado em mode='hide') */
  fallback?: ReactNode;
  /** Como tratar usuários sem permissão */
  mode?: "hide" | "disable" | "tooltip";
}

/**
 * Wrapper que esconde/desabilita ações baseado em role do usuário.
 *
 * - 'hide' (default): não renderiza nada (ou fallback se passado)
 * - 'disable': renderiza com opacity-50 + pointer-events-none + title tooltip
 * - 'tooltip': mostra tooltip "Modo Visualização" no hover
 *
 * Exemplos:
 *   <ActionGuard>
 *     <button>Novo Animal</button>
 *   </ActionGuard>
 *
 *   <ActionGuard mode="disable">
 *     <button>Salvar</button>
 *   </ActionGuard>
 *
 *   <ActionGuard mode="hide" fallback={<span className="text-xs text-muted">—</span>}>
 *     <button>Editar</button>
 *   </ActionGuard>
 */
export function ActionGuard({
  children,
  fallback = null,
  mode = "hide",
}: ActionGuardProps) {
  const { canEdit } = useRole();

  if (canEdit) return <>{children}</>;

  if (mode === "hide") return <>{fallback}</>;

  if (mode === "disable") {
    return (
      <div
        className="opacity-50 pointer-events-none cursor-not-allowed select-none"
        title="Modo Visualização — ação não disponível"
        aria-disabled="true"
      >
        {children}
      </div>
    );
  }

  if (mode === "tooltip") {
    return (
      <div className="relative group inline-block">
        <div className="opacity-50 cursor-not-allowed pointer-events-none">
          {children}
        </div>
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-2 py-1 rounded shadow-sm whitespace-nowrap hidden group-hover:block z-50"
          role="tooltip"
        >
          Modo Visualização
        </span>
      </div>
    );
  }

  return null;
}
