"use client";

import { useRole } from "@/app/components/RoleContext";

/**
 * Badge que aparece SOMENTE pra usuários mentor_externo.
 * Sinaliza visualmente o modo somente-leitura, sem bloquear interação.
 *
 * Para admin/client/buyer/viewer → retorna null (sem render).
 *
 * Posicionado no header global (app/layout.tsx) ao lado de environmentLabel.
 */
export function MentorViewBadge() {
  const { isMentorExterno } = useRole();
  if (!isMentorExterno) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
      role="status"
      aria-label="Modo Visualização"
    >
      <span aria-hidden="true">👁️</span>
      <span>Modo Visualização — Mentoria</span>
    </div>
  );
}
