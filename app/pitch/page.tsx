"use client";

import { useState, useEffect, useCallback } from "react";

const ACCENT = "#22c55e";
const ACCENT2 = "#3b82f6";
const GOLD = "#f59e0b";

const slides = [
  {
    id: 1,
    tag: "The Problem",
    title: "Livestock exports are\nbroken by paperwork.",
    body: [
      "Brazil exports $8B+ in live animals & beef annually — yet the compliance layer is still fax machines, spreadsheets, and manual certifications.",
      "A single missing document can ground an entire shipment worth millions.",
    ],
    stats: [
      { value: "73%", label: "of export delays caused by documentation failures" },
      { value: "40+", label: "certificates required per international shipment" },
      { value: "$2B+", label: "in deals lost or delayed annually" },
    ],
    accent: "#ef4444",
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" />
        <path d="M32 18v16M32 42v2" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 2,
    tag: "The Solution",
    title: "Agraas — the operating\nsystem for livestock exports.",
    body: [
      "One platform connecting farms, certifiers, and international buyers. Real-time compliance, digital passports, full traceability.",
      "From the pasture to the port — every animal's journey documented, scored, and export-ready.",
    ],
    stats: [
      { value: "100%", label: "digital certification pipeline" },
      { value: "Real-time", label: "compliance status per animal" },
      { value: "1 platform", label: "for farms, vets, and buyers" },
    ],
    accent: ACCENT,
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="8" width="48" height="48" rx="12" stroke={ACCENT} strokeWidth="2" />
        <path d="M20 32l8 8 16-16" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 3,
    tag: "How It Works",
    title: "Three steps from farm\nto international market.",
    body: [],
    steps: [
      {
        n: "01",
        title: "Register & Track",
        desc: "Every animal gets a digital profile — breed, weight history, vaccinations, medications, operator logs.",
        color: ACCENT2,
      },
      {
        n: "02",
        title: "Certify & Score",
        desc: "Automated Agraas Score (0–100) aggregates Halal, MAPA, SIF, GTA, and withdrawal period status in real time.",
        color: ACCENT,
      },
      {
        n: "03",
        title: "Export with Confidence",
        desc: "Buyers receive a live compliance dashboard. Lots ship with zero documentation surprises.",
        color: GOLD,
      },
    ],
    accent: ACCENT2,
    icon: null,
  },
  {
    id: 4,
    tag: "Digital Passport",
    title: "Every animal carries\na verified digital identity.",
    body: [
      "The Agraas Passport is a tamper-proof, real-time document that aggregates everything a buyer or certifier needs — in one shareable view.",
    ],
    features: [
      { icon: "◆", text: "Agraas Score 0–100 with confidence level" },
      { icon: "◆", text: "Full medication history & withdrawal tracking" },
      { icon: "◆", text: "Halal / MAPA / SIF / GTA certifications" },
      { icon: "◆", text: "Weight timeline & reproductive records" },
      { icon: "◆", text: "Shareable link for international buyers" },
    ],
    accent: GOLD,
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="6" width="40" height="52" rx="6" stroke={GOLD} strokeWidth="2" />
        <path d="M22 20h20M22 28h20M22 36h12" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
        <circle cx="44" cy="44" r="8" fill="#0a0a0a" stroke={GOLD} strokeWidth="2" />
        <path d="M41 44l2 2 4-4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 5,
    tag: "Export Module",
    title: "From Santos to Jeddah —\nevery lot tracked end to end.",
    body: [
      "The Export Module gives farm managers and logistics teams a real-time view of lot compliance, maritime routing, and shipment readiness.",
    ],
    features: [
      { icon: "→", text: "Lot builder: group animals, assign contracts, set destination" },
      { icon: "→", text: "Live compliance score per lot — % of animals export-eligible" },
      { icon: "→", text: "Interactive maritime route map: Santos → Cape of Good Hope → Jeddah" },
      { icon: "→", text: "Automated flag: animals with active withdrawal periods" },
      { icon: "→", text: "One-click manifest generation per shipment" },
    ],
    accent: ACCENT2,
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <path d="M8 44c8-16 16-8 24-16s16-8 24-8" stroke={ACCENT2} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 2" />
        <circle cx="8" cy="44" r="4" fill={ACCENT2} />
        <circle cx="56" cy="20" r="4" fill={GOLD} />
        <path d="M52 44l-10-10 6-2-2-6 10 10-6 2 2 6z" fill={ACCENT2} opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 6,
    tag: "Compliance Dashboard",
    title: "Buyers see exactly what\nthey're purchasing.",
    body: [
      "International buyers get a dedicated portal — no login friction, no PDF attachments. A live view of every animal in their lot.",
    ],
    table: {
      headers: ["Animal", "Halal", "MAPA", "SIF", "GTA", "Withdrawal", "Score", "Status"],
      rows: [
        ["Imperador", "✓", "✓", "✓", "✓", "Clear", "91", "ELIGIBLE"],
        ["Estrela", "✓", "✓", "✓", "✓", "Clear", "88", "ELIGIBLE"],
        ["Atlântico", "✓", "—", "✓", "✓", "Clear", "79", "PENDING"],
        ["Aurora", "✓", "✓", "—", "✓", "⚠ Apr 6", "74", "INELIGIBLE"],
      ],
    },
    accent: ACCENT,
    icon: null,
  },
  {
    id: 7,
    tag: "Traction & Clients",
    title: "Already live. Already\nmoving livestock.",
    body: [
      "Agraas is not a prototype. It is running in production, with real farms, real animals, and a real international buyer onboarded.",
    ],
    stats: [
      { value: "3", label: "farms actively using the platform" },
      { value: "200+", label: "animals with digital passports" },
      { value: "1", label: "international buyer: PIF (Saudi Arabia)" },
      { value: "1st", label: "export lot: Santos → Jeddah, Q2 2026" },
    ],
    quote: {
      text: "The Agraas compliance dashboard is the first time we can see the full picture of a Brazilian lot before signing.",
      author: "International Buyer Representative",
    },
    accent: GOLD,
    icon: null,
  },
  {
    id: 8,
    tag: "Next Steps",
    title: "We're raising to scale\nthe export pipeline.",
    body: [
      "The compliance infrastructure is built. The buyer is onboarded. Now we scale — more farms, more destinations, deeper integrations with MAPA and international certifiers.",
    ],
    roadmap: [
      { q: "Q2 2026", text: "First export lot shipped: Santos → Jeddah" },
      { q: "Q3 2026", text: "Expand to 20 farms across Mato Grosso & Goiás" },
      { q: "Q4 2026", text: "UAE & Kuwait buyer onboarding, Paraguay pilot" },
      { q: "2027", text: "API integrations with MAPA and Halal certifiers" },
    ],
    cta: true,
    accent: ACCENT,
    icon: null,
  },
];

