"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RoleInfo } from "@/lib/auth/getCurrentRole";

const DEFAULT_ROLE_INFO: RoleInfo = {
  role: "viewer",
  isMentorExterno: false,
  canEdit: false,
  userId: null,
  defaultClientId: null,
};

const RoleContext = createContext<RoleInfo>(DEFAULT_ROLE_INFO);

export function RoleProvider({
  value,
  children,
}: {
  value: RoleInfo;
  children: ReactNode;
}) {
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/**
 * Hook client-side pra ler o role + flags do usuário corrente.
 *
 * Uso:
 *   const { role, isMentorExterno, canEdit } = useRole();
 *   if (!canEdit) return null;
 *
 * O value é populado uma vez no <RoleProvider> em app/layout.tsx via
 * getCurrentRole() (server-side). Não muda dentro da página — pra mudar
 * role mid-session, precisa de refresh.
 */
export function useRole(): RoleInfo {
  return useContext(RoleContext);
}
