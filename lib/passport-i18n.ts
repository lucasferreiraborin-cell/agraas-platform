export type Lang = "pt" | "en" | "ar";

export const LANGS: Lang[] = ["pt", "en", "ar"];

// ── Tabela de traduções ───────────────────────────────────────────────────────

const T = {
  pt: {
    // Header
    publicPassport:  "Passaporte Público",
    agraasPassport:  "Passaporte Agraas",
    verified:        "Verificado",

    // Identity card fields
    breed:           "Raça",
    sex:             "Sexo",
    born:            "Nascimento",
    age:             "Idade",
    months:          "meses",
    farmOrigin:      "Fazenda de origem",

    // Sex values
    sexMale:         "Macho",
    sexFemale:       "Fêmea",

    // Score
    agraasScore:     "Agraas Score",
    excellent:       "Excelente",
    regular:         "Regular",
    basic:           "Básico",
    lastWeight:      "Último peso registrado",

    // Certifications
    activeCerts:     "Certificações Ativas",
    until:           "até",

    // Sanitary history
    sanitaryHistory: "Histórico Sanitário — Últimos 12 meses",

    // Status values
    statusActive:    "Ativo",
    statusEligible:  "Elegível",
    statusWithdrawal:"Em carência",

    // Footer
    footer: (date: string) =>
      `Passaporte gerado em ${date} pela plataforma Agraas. Documento de rastreabilidade pecuária.`,
  },

  en: {
    // Header
    publicPassport:  "Public Passport",
    agraasPassport:  "Agraas Passport",
    verified:        "Verified",

    // Identity card fields
    breed:           "Breed",
    sex:             "Sex",
    born:            "Born",
    age:             "Age",
    months:          "months",
    farmOrigin:      "Farm of origin",

    // Sex values
    sexMale:         "Male",
    sexFemale:       "Female",

    // Score
    agraasScore:     "Agraas Score",
    excellent:       "Excellent",
    regular:         "Regular",
    basic:           "Basic",
    lastWeight:      "Last recorded weight",

    // Certifications
    activeCerts:     "Active Certifications",
    until:           "until",

    // Sanitary history
    sanitaryHistory: "Sanitary History — Last 12 months",

    // Status values
    statusActive:    "Active",
    statusEligible:  "Eligible",
    statusWithdrawal:"Withdrawal period",

    // Footer
    footer: (date: string) =>
      `Passport generated on ${date} by the Agraas platform. Livestock traceability document.`,
  },

  ar: {
    // Header
    publicPassport:  "جواز السفر العام",
    agraasPassport:  "جواز سفر أغراس",
    verified:        "تم التحقق",

    // Identity card fields
    breed:           "السلالة",
    sex:             "الجنس",
    born:            "تاريخ الميلاد",
    age:             "العمر",
    months:          "أشهر",
    farmOrigin:      "مزرعة المنشأ",

    // Sex values
    sexMale:         "ذكر",
    sexFemale:       "أنثى",

    // Score
    agraasScore:     "Agraas Score",
    excellent:       "ممتاز",
    regular:         "منتظم",
    basic:           "أساسي",
    lastWeight:      "آخر وزن مسجل",

    // Certifications
    activeCerts:     "الشهادات النشطة",
    until:           "حتى",

    // Sanitary history
    sanitaryHistory: "السجل الصحي — آخر 12 شهراً",

    // Status values
    statusActive:    "نشط",
    statusEligible:  "مؤهل",
    statusWithdrawal:"فترة الانتظار",

    // Footer
    footer: (date: string) =>
      `تم إنشاء جواز السفر بتاريخ ${date} بواسطة منصة أغراس. وثيقة تتبع الثروة الحيوانية.`,
  },
} as const;

type TranslationKey = keyof typeof T["pt"];

/** Retorna a string traduzida para o idioma fornecido. */
export function t(lang: Lang, key: TranslationKey): string {
  return (T[lang] as Record<string, unknown>)[key] as string;
}

/** Retorna o texto do footer traduzido, com a data formatada no idioma correto. */
export function tFooter(lang: Lang, date: string): string {
  return T[lang].footer(date);
}

/** Formata uma data no locale correto para o idioma. */
export function fmtDateI18n(d: string | null, lang: Lang): string {
  if (!d) return "—";
  const locale = lang === "pt" ? "pt-BR" : lang === "ar" ? "ar-SA" : "en-US";
  return new Date(d).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Retorna o label de sexo traduzido. */
export function tSex(lang: Lang, sex: string | null): string {
  if (!sex) return "—";
  if (sex === "M" || sex.toLowerCase() === "male")   return t(lang, "sexMale");
  if (sex === "F" || sex.toLowerCase() === "female") return t(lang, "sexFemale");
  return sex;
}

/** Retorna o label de status traduzido. */
export function tStatus(lang: Lang, status: string | null): string {
  if (!status) return "—";
  const map: Record<string, TranslationKey> = {
    ativo:       "statusActive",
    active:      "statusActive",
    elegivel:    "statusEligible",
    elegível:    "statusEligible",
    eligible:    "statusEligible",
    em_carencia: "statusWithdrawal",
    withdrawal:  "statusWithdrawal",
  };
  const key = map[status.toLowerCase()];
  return key ? t(lang, key) : status;
}

/** Label do botão de idioma (flag + sigla). */
export const LANG_BUTTON: Record<Lang, string> = {
  pt: "🇧🇷 PT",
  en: "🇬🇧 EN",
  ar: "🇸🇦 AR",
};
