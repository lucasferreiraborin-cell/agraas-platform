"use client";

import { useState } from "react";

type Cert = { certification_name: string | null; issued_at: string | null; expires_at: string | null; status: string | null };
type SanitaryEntry = { product_name: string; application_date: string | null };
type Weight = { weight: number; weighing_date: string | null };

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

function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function ageMonths(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
}

const SCORE_LABEL: Record<string, { pt: string; en: string; color: string }> = {
  high:   { pt: "Excelente", en: "Excellent",    color: "text-emerald-600" },
  medium: { pt: "Regular",   en: "Regular",       color: "text-amber-600" },
  low:    { pt: "Básico",    en: "Basic",          color: "text-red-500" },
};

function scoreLevel(s: number) {
  if (s >= 75) return "high";
  if (s >= 50) return "medium";
  return "low";
}

const SEX_LABELS: Record<string, { pt: string; en: string }> = {
  M: { pt: "Macho", en: "Male" }, F: { pt: "Fêmea", en: "Female" },
};

export default function PublicPassportView({ animal, property, score, certifications, sanitaryHistory, latestWeight, generatedAt }: Props) {
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const l = lang;

  const months = ageMonths(animal.birth_date);
  const level = scoreLevel(score);
  const sl = SCORE_LABEL[level];
  const hasHalal = certifications.some(c => c.certification_name?.toLowerCase().includes("halal") && c.status === "active");
  const activeCerts = certifications.filter(c => c.status === "active");
  const scorePercent = Math.max(6, Math.min(100, score));

  const sexLabel = animal.sex ? (SEX_LABELS[animal.sex]?.[l] ?? animal.sex) : "—";

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans">
      {/* Header */}
      <header className="border-b border-[#e5e7eb] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5d9c44] text-white text-sm font-bold">A</div>
            <span className="text-sm font-semibold text-[#1a1a2e]">Agraas</span>
            <span className="rounded-full bg-[#f0f7ec] px-2.5 py-0.5 text-[11px] font-semibold text-[#5d9c44]">
              {l === "pt" ? "Passaporte Público" : "Public Passport"}
            </span>
          </div>
          {/* Language toggle */}
          <div className="flex rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] p-0.5">
            {(["pt", "en"] as const).map(lc => (
              <button key={lc} onClick={() => setLang(lc)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${lang === lc ? "bg-white shadow text-[#1a1a2e]" : "text-[#9ca3af]"}`}>
                {lc === "pt" ? "🇧🇷 PT" : "🇬🇧 EN"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-6 py-8">
        {/* Identity hero */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm border border-[#e5e7eb]">
          <div className="bg-[linear-gradient(135deg,#0f0f1a,#1a1a2e)] px-8 py-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  {l === "pt" ? "Passaporte Agraas" : "Agraas Passport"}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {animal.nickname ?? animal.internal_code ?? animal.agraas_id}
                </h1>
                <p className="mt-1 font-mono text-sm text-white/60">{animal.agraas_id}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {hasHalal && (
                  <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
                    ☪ Halal Certified
                  </span>
                )}
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                  {l === "pt" ? "Verificado" : "Verified"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[#e5e7eb] sm:grid-cols-4">
            {[
              { label: l === "pt" ? "Raça" : "Breed",   value: animal.breed ?? "—" },
              { label: l === "pt" ? "Sexo" : "Sex",      value: sexLabel },
              { label: l === "pt" ? "Nascimento" : "Born", value: fmtDate(animal.birth_date, l) },
              { label: l === "pt" ? "Idade" : "Age",     value: months ? `${months} ${l === "pt" ? "meses" : "months"}` : "—" },
            ].map(item => (
              <div key={item.label} className="bg-white px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af]">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a1a2e]">{item.value}</p>
              </div>
            ))}
          </div>

          {property && (
            <div className="border-t border-[#e5e7eb] px-8 py-4">
              <span className="text-xs text-[#9ca3af]">{l === "pt" ? "Fazenda de origem" : "Farm of origin"}: </span>
              <span className="text-sm font-semibold text-[#1a1a2e]">{property.name}</span>
            </div>
          )}
        </section>

        {/* Score */}
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e5e7eb]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                {l === "pt" ? "Agraas Score" : "Agraas Score"}
              </p>
              <p className={`mt-1 text-4xl font-semibold tracking-tight ${sl.color}`}>{score}</p>
              <p className={`text-sm font-medium ${sl.color}`}>{sl[l]}</p>
            </div>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-[#f3f4f6]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8dbc5f] to-[#5d9c44] transition-all"
                  style={{ width: `${scorePercent}%` }} />
              </div>
              <p className="mt-2 text-right text-xs text-[#9ca3af]">{scorePercent}/100</p>
            </div>
          </div>
          {latestWeight && (
            <p className="mt-4 text-sm text-[#6b7280]">
              {l === "pt" ? "Último peso registrado" : "Last recorded weight"}: <strong>{latestWeight} kg</strong>
            </p>
          )}
        </section>

        {/* Certifications */}
        {activeCerts.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e5e7eb]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              {l === "pt" ? "Certificações Ativas" : "Active Certifications"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeCerts.map((c, i) => {
                const isHalal = c.certification_name?.toLowerCase().includes("halal");
                return (
                  <span key={i}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      isHalal
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#e5e7eb] bg-[#f7f8fa] text-[#374151]"
                    }`}>
                    {isHalal ? "☪ " : ""}{c.certification_name}
                    {c.expires_at ? ` · até ${fmtDate(c.expires_at, l)}` : ""}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Sanitary history last 12 months */}
        {sanitaryHistory.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e5e7eb]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              {l === "pt" ? "Histórico Sanitário — Últimos 12 meses" : "Sanitary History — Last 12 months"}
            </p>
            <ul className="mt-4 divide-y divide-[#f3f4f6]">
              {sanitaryHistory.map((entry, i) => (
                <li key={i} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-[#1a1a2e]">{entry.product_name}</span>
                  <span className="text-[#9ca3af]">{fmtDate(entry.application_date, l)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[#9ca3af] pb-4">
          {l === "pt"
            ? `Passaporte gerado em ${generatedAt} pela plataforma Agraas. Documento de rastreabilidade pecuária.`
            : `Passport generated on ${generatedAt} by the Agraas platform. Livestock traceability document.`}
        </p>
      </main>
    </div>
  );
}
