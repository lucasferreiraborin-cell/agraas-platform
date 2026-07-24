"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Reveal with premium timing ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function R({ children, d = 0, cls = "" }: { children: ReactNode; d?: number; cls?: string }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} className={cls} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translate3d(0,0,0)" : "translate3d(0,60px,0)",
      transition: `opacity .6s cubic-bezier(.39,.575,.565,1) ${d}s, transform 1.2s cubic-bezier(.19,1,.22,1) ${d}s`,
      willChange: "transform, opacity",
    }}>{children}</div>
  );
}

// ── Animated score ring ──────────────────────────────────────────────────────
function ScoreRing({ score, label, sub, d }: { score: number; label: string; sub: string; d: number }) {
  const { ref, vis } = useInView(0.3);
  const r = 44; const c = 2 * Math.PI * r;
  return (
    <div ref={ref} className="flex flex-col items-center" style={{
      opacity: vis ? 1 : 0, transform: vis ? "scale(1)" : "scale(0.85)",
      transition: `all 1s cubic-bezier(.19,1,.22,1) ${d}s`,
    }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="hsla(0,0%,100%,.06)" strokeWidth="3" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="#2E8B3E" strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={vis ? c - (score / 100) * c : c}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: `stroke-dashoffset 1.6s cubic-bezier(.19,1,.22,1) ${d + 0.4}s` }} />
        <text x="55" y="59" textAnchor="middle" fontSize="24" fontWeight="500" fill="white" fontFamily="inherit">{score}</text>
      </svg>
      <p className="mt-3 text-[.9375rem] font-medium text-white">{label}</p>
      <p className="mt-1 font-mono text-[.6875rem] uppercase tracking-[.18em] text-white/40">{sub}</p>
    </div>
  );
}

