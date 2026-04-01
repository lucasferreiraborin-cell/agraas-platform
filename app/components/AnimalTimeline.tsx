"use client";

import { useState } from "react";
import {
  Scale, Activity, ArrowRightLeft, Tag, Award, Star,
  Heart, Zap, Scissors, Package, AlertTriangle, FileText,
  ChevronDown, ChevronUp, ShieldAlert,
} from "lucide-react";
import { UnverifiedBadge } from "@/app/components/DocumentGate";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimelineWeight = {
  id: string;
  weight: number;
  weighing_date: string | null;
  notes: string | null;
};

export type TimelineApplication = {
  id: string;
  product_name: string | null;
  dose: number | null;
  unit: string | null;
  operator_name: string | null;
  application_date: string | null;
  withdrawal_date: string | null;
};

export type TimelineEvent = {
  id: string;
  event_type: string | null;
  event_date: string | null;
  notes: string | null;
  source: string | null;
  document_source: string | null;
};

export type TimelineMovement = {
  id: string;
  movement_type: string;
  origin_ref: string | null;
  destination_ref: string | null;
  movement_date: string | null;
  notes: string | null;
};

export type TimelineCertification = {
  id: string;
  certification_name: string;
  issued_at: string | null;
  expires_at: string | null;
  status: string;
};

export type TimelineSale = {
  id: string;
  sale_date: string | null;
  weight_kg: number | null;
  price_per_arroba: number | null;
  total_value: number | null;
  notes: string | null;
};

export type AnimalBirth = {
  birth_date: string | null;
  birth_weight: number | null;
  breed: string | null;
};

// ── Unified event ─────────────────────────────────────────────────────────────

type Category =
  | "birth"
  | "weight"
  | "sanitary"
  | "event"
  | "reproductive"
  | "movement"
  | "sale"
  | "certification";

type UnifiedEvent = {
  key: string;
  category: Category;
  date: Date | null;
  title: string;
  summary: string;
  detail: string;
  unverified?: boolean;
  alert?: string; // e.g. "Carência ativa até DD/MM/YYYY"
};

// ── Category meta ─────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  birth: {
    label: "Nascimento",
    color: "text-emerald-600",
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    icon: <Star size={12} />,
  },
  weight: {
    label: "Pesagem",
    color: "text-blue-400",
    bg: "bg-blue-500",
    border: "border-blue-500",
    icon: <Scale size={12} />,
  },
  sanitary: {
    label: "Sanitário",
    color: "text-green-400",
    bg: "bg-green-500",
    border: "border-green-500",
    icon: <Activity size={12} />,
  },
  event: {
    label: "Evento",
    color: "text-amber-400",
    bg: "bg-amber-500",
    border: "border-amber-500",
    icon: <Zap size={12} />,
  },
  reproductive: {
    label: "Reprodutivo",
    color: "text-pink-400",
    bg: "bg-pink-500",
    border: "border-pink-500",
    icon: <Heart size={12} />,
  },
  movement: {
    label: "Movimentação",
    color: "text-violet-400",
    bg: "bg-violet-500",
    border: "border-violet-500",
    icon: <ArrowRightLeft size={12} />,
  },
  sale: {
    label: "Venda",
    color: "text-teal-400",
    bg: "bg-teal-500",
    border: "border-teal-500",
    icon: <Tag size={12} />,
  },
  certification: {
    label: "Certificação",
    color: "text-orange-400",
    bg: "bg-orange-500",
    border: "border-orange-500",
    icon: <Award size={12} />,
  },
};

