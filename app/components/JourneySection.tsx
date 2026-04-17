"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Intersection Observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView(0.15);
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`, willChange: "transform, opacity" }}>
      {children}
    </div>
  );
}

// ── SVG Illustrations ────────────────────────────────────────────────────────

function Bovino() {
  return (
    <svg width="90" height="70" viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="45" cy="38" rx="28" ry="16" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <path d="M30 28 Q35 18 40 22 Q42 24 40 28" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="22" cy="30" r="8" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="19" cy="28" r="1.5" fill="#4A7C35" />
      <ellipse cx="16" cy="32" rx="3" ry="1.5" fill="none" stroke="#4A7C35" strokeWidth="1" />
      <path d="M14 24 Q12 20 15 22" stroke="#4A7C35" strokeWidth="1" />
      <path d="M26 24 Q28 20 25 22" stroke="#4A7C35" strokeWidth="1" />
      <line x1="32" y1="54" x2="32" y2="66" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="40" y1="54" x2="40" y2="66" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="50" y1="54" x2="50" y2="66" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="58" y1="54" x2="58" y2="66" stroke="#4A7C35" strokeWidth="1.5" />
      <path d="M72 36 Q80 30 76 40" stroke="#4A7C35" strokeWidth="1.5" fill="none" />
      <rect x="18" y="34" width="8" height="4" rx="2" fill="#4CAF82" opacity="0.9" />
      <text x="22" y="37.5" textAnchor="middle" fontSize="3.5" fill="#0D1F0A" fontWeight="bold">RFID</text>
    </svg>
  );
}

function Ovino() {
  return (
    <svg width="70" height="60" viewBox="0 0 70 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="32" r="14" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="31" cy="28" r="4" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="0.8" opacity="0.5" />
      <circle cx="39" cy="28" r="4" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="0.8" opacity="0.5" />
      <circle cx="35" cy="22" r="4" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="0.8" opacity="0.5" />
      <circle cx="22" cy="28" r="6" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="20" cy="27" r="1" fill="#4A7C35" />
      <path d="M16 26 Q14 30 16 32" stroke="#4A7C35" strokeWidth="1" />
      <path d="M18 22 Q16 18 18 20" stroke="#4A7C35" strokeWidth="1" />
      <line x1="28" y1="46" x2="28" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="34" y1="46" x2="34" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="38" y1="46" x2="38" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="44" y1="46" x2="44" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <rect x="14" y="20" width="6" height="3" rx="1.5" fill="#4CAF82" />
    </svg>
  );
}

function Caprino() {
  return (
    <svg width="70" height="60" viewBox="0 0 70 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="38" cy="34" rx="16" ry="11" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="22" cy="28" r="7" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="20" cy="26" r="1" fill="#4A7C35" />
      <path d="M18 20 Q14 12 18 14" stroke="#4A7C35" strokeWidth="1.2" />
      <path d="M24 20 Q28 12 24 14" stroke="#4A7C35" strokeWidth="1.2" />
      <path d="M20 34 Q19 38 20 36" stroke="#4A7C35" strokeWidth="1" />
      <line x1="28" y1="45" x2="28" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="34" y1="45" x2="34" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="42" y1="45" x2="42" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <line x1="48" y1="45" x2="48" y2="55" stroke="#4A7C35" strokeWidth="1.5" />
      <path d="M54 32 Q60 28 56 36" stroke="#4A7C35" strokeWidth="1.2" fill="none" />
      <rect x="14" y="22" width="6" height="3" rx="1.5" fill="#4CAF82" />
    </svg>
  );
}

function Ave() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="34" rx="12" ry="16" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <path d="M38 28 Q46 24 42 32" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1" />
      <circle cx="30" cy="16" r="7" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.5" />
      <path d="M28 12 Q30 8 32 12 Q30 10 28 12" fill="#4A7C35" />
      <circle cx="28" cy="15" r="1" fill="#4A7C35" />
      <path d="M24 17 L20 18" stroke="#4A7C35" strokeWidth="1" />
      <path d="M26 52 L22 58 M26 58 L22 58" stroke="#4A7C35" strokeWidth="1.5" />
      <path d="M34 52 L38 58 M34 58 L38 58" stroke="#4A7C35" strokeWidth="1.5" />
      <circle cx="30" cy="54" r="2" fill="none" stroke="#4CAF82" strokeWidth="1" />
    </svg>
  );
}

function Soja() {
  return (
    <svg width="50" height="100" viewBox="0 0 50 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="25" y1="95" x2="25" y2="20" stroke="#4A7C35" strokeWidth="2" />
      <ellipse cx="18" cy="40" rx="8" ry="5" fill="none" stroke="#4A7C35" strokeWidth="1.2" transform="rotate(-20 18 40)" />
      <ellipse cx="10" cy="38" rx="7" ry="4" fill="none" stroke="#4A7C35" strokeWidth="1.2" transform="rotate(-40 10 38)" />
      <ellipse cx="14" cy="34" rx="7" ry="4" fill="none" stroke="#4A7C35" strokeWidth="1.2" transform="rotate(10 14 34)" />
      <ellipse cx="34" cy="55" rx="8" ry="5" fill="none" stroke="#4A7C35" strokeWidth="1.2" transform="rotate(20 34 55)" />
      <ellipse cx="40" cy="52" rx="7" ry="4" fill="none" stroke="#4A7C35" strokeWidth="1.2" transform="rotate(40 40 52)" />
      <ellipse cx="36" cy="48" rx="7" ry="4" fill="none" stroke="#4A7C35" strokeWidth="1.2" transform="rotate(-10 36 48)" />
      <path d="M28 65 Q32 62 30 70" stroke="#4A7C35" strokeWidth="1" fill="none" />
      <circle cx="25" cy="14" r="5" fill="#4CAF82" opacity="0.8" />
      <text x="25" y="16.5" textAnchor="middle" fontSize="5" fill="#0D1F0A" fontWeight="bold">GPS</text>
    </svg>
  );
}

function Milho() {
  return (
    <svg width="50" height="100" viewBox="0 0 50 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="25" y1="95" x2="25" y2="15" stroke="#4A7C35" strokeWidth="2" />
      <path d="M25 35 Q10 25 8 40" stroke="#4A7C35" strokeWidth="1.2" fill="none" />
      <path d="M25 50 Q40 40 42 55" stroke="#4A7C35" strokeWidth="1.2" fill="none" />
      <path d="M25 65 Q10 55 8 70" stroke="#4A7C35" strokeWidth="1.2" fill="none" />
      <ellipse cx="34" cy="55" rx="5" ry="12" fill="#0f2a0c" stroke="#4A7C35" strokeWidth="1.2" />
      <path d="M32 45 Q38 42 36 48" stroke="#4A7C35" strokeWidth="0.8" fill="none" />
      <path d="M22 10 Q25 5 28 10" stroke="#4A7C35" strokeWidth="1" fill="none" />
      <path d="M20 12 Q25 6 30 12" stroke="#4A7C35" strokeWidth="0.8" fill="none" />
      <circle cx="25" cy="8" r="5" fill="#4CAF82" opacity="0.8" />
      <text x="25" y="10.5" textAnchor="middle" fontSize="5" fill="#0D1F0A" fontWeight="bold">GPS</text>
    </svg>
  );
}

function Cana() {
  return (
    <svg width="60" height="100" viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="95" x2="20" y2="20" stroke="#4A7C35" strokeWidth="2" />
      <line x1="30" y1="95" x2="30" y2="25" stroke="#4A7C35" strokeWidth="2" />
      <line x1="40" y1="95" x2="40" y2="30" stroke="#4A7C35" strokeWidth="2" />
      {[35, 50, 65, 80].map(y => <line key={`n1-${y}`} x1="17" y1={y} x2="23" y2={y} stroke="#4A7C35" strokeWidth="1" opacity="0.5" />)}
      {[40, 55, 70].map(y => <line key={`n2-${y}`} x1="27" y1={y} x2="33" y2={y} stroke="#4A7C35" strokeWidth="1" opacity="0.5" />)}
      <path d="M20 30 Q8 22 6 35" stroke="#4A7C35" strokeWidth="1" fill="none" />
      <path d="M30 40 Q42 32 44 45" stroke="#4A7C35" strokeWidth="1" fill="none" />
      <path d="M40 45 Q52 37 54 50" stroke="#4A7C35" strokeWidth="1" fill="none" />
      <circle cx="30" cy="15" r="5" fill="#4CAF82" opacity="0.8" />
      <text x="30" y="17.5" textAnchor="middle" fontSize="5" fill="#0D1F0A" fontWeight="bold">GPS</text>
    </svg>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, label, sub, delay }: { score: number; label: string; sub: string; delay: number }) {
  const { ref, visible } = useInView(0.3);
  const r = 40; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div ref={ref} className="flex flex-col items-center gap-3" style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.8)", transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1a3a15" strokeWidth="5" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#4CAF82" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={visible ? offset : circ}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: `stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) ${delay + 0.3}s` }} />
        <text x="50" y="54" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#4CAF82">{score}</text>
      </svg>
      <p className="text-[14px] font-semibold text-white">{label}</p>
      <p className="text-[11px] text-[#6B9E50]">{sub}</p>
    </div>
  );
}

// ── Ship SVG ─────────────────────────────────────────────────────────────────
function Ship() {
  return (
    <div className="relative">
      <svg width="280" height="120" viewBox="0 0 280 120" fill="none">
        <path d="M20 80 L40 100 L240 100 L260 80 Z" fill="#1E3A5F" stroke="#2d5a8f" strokeWidth="1" />
        <rect x="100" y="50" width="80" height="30" rx="2" fill="#1E3A5F" stroke="#2d5a8f" strokeWidth="1" />
        <rect x="120" y="55" width="10" height="8" rx="1" fill="#4CAF82" opacity="0.4" />
        <rect x="135" y="55" width="10" height="8" rx="1" fill="#4CAF82" opacity="0.4" />
        <rect x="150" y="55" width="10" height="8" rx="1" fill="#4CAF82" opacity="0.4" />
        <rect x="155" y="30" width="15" height="20" rx="1" fill="#1E3A5F" stroke="#2d5a8f" strokeWidth="1" />
        <path d="M162 30 Q165 20 168 30" fill="none" stroke="#4A7C35" strokeWidth="0.8" opacity="0.4" />
        <rect x="60" y="72" width="30" height="6" rx="1" fill="#4CAF82" opacity="0.7" />
        <text x="75" y="77" textAnchor="middle" fontSize="4.5" fill="#0D1F0A" fontWeight="bold">HALAL</text>
      </svg>
      {/* Waves */}
      <div className="absolute bottom-0 left-0 right-0 h-4 overflow-hidden">
        <div className="animate-[wave_3s_ease-in-out_infinite] flex gap-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <svg key={i} width="30" height="16" viewBox="0 0 30 16"><path d="M0 10 Q7.5 2 15 10 Q22.5 18 30 10" fill="none" stroke="#4A7C35" strokeWidth="1" opacity="0.3" /></svg>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── QR Animation ─────────────────────────────────────────────────────────────
function QRAnimation() {
  const { ref, visible } = useInView(0.5);
  const cells = Array.from({ length: 49 }, (_, i) => {
    const on = [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,8,10,12,16,18,22,26,30,32,48].includes(i);
    return on;
  });
  return (
    <div ref={ref} className="mx-auto grid w-[112px] grid-cols-7 gap-[3px]">
      {cells.map((on, i) => (
        <div key={i}
          className="h-[13px] w-[13px] rounded-[2px]"
          style={{
            backgroundColor: on ? "#EAF2EA" : "#1a3a15",
            opacity: visible ? 1 : 0,
            transition: `opacity 0.3s ease ${(i * 20)}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Timeline Item ────────────────────────────────────────────────────────────