function SlideOne({ slide, idx }: { slide: typeof slides[0]; idx: number }) {
  const s = slide as any;

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "64px 80px",
      maxWidth: 1100,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <span style={{
          background: `${s.accent}22`,
          color: s.accent,
          borderRadius: 20,
          padding: "6px 16px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          border: `1px solid ${s.accent}44`,
        }}>
          {slide.tag}
        </span>
        <span style={{ color: "#333", fontSize: 12, fontWeight: 500 }}>
          {String(idx + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: "clamp(32px, 4vw, 56px)",
        fontWeight: 800,
        lineHeight: 1.1,
        color: "#ffffff",
        margin: "0 0 32px",
        whiteSpace: "pre-line",
        letterSpacing: "-0.02em",
      }}>
        {slide.title.split("\n").map((line, i) => (
          <span key={i}>
            {i === 0 ? line : <span style={{ color: s.accent }}>{line}</span>}
            {i === 0 && <br />}
          </span>
        ))}
      </h1>

      {/* Body */}
      {s.body?.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          {s.body.map((p: string, i: number) => (
            <p key={i} style={{ color: "#9ca3af", fontSize: 18, lineHeight: 1.7, margin: "0 0 12px", maxWidth: 680 }}>
              {p}
            </p>
          ))}
        </div>
      )}

      {/* Stats */}
      {s.stats && (
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          {s.stats.map((stat: any, i: number) => (
            <div key={i} style={{ borderLeft: `3px solid ${s.accent}`, paddingLeft: 20 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6, maxWidth: 180, lineHeight: 1.4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      {s.steps && (
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 8 }}>
          {s.steps.map((step: any, i: number) => (
            <div key={i} style={{
              flex: "1 1 220px",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${step.color}33`,
              borderRadius: 16,
              padding: "28px 24px",
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: step.color, opacity: 0.4, lineHeight: 1, marginBottom: 12 }}>{step.n}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{step.title}</div>
              <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Features list */}
      {s.features && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          {s.features.map((f: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: s.accent, fontSize: 10, minWidth: 16 }}>{f.icon}</span>
              <span style={{ color: "#d1d5db", fontSize: 16, lineHeight: 1.5 }}>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {s.table && (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {s.table.headers.map((h: string, i: number) => (
                  <th key={i} style={{
                    padding: "10px 14px",
                    color: "#6b7280",
                    fontWeight: 600,
                    textAlign: i === 0 ? "left" : "center",
                    borderBottom: "1px solid #1f2937",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((row: string[], ri: number) => (
                <tr key={ri} style={{ borderBottom: "1px solid #111827" }}>
                  {row.map((cell: string, ci: number) => {
                    const isStatus = ci === row.length - 1;
                    const statusColor = cell === "ELIGIBLE" ? ACCENT : cell === "PENDING" ? GOLD : cell === "INELIGIBLE" ? "#ef4444" : undefined;
                    return (
                      <td key={ci} style={{
                        padding: "12px 14px",
                        textAlign: ci === 0 ? "left" : "center",
                        fontWeight: ci === 0 || isStatus ? 600 : 400,
                        color: isStatus && statusColor ? statusColor : cell === "✓" ? ACCENT : cell === "⚠ Apr 6" ? GOLD : "#d1d5db",
                        fontSize: isStatus ? 11 : 14,
                        letterSpacing: isStatus ? "0.1em" : "normal",
                      }}>{cell}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quote */}
      {s.quote && (
        <div style={{
          borderLeft: `3px solid ${s.accent}`,
          paddingLeft: 24,
          marginTop: 40,
          maxWidth: 600,
        }}>
          <p style={{ color: "#e5e7eb", fontSize: 17, fontStyle: "italic", lineHeight: 1.6, margin: "0 0 8px" }}>
            &ldquo;{s.quote.text}&rdquo;
          </p>
          <span style={{ color: "#6b7280", fontSize: 13 }}>— {s.quote.author}</span>
        </div>
      )}

      {/* Roadmap */}
      {s.roadmap && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
          {s.roadmap.map((item: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start", padding: "16px 0", borderBottom: i < s.roadmap.length - 1 ? "1px solid #1f2937" : "none" }}>
              <span style={{
                minWidth: 80,
                color: s.accent,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.05em",
              }}>{item.q}</span>
              <span style={{ color: "#d1d5db", fontSize: 16 }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {s.cta && (
        <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
          <a href="mailto:contato@agraas.com.br" style={{
            background: ACCENT,
            color: "#000",
            borderRadius: 10,
            padding: "14px 32px",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            letterSpacing: "0.03em",
          }}>
            Get in Touch
          </a>
          <a href="/comprador" style={{
            background: "transparent",
            color: "#fff",
            border: "1px solid #374151",
            borderRadius: 10,
            padding: "14px 32px",
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none",
          }}>
            See Live Demo
          </a>
        </div>
      )}
    </div>
  );
}

export default function PitchPage() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<"in" | "out">("in");

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= slides.length) return;
    setAnimDir("out");
    setTimeout(() => {
      setCurrent(idx);
      setAnimDir("in");
    }, 180);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") goTo(current + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(current - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, goTo]);

  const slide = slides[current];
  const accent = (slide as any).accent as string;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#050709",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: -200,
        left: "50%",
        transform: "translateX(-50%)",
        width: 800,
        height: 400,
        borderRadius: "50%",
        background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`,
        pointerEvents: "none",
        transition: "background 0.6s ease",
      }} />

      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid #0f1117",
        position: "relative",
        zIndex: 2,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill={ACCENT} />
            <path d="M7 20L14 8l7 12H7z" fill="#000" />
          </svg>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>agraas</span>
        </div>

        {/* Slide counter */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? accent : "#1f2937",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1,
        overflow: "hidden",
        position: "relative",
        opacity: animDir === "in" ? 1 : 0,
        transform: animDir === "in" ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.18s ease, transform 0.18s ease",
      }}>
        <SlideOne slide={slide} idx={current} key={current} />
      </div>

      {/* Bottom nav */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 48px",
        borderTop: "1px solid #0f1117",
        position: "relative",
        zIndex: 2,
      }}>
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "1px solid #1f2937",
            color: current === 0 ? "#374151" : "#9ca3af",
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 500,
            cursor: current === 0 ? "default" : "pointer",
            transition: "all 0.2s",
          }}
        >
          ← Previous
        </button>

        <span style={{ color: "#374151", fontSize: 12 }}>Use arrow keys to navigate</span>

        <button
          onClick={() => goTo(current + 1)}
          disabled={current === slides.length - 1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: current === slides.length - 1 ? "transparent" : accent,
            border: current === slides.length - 1 ? "1px solid #1f2937" : "none",
            color: current === slides.length - 1 ? "#374151" : "#000",
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: current === slides.length - 1 ? "default" : "pointer",
            transition: "all 0.2s",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
