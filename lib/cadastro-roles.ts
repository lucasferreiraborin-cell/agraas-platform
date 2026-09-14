/**
 * Perfil declarado no cadastro → papel em `clients` → rota inicial.
 *
 * Extraído de app/cadastro/page.tsx em 14/09/2026 (T-01) para que a página,
 * a rota server-side /api/cadastro/finalizar e os testes usem a MESMA tabela.
 *
 * Exportador, fornecedor, parceiro e visitante entram como `client`: não há
 * persona própria e um role desconhecido levaria a pessoa a um painel vazio.
 */

export const PERFIL_PARA_ROLE: Record<string, string> = {
  fazendeiro:  "client",
  contador:    "accountant",
  frigorifico: "buyer",
};

export function roleDoPerfil(perfil: string): string {
  return PERFIL_PARA_ROLE[perfil] ?? "client";
}

/** Para onde mandar depois do cadastro, conforme a persona. */
export const ROTA_POS_CADASTRO: Record<string, string> = {
  accountant: "/contador",
  buyer:      "/comprador",
};

export function rotaPosCadastro(role: string): string {
  return ROTA_POS_CADASTRO[role] ?? "/painel";
}

/** Papéis que o cadastro público pode atribuir — 'admin' nunca. */
export const ROLES_DE_CADASTRO = ["client", "accountant", "buyer"] as const;