// ── Timeline dot ─────────────────────────────────────────────────────────────
function Dot({ title, sub, d }: { title: string; sub: string; d: number }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} className="flex gap-5" style={{
      opacity: vis ? 1 : 0, transform: vis ? "translate3d(0,0,0)" : "translate3d(-20px,0,0)",
      transition: `all .8s cubic-bezier(.19,1,.22,1) ${d}s`,
    }}>
      <div className="relative flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_12px_rgba(46,139,62,.5)]" />
        <div className="w-px flex-1 bg-white/[.06]" />
      </div>
      <div className="pb-8">
        <p className="text-[.9375rem] font-medium leading-snug text-white">{title}</p>
        <p className="mt-1 text-[.8125rem] leading-relaxed text-white/40">{sub}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function JourneySection() {
  return (
    <section className="relative overflow-hidden bg-[#071a0e]">
      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "linear-gradient(hsla(0,0%,100%,.04) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.04) 1px, transparent 1px)",
        backgroundSize: "4rem 4rem",
      }} />

      {/* ── INTRO ─────────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-[1100px] px-6 pb-0 pt-[clamp(6rem,12vw,10rem)]">
        <R>
          <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.18em] text-[var(--primary)]">
            A jornada
          </p>
        </R>
        <R d={0.15}>
          <h2 className="mt-5 max-w-[820px] text-[clamp(2rem,5.7vw,4.5rem)] font-medium leading-[.95] tracking-[-.03em] text-white">
            Do campo ao comprador<br />do outro lado do mundo.
          </h2>
        </R>
        <R d={0.3}>
          <p className="mt-6 max-w-[440px] text-[1rem] leading-[1.7] text-white/40">
            Cada evento documentado. Cada certificação verificada. Um passaporte para cada animal e cada safra.
          </p>
        </R>
      </div>

      {/* ── BENEFIT 01 — RASTREABILIDADE ───────────────────────────────── */}
      <div className="relative mx-auto mt-[clamp(5rem,10vw,9rem)] grid max-w-[1100px] gap-12 px-6 lg:grid-cols-[.45fr_.55fr] lg:items-center">
        <R>
          <div>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">01</p>
            <h3 className="mt-4 text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-[1.15] tracking-[-.02em] text-white">
              Identidade digital<br />desde o primeiro dia.
            </h3>
            <p className="mt-5 text-[.9375rem] leading-[1.8] text-white/40">
              Bovino, ovino, caprino ou ave — cada animal recebe um ID Agraas único no nascimento. Soja, milho ou cana — cada talhão é georreferenciado com CAR verificado.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["RFID bolus", "Tag auricular", "GPS talhão", "QR passaporte"].map(t => (
                <span key={t} className="rounded-md border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-[.75rem] font-medium text-white/60">{t}</span>
              ))}
            </div>
          </div>
        </R>
        <R d={0.2}>
          <div className="rounded-xl border border-white/[.06] bg-white/[.03] p-8 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: "4", u: "espécies", s: "bovino · ovino · caprino · ave" },
                { n: "5", u: "culturas", s: "soja · milho · trigo · cana · café" },
                { n: "7", u: "etapas", s: "nascimento → embarque" },
                { n: "1", u: "passaporte", s: "identidade digital única" },
              ].map((c, i) => (
                <R key={c.u} d={0.1 + i * 0.08}>
                  <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-5">
                    <p className="font-mono text-[1.75rem] font-medium leading-none text-white">{c.n}</p>
                    <p className="mt-1.5 text-[.8125rem] font-medium text-white/70">{c.u}</p>
                    <p className="mt-1 text-[.6875rem] text-white/30">{c.s}</p>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </R>
      </div>

      {/* ── BENEFIT 02 — CICLO DE VIDA ────────────────────────────────── */}
      <div className="relative mx-auto mt-[clamp(5rem,10vw,9rem)] grid max-w-[1100px] gap-12 px-6 lg:grid-cols-[.55fr_.45fr] lg:items-start">
        <R>
          <div className="rounded-xl border border-white/[.06] bg-white/[.03] p-8 backdrop-blur-sm">
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-white/30 mb-6">Timeline do animal</p>
            {[
              ["Nascimento", "ID gerado · peso registrado · mãe vinculada"],
              ["Pesagem", "GMD calculado · Score atualizado automaticamente"],
              ["Vacinação", "Aftosa · Brucelose · carência monitorada em tempo real"],
              ["Vermifugação", "Produto · dose · lote · estoque debitado"],
              ["Transferência", "Origem · destino · data · GTA vinculada"],
              ["Score final", "5 dimensões · aprovado para exportação Halal"],
            ].map(([t, s], i) => <Dot key={t} title={t} sub={s} d={i * 0.12} />)}
          </div>
        </R>
        <R d={0.15}>
          <div>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">02</p>
            <h3 className="mt-4 text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-[1.15] tracking-[-.02em] text-white">
              Cada evento<br />vira dado verificável.
            </h3>
            <p className="mt-5 text-[.9375rem] leading-[1.8] text-white/40">
              Pesagem, vacinação, transferência, certificação — tudo registrado com data, operador e lote. O Score Agraas recalcula automaticamente a cada evento.
            </p>
            <p className="mt-5 text-[.9375rem] leading-[1.8] text-white/40">
              O algoritmo avalia 5 dimensões: produtiva, sanitária, operacional, continuidade e rastreabilidade. O resultado é um número de 0 a 100 que acompanha o animal por toda a vida.
            </p>
          </div>
        </R>
      </div>

      {/* ── BENEFIT 03 — SCORES ───────────────────────────────────────── */}
      <div className="relative mx-auto mt-[clamp(5rem,10vw,9rem)] max-w-[1100px] px-6 text-center">
        <R>
          <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">03</p>
        </R>
        <R d={0.1}>
          <h3 className="mx-auto mt-4 max-w-[600px] text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-[1.15] tracking-[-.02em] text-white">
            O score que abre mercados.
          </h3>
        </R>

        <div className="mx-auto mt-14 flex max-w-[700px] flex-wrap justify-center gap-12">
          <ScoreRing score={78} label="Bovino" sub="Halal" d={0} />
          <ScoreRing score={70} label="Ovino" sub="MAPA" d={0.15} />
          <ScoreRing score={87} label="Soja" sub="EUDR" d={0.3} />
          <ScoreRing score={60} label="Cana" sub="SIF" d={0.45} />
        </div>

        <R d={0.6}>
          <div className="mx-auto mt-14 flex max-w-[550px] flex-wrap justify-center gap-2">
            {["Halal certificado", "SIF aprovado", "EU Deforestation", "MAPA verificado"].map(b => (
              <span key={b} className="rounded-md border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-[.6875rem] font-medium uppercase tracking-[.12em] text-white/50">{b}</span>
            ))}
          </div>
        </R>
      </div>

      {/* ── BENEFIT 04 — DESTINO ──────────────────────────────────────── */}
      <div className="relative mx-auto mt-[clamp(5rem,10vw,9rem)] grid max-w-[1100px] gap-12 px-6 pb-[clamp(6rem,12vw,10rem)] lg:grid-cols-[.5fr_.5fr] lg:items-center">
        <R>
          <div>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">04</p>
            <h3 className="mt-4 text-[clamp(1.8rem,3vw,2.8rem)] font-medium leading-[1.05] tracking-[-.03em] text-white">
              Santos →<br /><span className="text-[var(--primary)]">o mundo.</span>
            </h3>
            <p className="mt-5 text-[.9375rem] leading-[1.8] text-white/40">
              Do porto de Santos ao comprador institucional. Cada embarque rastreado com checkpoints, certificações e passaporte digital verificável por QR code.
            </p>
          </div>
        </R>
        <R d={0.15}>
          <div className="rounded-xl border border-white/[.06] bg-white/[.03] p-8 backdrop-blur-sm">
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-white/30 mb-6">Destinos ativos</p>
            {[
              "Jeddah, Arábia Saudita",
              "Rotterdam, União Europeia",
              "Dubai, Emirados Árabes",
              "Doha, Qatar",
              "Cidade do Kuwait",
            ].map((d, i) => (
              <R key={d} d={0.2 + i * 0.1}>
                <div className="flex items-center gap-4 border-b border-white/[.04] py-4 last:border-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(46,139,62,.6)]" />
                  <p className="text-[.9375rem] text-white/70">{d}</p>
                </div>
              </R>
            ))}

            <R d={0.8}>
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/[.06] px-4 py-3">
                <span className="rounded border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-0.5 text-[.6875rem] font-semibold text-[var(--primary)]">HALAL ✓</span>
                <p className="text-[.8125rem] text-white/50">Certificação verificada em cada etapa</p>
              </div>
            </R>
          </div>
        </R>
      </div>
    </section>
  );
}