const FILTER_ORDER: Category[] = [
  "birth", "weight", "sanitary", "event", "reproductive",
  "movement", "sale", "certification",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCurrency(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function eventCategory(type: string | null): Category {
  if (!type) return "event";
  const t = type.toLowerCase();
  if (t.includes("birth") || t === "nascimento") return "birth";
  if (t.includes("weight") || t.includes("weigh") || t === "pesagem") return "weight";
  if (t.includes("insem") || t.includes("gesta") || t.includes("parto") || t.includes("desmam")) return "reproductive";
  if (t.includes("castrat") || t === "castracao") return "event";
  if (t.includes("transfer") || t.includes("movement") || t.includes("lot_entry") || t.includes("lot_exit")) return "movement";
  if (t.includes("sale") || t === "venda") return "sale";
  if (t.includes("slaughter") || t.includes("abate")) return "event";
  if (t.includes("certif")) return "certification";
  if (t.includes("vacinat") || t.includes("application") || t.includes("health")) return "sanitary";
  return "event";
}

function formatEventTitle(type: string | null): string {
  if (!type) return "Evento";
  const map: Record<string, string> = {
    birth: "Nascimento",
    BIRTH: "Nascimento",
    weight_recorded: "Pesagem registrada",
    WEIGHT_RECORDED: "Pesagem registrada",
    weighing: "Pesagem",
    health_application: "Aplicação sanitária",
    HEALTH_APPLICATION: "Aplicação sanitária",
    application: "Aplicação sanitária",
    ownership_transfer: "Transferência de propriedade",
    OWNERSHIP_TRANSFER: "Transferência de propriedade",
    lot_entry: "Entrada em lote",
    LOT_ENTRY: "Entrada em lote",
    lot_exit: "Saída de lote",
    sale: "Venda registrada",
    SALE: "Venda",
    slaughter: "Abate registrado",
    SLAUGHTER: "Abate",
    rfid_assigned: "RFID vinculado",
    RFID_LINKED: "RFID vinculado",
    inseminacao: "Inseminação",
    parto: "Parto",
    desmame: "Desmame",
    gestacao: "Diagnóstico de gestação",
    castracao: "Castração",
    vacinacao: "Vacinação",
    certification: "Certificação",
    CERTIFICATION: "Certificação",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function formatMovementTitle(type: string): string {
  const map: Record<string, string> = {
    lot_entry: "Entrada em lote",
    lot_exit: "Saída de lote",
    ownership_transfer: "Transferência de propriedade",
    sale: "Saída por venda",
    slaughter: "Saída para abate",
    birth: "Nascimento / entrada",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

// ── Build unified list ─────────────────────────────────────────────────────────

function buildEvents(
  birth: AnimalBirth,
  weights: TimelineWeight[],
  applications: TimelineApplication[],
  events: TimelineEvent[],
  movements: TimelineMovement[],
  certifications: TimelineCertification[],
  sales: TimelineSale[],
): UnifiedEvent[] {
  const items: UnifiedEvent[] = [];
  const today = new Date();

  // Birth
  if (birth.birth_date) {
    items.push({
      key: "birth",
      category: "birth",
      date: new Date(birth.birth_date),
      title: "Nascimento",
      summary: birth.breed ? `Raça: ${birth.breed}` : "Registro de nascimento",
      detail: [
        birth.breed ? `Raça: ${birth.breed}` : null,
        birth.birth_weight ? `Peso ao nascer: ${birth.birth_weight} kg` : null,
      ].filter(Boolean).join(" · ") || "Registro de nascimento",
    });
  }

  // Weights — sorted ASC to compute GMD
  const sortedWeights = [...weights].sort(
    (a, b) => new Date(a.weighing_date ?? 0).getTime() - new Date(b.weighing_date ?? 0).getTime()
  );
  sortedWeights.forEach((w, idx) => {
    const prev = sortedWeights[idx - 1];
    let gmd: string | null = null;
    if (prev?.weighing_date && w.weighing_date) {
      const days = Math.max(
        1,
        (new Date(w.weighing_date).getTime() - new Date(prev.weighing_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const diff = Number(w.weight) - Number(prev.weight);
      gmd = (diff / days).toFixed(2);
    }
    items.push({
      key: `weight-${w.id}`,
      category: "weight",
      date: w.weighing_date ? new Date(w.weighing_date) : null,
      title: "Pesagem registrada",
      summary: `${w.weight} kg${gmd ? ` · GMD ${gmd} kg/dia` : ""}`,
      detail: [
        `Peso: ${w.weight} kg`,
        gmd ? `GMD desde última pesagem: ${gmd} kg/dia` : null,
        w.notes ? `Obs: ${w.notes}` : null,
      ].filter(Boolean).join("\n"),
    });
  });

  // Applications
  applications.forEach((a) => {
    const isActiveWithdrawal = a.withdrawal_date && new Date(a.withdrawal_date) > today;
    const isExpiredWithdrawal = a.withdrawal_date && new Date(a.withdrawal_date) <= today;
    items.push({
      key: `app-${a.id}`,
      category: "sanitary",
      date: a.application_date ? new Date(a.application_date) : null,
      title: "Aplicação sanitária",
      summary: a.product_name ?? "Produto",
      detail: [
        a.product_name ? `Produto: ${a.product_name}` : null,
        a.dose && a.unit ? `Dose: ${a.dose} ${a.unit}` : null,
        a.operator_name ? `Operador: ${a.operator_name}` : null,
        a.withdrawal_date
          ? `Carência: até ${new Date(a.withdrawal_date).toLocaleDateString("pt-BR")}`
          : null,
      ].filter(Boolean).join("\n"),
      alert: isActiveWithdrawal
        ? `Carência ativa até ${new Date(a.withdrawal_date!).toLocaleDateString("pt-BR")}`
        : isExpiredWithdrawal
        ? `Carência encerrada em ${new Date(a.withdrawal_date!).toLocaleDateString("pt-BR")}`
        : undefined,
    });
  });

  // Events
  events.forEach((e) => {
    const cat = eventCategory(e.event_type);
    items.push({
      key: `event-${e.id}`,
      category: cat,
      date: e.event_date ? new Date(e.event_date) : null,
      title: formatEventTitle(e.event_type),
      summary: e.notes ?? formatEventTitle(e.event_type),
      detail: e.notes ?? "",
      unverified: e.event_type === "ownership_transfer" && !e.document_source,
    });
  });

  // Movements
  movements.forEach((m) => {
    items.push({
      key: `mov-${m.id}`,
      category: "movement",
      date: m.movement_date ? new Date(m.movement_date) : null,
      title: formatMovementTitle(m.movement_type),
      summary: [m.origin_ref, m.destination_ref].filter(Boolean).join(" → ") || "Movimentação",
      detail: [
        `Tipo: ${formatMovementTitle(m.movement_type)}`,
        m.origin_ref ? `Origem: ${m.origin_ref}` : null,
        m.destination_ref ? `Destino: ${m.destination_ref}` : null,
        m.notes ? `Obs: ${m.notes}` : null,
      ].filter(Boolean).join("\n"),
    });
  });

  // Certifications
  certifications.forEach((c) => {
    const issuedDate = c.issued_at ? new Date(c.issued_at) : null;
    const expiresDate = c.expires_at ? new Date(c.expires_at) : null;
    const isExpiringSoon = expiresDate && expiresDate > today &&
      (expiresDate.getTime() - today.getTime()) < 30 * 24 * 60 * 60 * 1000;

    items.push({
      key: `cert-${c.id}`,
      category: "certification",
      date: issuedDate,
      title: "Certificação emitida",
      summary: c.certification_name,
      detail: [
        `Certificação: ${c.certification_name}`,
        `Status: ${c.status}`,
        issuedDate ? `Emissão: ${issuedDate.toLocaleDateString("pt-BR")}` : null,
        expiresDate ? `Vencimento: ${expiresDate.toLocaleDateString("pt-BR")}` : null,
      ].filter(Boolean).join("\n"),
      alert: isExpiringSoon
        ? `Vence em ${Math.ceil((expiresDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} dias`
        : undefined,
    });
  });

  // Sales
  sales.forEach((s) => {
    items.push({
      key: `sale-${s.id}`,
      category: "sale",
      date: s.sale_date ? new Date(s.sale_date) : null,
      title: "Venda registrada",
      summary: s.total_value ? fmtCurrency(s.total_value) : "Valor não informado",
      detail: [
        s.weight_kg ? `Peso: ${s.weight_kg} kg` : null,
        s.price_per_arroba ? `Preço/@: ${fmtCurrency(s.price_per_arroba)}` : null,
        s.total_value ? `Valor total: ${fmtCurrency(s.total_value)}` : null,
        s.notes ? `Obs: ${s.notes}` : null,
      ].filter(Boolean).join("\n"),
    });
  });

  // Sort ASC (oldest first — birth at top, today at bottom)
  items.sort((a, b) => {
    const at = a.date?.getTime() ?? 0;
    const bt = b.date?.getTime() ?? 0;
    return at - bt;
  });

  // Deduplicate by key
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

// ── Dot icon ──────────────────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: Category }) {
  const map: Record<Category, React.ReactNode> = {
    birth: <Star size={13} />,
    weight: <Scale size={13} />,
    sanitary: <Activity size={13} />,
    event: <Zap size={13} />,
    reproductive: <Heart size={13} />,
    movement: <ArrowRightLeft size={13} />,
    sale: <Tag size={13} />,
    certification: <Award size={13} />,
  };
  const extra: Record<string, React.ReactNode> = {
    castration: <Scissors size={13} />,
    lot_entry: <Package size={13} />,
    rfid: <FileText size={13} />,
  };
  return <>{map[category] ?? extra[category] ?? <Zap size={13} />}</>;
}

// ── Main component ────────────────────────────────────────────────────────────

interface AnimalTimelineProps {
  birth: AnimalBirth;
  weights: TimelineWeight[];
  applications: TimelineApplication[];
  events: TimelineEvent[];
  movements: TimelineMovement[];
  certifications: TimelineCertification[];
  sales: TimelineSale[];
  animalId: string;
}

export default function AnimalTimeline({
  birth,
  weights,
  applications,
  events,
  movements,
  certifications,
  sales,
}: AnimalTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<Category | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const allEvents = buildEvents(birth, weights, applications, events, movements, certifications, sales);
  const filtered = activeFilter ? allEvents.filter((e) => e.category === activeFilter) : allEvents;

  // Which categories actually have events (for filter chips)
  const presentCategories = FILTER_ORDER.filter((cat) =>
    allEvents.some((e) => e.category === cat)
  );

  return (
    <div className="space-y-5">
      {/* Filter chips */}
      {presentCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter(null)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              activeFilter === null
                ? "border-white/30 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            Todos · {allEvents.length}
          </button>
          {presentCategories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = allEvents.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeFilter === cat
                    ? `${meta.border} bg-white/10 ${meta.color}`
                    : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
                }`}
              >
                <span className={activeFilter === cat ? meta.color : "text-white/40"}>
                  {meta.icon}
                </span>
                {meta.label} · {count}
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="text-sm text-white/40">Nenhum evento nesta categoria.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-5 bottom-0 w-px bg-white/10" />

          <div className="space-y-1">
            {filtered.map((item) => {
              const meta = CATEGORY_META[item.category];
              const isExpanded = expandedKey === item.key;
              const hasDetail = item.detail.length > 0 && item.detail !== item.summary;

              return (
                <div key={item.key} className="relative flex gap-4 pb-1">
                  {/* Dot */}
                  <div
                    className={`relative z-10 mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.bg} text-white shadow-sm`}
                  >
                    <CategoryIcon category={item.category} />
                  </div>

                  {/* Card */}
                  <div
                    className={`mb-2 flex-1 min-w-0 rounded-xl border transition-all ${
                      item.alert?.startsWith("Carência ativa")
                        ? "border-red-500/25 bg-red-500/8"
                        : "border-white/8 bg-white/4 hover:bg-white/6"
                    } ${hasDetail ? "cursor-pointer" : ""}`}
                    onClick={() => hasDetail && setExpandedKey(isExpanded ? null : item.key)}
                  >
                    <div className="flex items-start justify-between gap-2 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white/90">{item.title}</span>
                          {item.unverified && <UnverifiedBadge />}
                          {item.alert?.startsWith("Carência ativa") && (
                            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                              <ShieldAlert size={9} />
                              {item.alert}
                            </span>
                          )}
                          {item.alert && !item.alert.startsWith("Carência ativa") && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              <AlertTriangle size={9} />
                              {item.alert}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-white/50 leading-relaxed">{item.summary}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-white/35 whitespace-nowrap">
                          {fmtDate(item.date)}
                        </span>
                        {hasDetail && (
                          <span className="text-white/30">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && hasDetail && (
                      <div className="border-t border-white/8 px-4 py-3">
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-white/60 font-sans">
                          {item.detail}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