function TimelineItem({ title, sub, delay, side = "left" }: { title: string; sub: string; delay: number; side?: "left" | "right" }) {
  const { ref, visible } = useInView(0.15);
  const tx = side === "left" ? "-30px" : "30px";
  return (
    <div ref={ref} className="flex items-start gap-4"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : `translateX(${tx})`, transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      <div className="mt-1.5 h-[10px] w-[10px] shrink-0 rounded-full bg-[#4CAF82] shadow-[0_0_8px_rgba(76,175,130,0.5)]" />
      <div>
        <p className="text-[14px] font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#6B9E50]">{sub}</p>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function JourneySection() {
  return (
    <div className="bg-[#0D1F0A]">
      <style>{`@keyframes wave { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-30px); } }`}</style>

      {/* ── CENA 0: TÍTULO ────────────────────────────────────────────── */}
      <section className="px-[5vw] py-[120px] text-center">
        <div className="mx-auto max-w-[900px]">
          <Reveal delay={0}><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4CAF82]">A jornada Agraas</p></Reveal>
          <Reveal delay={0.3}><h2 className="mt-5 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-white">Do primeiro dia de vida ao comprador do outro lado do mundo.</h2></Reveal>
          <Reveal delay={0.5}><p className="mx-auto mt-6 max-w-lg text-[16px] leading-8 text-[#6B9E50]">Cada evento registrado. Cada certificacao verificada. Um unico passaporte.</p></Reveal>
        </div>
      </section>

      <div className="mx-auto h-px max-w-[1100px] bg-[#1a3a15]" />

      {/* ── CENA 1: ANIMAIS E PLANTAS ─────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1100px] gap-16 px-[5vw] py-[120px] md:grid-cols-2">
        <div>
          <Reveal><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4CAF82]">Pecuaria</p></Reveal>
          <div className="mt-8 flex flex-wrap items-end gap-6">
            {[Bovino, Ovino, Caprino, Ave].map((C, i) => (
              <Reveal key={i} delay={i * 0.1}><C /></Reveal>
            ))}
          </div>
          <Reveal delay={0.5}>
            <div className="mt-6 inline-block rounded-lg border border-[#3B5E2B] bg-[#1a3a15] px-4 py-2 text-[11px] text-[#EAF2EA]">
              ID Agraas gerado no primeiro dia
            </div>
          </Reveal>
        </div>
        <div>
          <Reveal><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4CAF82]">Agricultura</p></Reveal>
          <div className="mt-8 flex flex-wrap items-end gap-8">
            {[Soja, Milho, Cana].map((C, i) => (
              <Reveal key={i} delay={i * 0.1}><C /></Reveal>
            ))}
          </div>
          <Reveal delay={0.4}>
            <div className="mt-6 inline-block rounded-lg border border-[#3B5E2B] bg-[#1a3a15] px-4 py-2 text-[11px] text-[#EAF2EA]">
              Talhao georeferenciado · CAR verificado
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto h-px max-w-[1100px] bg-[#1a3a15]" />

      {/* ── CENA 2: CICLO DE VIDA ─────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1100px] gap-16 px-[5vw] py-[120px] md:grid-cols-2">
        <div>
          <Reveal><p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4CAF82]">Ciclo pecuario</p></Reveal>
          <div className="space-y-6 border-l-2 border-[#4CAF82]/30 pl-6">
            {[
              ["Nascimento", "ID Agraas gerado · bolus aplicado"],
              ["Pesagem", "GMD calculado · Score atualizado"],
              ["Vacinacao", "Aftosa · Brucelose · carencia monitorada"],
              ["Vermifugacao", "Produto · dose · estoque debitado"],
              ["Mudanca de pasto", "Localizacao · data · destino"],
              ["Score calculado", "5 dimensoes · aprovado exportacao"],
            ].map(([t, s], i) => <TimelineItem key={t} title={t} sub={s} delay={i * 0.15} />)}
          </div>
        </div>
        <div>
          <Reveal><p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4CAF82]">Ciclo agricola</p></Reveal>
          <div className="space-y-6 border-l-2 border-[#4CAF82]/30 pl-6">
            {[
              ["Preparo do solo", "Talhao · analise de solo"],
              ["Plantio", "Variedade · densidade · data"],
              ["Aplicacao de insumos", "Fertilizante · NCM · dose"],
              ["Colheita", "Volume · data · equipamento"],
              ["Armazenagem", "Umidade · proteina · micotoxinas"],
              ["Score do talhao", "Rastreabilidade · fiscal · certificacoes"],
            ].map(([t, s], i) => <TimelineItem key={t} title={t} sub={s} delay={i * 0.15} side="right" />)}
          </div>
        </div>
      </section>

      <div className="mx-auto h-px max-w-[1100px] bg-[#1a3a15]" />

      {/* ── CENA 3: SCORES ────────────────────────────────────────────── */}
      <section className="px-[5vw] py-[120px] text-center">
        <Reveal><h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold tracking-[-0.03em] text-white">O score que abre mercados.</h2></Reveal>
        <div className="mx-auto mt-16 flex max-w-[700px] flex-wrap justify-center gap-10">
          <ScoreRing score={78} label="Bovino" sub="Halal certificado" delay={0} />
          <ScoreRing score={70} label="Ovino" sub="MAPA verificado" delay={0.15} />
          <ScoreRing score={87} label="Soja" sub="EU Deforestation" delay={0.3} />
          <ScoreRing score={60} label="Cana" sub="SIF aprovado" delay={0.45} />
        </div>
        <Reveal delay={0.6}>
          <div className="mx-auto mt-12 flex max-w-[600px] flex-wrap justify-center gap-3">
            {["Halal certificado", "SIF aprovado", "EU Deforestation", "MAPA verificado"].map(b => (
              <span key={b} className="rounded-full border border-[#3B5E2B] bg-[#1a3a15] px-4 py-1.5 text-[11px] font-semibold text-[#4CAF82]">{b}</span>
            ))}
          </div>
        </Reveal>
      </section>

      <div className="mx-auto h-px max-w-[1100px] bg-[#1a3a15]" />

      {/* ── CENA 4: DESTINO ───────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1100px] gap-12 px-[5vw] py-[120px] md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Reveal><h2 className="text-[clamp(2rem,4vw,3.2rem)] font-extrabold tracking-[-0.04em] text-white">Santos →</h2></Reveal>
          <Reveal delay={0.2}><p className="text-[clamp(2rem,4vw,3.2rem)] font-extrabold tracking-[-0.04em] text-[#4CAF82]">o mundo.</p></Reveal>
          <Reveal delay={0.4}><div className="mt-10"><Ship /></div></Reveal>
        </div>
        <div className="flex flex-col justify-center">
          {[
            "Jeddah, Arabia Saudita",
            "Rotterdam, Uniao Europeia",
            "Dubai, Emirados Arabes Unidos",
            "Doha, Qatar",
            "Cidade do Kuwait",
          ].map((d, i) => (
            <Reveal key={d} delay={0.3 + i * 0.12}>
              <div className="flex items-center gap-3 border-b border-[#1a3a15] py-4">
                <div className="h-2 w-2 rounded-full bg-[#4CAF82] shadow-[0_0_6px_rgba(76,175,130,0.5)]" />
                <p className="text-[14px] text-white/80">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mx-auto h-px max-w-[1100px] bg-[#1a3a15]" />

      {/* ── CENA 5: PASSAPORTE ────────────────────────────────────────── */}
      <section className="px-[5vw] py-[120px]">
        <div className="mx-auto max-w-[480px] rounded-3xl border border-[#3B5E2B] bg-[#0f2a0c] p-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4CAF82]">Passaporte Agraas</p>
          <div className="mt-8"><QRAnimation /></div>
          <p className="mt-8 font-mono text-[1.7rem] font-bold tracking-[0.1em] text-white">AGR-00000001</p>
          <p className="mt-3 text-[14px] text-[#6B9E50]">Verificavel em qualquer lugar do mundo.</p>

          <div className="mx-auto mt-8 grid max-w-[320px] grid-cols-2 gap-3">
            {[
              { v: "Score 78", l: "qualidade" }, { v: "Halal", l: "certificacao" },
              { v: "100%", l: "rastreado" }, { v: "FSJBE", l: "origem" },
            ].map(s => (
              <div key={s.l} className="rounded-xl border border-[#3B5E2B] bg-[#0D1F0A] p-3">
                <p className="text-[14px] font-bold text-[#4CAF82]">{s.v}</p>
                <p className="text-[10px] text-[#6B9E50]">{s.l}</p>
              </div>
            ))}
          </div>

          <a href="/cadastro" className="mt-10 inline-block rounded-xl bg-[#4CAF82] px-8 py-3.5 text-[14px] font-bold text-[#0D1F0A] hover:bg-[#6B9E50] transition">
            Criar conta gratuita
          </a>
        </div>
        <Reveal delay={0.3}>
          <p className="mt-8 text-center text-[13px] text-[#3B5E2B]">Da fazenda a mesa. Do Brasil ao mundo.</p>
        </Reveal>
      </section>
    </div>
  );
}
