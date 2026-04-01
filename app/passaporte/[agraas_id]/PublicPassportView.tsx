"use client";

import { useEffect, useState } from "react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import LanguageToggle from "@/app/components/LanguageToggle";
import {
  type Lang,
  t,
  tFooter,
  tSex,
  fmtDateI18n,
} from "@/lib/passport-i18n";

type Cert = {
  certification_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: string | null;
};
type SanitaryEntry = { product_name: string; application_date: string | null };

type Props = {
  animal: {
    agraas_id: string;
    internal_code: string | null;
    nickname: string | null;
    sex: string | null;
    breed: string | null;
    birth_date: string | null;
    status: string | null;
  };
  property: { name: string | null } | null;
  score: number;
  certifications: Cert[];
  sanitaryHistory: SanitaryEntry[];
  latestWeight: number | null;
  generatedAt: string;
};

const SCORE_META: Record<string, { key: "excellent" | "regular" | "basic"; color: string }> = {
  high:   { key: "excellent", color: "text-emerald-600" },
  medium: { key: "regular",   color: "text-amber-600"   },
  low:    { key: "basic",     color: "text-red-500"      },
};

function scoreLevel(s: number) {
  if (s >= 75) return "high";
  if (s >= 50) return "medium";
  return "low";
}

function ageMonths(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
}

// ── Lê idioma preferido: URL param → localStorage → "pt" ─────────────────────
function resolveInitialLang(): Lang {
  if (typeof window === "undefined") return "pt";
  const urlParam = new URLSearchParams(window.location.search).get("lang");
  if (urlParam === "pt" || urlParam === "en" || urlParam === "ar") return urlParam;
  const stored = localStorage.getItem("passport-lang");
  if (stored === "pt" || stored === "en" || stored === "ar") return stored;
  return "pt";
}

export default function PublicPassportView({
  animal,
  property,
  score,
  certifications,
  sanitaryHistory,
  latestWeight,
  generatedAt,
}: Props) {
  const [lang, setLang] = useState<Lang>("pt");

  // Resolve idioma no cliente (URL param ou localStorage)
  useEffect(() => {
    setLang(resolveInitialLang());
  }, []);

  // Persiste preferência
  useEffect(() => {
    localStorage.setItem("passport-lang", lang);
  }, [lang]);

  const isRtl       = lang === "ar";
  const months      = ageMonths(animal.birth_date);
  const level       = scoreLevel(score);
  const sm          = SCORE_META[level];
  const scoreColor  = sm.color;
  const scoreLabel  = t(lang, sm.key);
  const scorePercent = Math.max(6, Math.min(100, score));
  const hasHalal    = certifications.some(
    c => c.certification_name?.toLowerCase().includes("halal") && c.status === "active"
  );
  const activeCerts = certifications.filter(c => c.status === "active");

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={isRtl ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined}
      className="min-h-screen bg-[#f7f8fa] font-sans"
    >
      {/* Carrega fonte árabe apenas quando necessário */}
      {isRtl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap"
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#e5e7eb] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5d9c44] text-white text-sm font-bold">
              A
            </div>
            <span className="text-sm font-semibold text-[#1a1a2e]">Agraas</span>
            <span className="rounded-full bg-[#f0f7ec] px-2.5 py-0.5 text-[11px] font-semibold text-[#5d9c44]">
              {t(lang, "publicPassport")}
            </span>
          </div>
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-6 py-8">

        {/* ── Identity hero ──────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm border border-[#e5e7eb]">
          <div className="bg-[linear-gradient(135deg,#0f0f1a,#1a1a2e)] px-8 py-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  {t(lang, "agraasPassport")}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {animal.nickname ?? animal.internal_code ?? animal.agraas_id}
                </h1>
                <p className="mt-1 font-mono text-sm text-white/60" dir="ltr">
                  {animal.agraas_id}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {hasHalal && (
                  <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
                    ☪ Halal Certified
                  </span>
                )}
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                  {t(lang, "verified")}
                </span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-px bg-[#e5e7eb] sm:grid-cols-4">
            {[
              { label: t(lang, "breed"), value: animal.breed ?? "—" },
              { label: t(lang, "sex"),   value: tSex(lang, animal.sex) },
              { label: t(lang, "born"),  value: fmtDateI18n(animal.birth_date, lang) },
              {
                label: t(lang, "age"),
                value: months ? `${months} ${t(lang, "months")}` : "—",
              },
            ].map(item => (
              <div key={item.label} className="bg-white px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af]">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1a1a2e]">{item.value}</p>
              </div>
            ))}
          </div>

          {property && (
            <div className="border-t border-[#e5e7eb] px-8 py-4">
              <span className="text-xs text-[#9ca3af]">{t(lang, "farmOrigin")}: </span>
              <span className="text-sm font-semibold text-[#1a1a2e]">{property.name}</span>
            </div>
          )}
        </section>

        {/* ── Score ──────────────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e5e7eb]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                {t(lang, "agraasScore")}
              </p>
              <p className={`mt-1 text-4xl font-semibold tracking-tight ${scoreColor}`}>
                {score}
              </p>
              <p className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</p>
            </div>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-[#f3f4f6]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8dbc5f] to-[#5d9c44] transition-all"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
              <p className="mt-2 text-right text-xs text-[#9ca3af]" dir="ltr">
                {scorePercent}/100
              </p>
            </div>
          </div>
          {latestWeight && (
            <p className="mt-4 text-sm text-[#6b7280]">
              {t(lang, "lastWeight")}: <strong>{latestWeight} kg</strong>
            </p>
          )}
        </section>

        {/* ── Certifications ─────────────────────────────────────────────── */}
        {activeCerts.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e5e7eb]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              {t(lang, "activeCerts")}
            </p>
            <div className="mt-4 flex flex-wrap items-start gap-4">
              {hasHalal && <HalalBadgeSVG size={120} />}
              <div className="flex flex-wrap gap-2">
                {activeCerts
                  .filter(c => !c.certification_name?.toLowerCase().includes("halal"))
                  .map((c, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[#e5e7eb] bg-[#f7f8fa] px-4 py-2 text-sm font-semibold text-[#374151]"
                    >
                      {c.certification_name}
                      {c.expires_at
                        ? ` · ${t(lang, "until")} ${fmtDateI18n(c.expires_at, lang)}`
                        : ""}
                    </span>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Sanitary history ───────────────────────────────────────────── */}
        {sanitaryHistory.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e5e7eb]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              {t(lang, "sanitaryHistory")}
            </p>
            <ul className="mt-4 divide-y divide-[#f3f4f6]">
              {sanitaryHistory.map((entry, i) => (
                <li key={i} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-[#1a1a2e]">{entry.product_name}</span>
                  <span className="text-[#9ca3af]">
                    {fmtDateI18n(entry.application_date, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-[#9ca3af] pb-4">
          {tFooter(lang, generatedAt)}
        </p>
      </main>
    </div>
  );
}
