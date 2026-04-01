"use client";

import { type Lang, LANG_BUTTON, LANGS } from "@/lib/passport-i18n";

interface LanguageToggleProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

/**
 * Toggle de idioma para o passaporte público: 🇧🇷 PT | 🇬🇧 EN | 🇸🇦 AR
 * Sempre renderizado em LTR (é um controle de navegação, não conteúdo).
 */
export default function LanguageToggle({ lang, onChange }: LanguageToggleProps) {
  return (
    <div dir="ltr" className="flex rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] p-0.5">
      {LANGS.map((lc) => (
        <button
          key={lc}
          onClick={() => onChange(lc)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
            lang === lc
              ? "bg-white shadow text-[#1a1a2e]"
              : "text-[#9ca3af] hover:text-[#6b7280]"
          }`}
          aria-pressed={lang === lc}
          aria-label={`Switch to ${lc.toUpperCase()}`}
        >
          {LANG_BUTTON[lc]}
        </button>
      ))}
    </div>
  );
}
