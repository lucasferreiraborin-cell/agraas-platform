/**
 * Sistema de temas por persona — paletas distintas que dão a cada tipo de
 * usuário uma identidade visual própria.
 *
 * Decisão Lucas 17/06/2026: "Cada tipo de perfil vai ter um layout e
 * configuração para entregarmos o que cada um foca em ver."
 *
 * Filosofia:
 * - Produtor (verde floresta): operação, campo, vida — tema atual da Agraas
 * - Frigorífico (cobre/burgundy): industrial, abate, processamento de carne
 * - Banco (navy/dourado): instituicional, financeira, conservador
 * - Admin (grafite + vermelho): controle, operação interna Agraas
 */

export type Persona = "produtor" | "frigorifico" | "banco" | "admin";

export type PersonaTheme = {
  persona: Persona;
  label: string;
  shortLabel: string;
  /** Cor de fundo da sidebar (escura, alta contrast com fonte branca) */
  sidebarBg: string;
  /** Cor de acento (chips, badges, hovers, gráficos) */
  accent: string;
  /** Cor de acento escura (ring, foco) */
  accentDark: string;
  /** Cor de texto sobre o acento */
  accentText: string;
  /** Cor de background principal do main */
  mainBg: string;
  /** Rota home da persona (para onde redirecionar após login) */
  home: string;
  /** Rota onde aparece um chip/label de "modo" indicando contexto */
  topLabel: string;
};

export const PERSONA_THEMES: Record<Persona, PersonaTheme> = {
  produtor: {
    persona: "produtor",
    label: "Produtor Rural",
    shortLabel: "Produtor",
    sidebarBg: "#0d1f17",   // verde floresta profundo (atual)
    accent: "#4ade80",      // verde-claro vivo
    accentDark: "#16a34a",
    accentText: "#0d1f17",
    mainBg: "#0a0a0a",
    home: "/painel",
    topLabel: "Operação · Campo",
  },
  frigorifico: {
    persona: "frigorifico",
    label: "Frigorífico / Comprador",
    shortLabel: "Frigorífico",
    sidebarBg: "#1a0f08",   // marrom queimado profundo
    accent: "#ea580c",      // cobre industrial
    accentDark: "#9a3412",
    accentText: "#fafafa",
    mainBg: "#0e0907",
    home: "/comprador",
    topLabel: "Indústria · Compras",
  },
  banco: {
    persona: "banco",
    label: "Instituição Financeira",
    shortLabel: "Banco",
    sidebarBg: "#0a1124",   // navy profundo
    accent: "#fbbf24",      // dourado institucional
    accentDark: "#b45309",
    accentText: "#0a1124",
    mainBg: "#06080f",
    home: "/banco",
    topLabel: "Crédito · Análise",
  },
  admin: {
    persona: "admin",
    label: "Admin Agraas",
    shortLabel: "Admin",
    sidebarBg: "#1a1a1a",   // grafite
    accent: "#dc2626",      // vermelho de alerta/admin
    accentDark: "#991b1b",
    accentText: "#fafafa",
    mainBg: "#0a0a0a",
    home: "/painel",        // admin default vai pro painel produtor
    topLabel: "Admin · Visão Total",
  },
};

/** Mapeamento entre clients.role do banco e persona visual */
export function roleToPersona(role: string | null | undefined): Persona {
  switch (role) {
    case "admin":
      return "admin";
    case "buyer":
      return "frigorifico";
    case "bank":
      return "banco";
    case "client":
    default:
      return "produtor";
  }
}

/** Gera CSS vars para injetar no <body> de cada layout */
export function themeToCssVars(t: PersonaTheme): React.CSSProperties {
  return {
    ["--persona-accent" as string]: t.accent,
    ["--persona-accent-dark" as string]: t.accentDark,
    ["--persona-accent-text" as string]: t.accentText,
    ["--persona-sidebar-bg" as string]: t.sidebarBg,
    ["--persona-main-bg" as string]: t.mainBg,
  };
}
