// Shared types and constants for the Comprador portal components

export type Lot = {
  id: string; name: string; objective: string | null;
  pais_destino: string | null; porto_embarque: string | null;
  data_embarque: string | null; certificacoes_exigidas: string[] | null;
  numero_contrato: string | null; status: string | null;
  ship_name: string | null; arrival_date: string | null;
};
export type Assignment       = { animal_id: string; lot_id: string };
export type Animal           = { id: string; internal_code: string | null; nickname: string | null; sex: string | null; breed: string | null; birth_date: string | null };
export type Cert             = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
export type Withdrawal       = { animal_id: string; product_name: string | null; withdrawal_date: string | null };
export type Score            = { animal_id: string; score_json: Record<string, unknown> | null };
export type TrackingCheckpoint = { lot_id: string; stage: string; timestamp: string; animals_confirmed: number | null; animals_lost: number; loss_cause: string | null; location_name: string | null };
export type LivestockAnimal  = { id: string; species: string; breed: string | null; birth_date: string | null; internal_code: string | null; score: number | null; certifications: string[]; status: string };
export type PoultryBatch     = { id: string; batch_code: string; species: string; breed: string | null; current_count: number; mortality_count: number; initial_count: number; feed_conversion: number | null; status: string; halal_certified: boolean; integrator_name: string | null };
export type GrainShipment    = { id: string; contract_number: string | null; culture: string; quantity_tons: number; destination_country: string | null; destination_port: string | null; origin_port: string | null; vessel_name: string | null; departure_date: string | null; arrival_date: string | null; status: string; field_id: string | null };
export type GrainTracking    = { shipment_id: string; stage: string; stage_date: string; quantity_confirmed_tons: number | null; quantity_lost_tons: number };
export type GrainFarm        = { id: string; name: string; car_number: string | null };
export type GrainField       = { id: string; farm_id: string; culture: string };

export type ComplianceRow = {
  animal: Animal;
  certs: Set<string>;
  score: number;
  withdrawals: string[];
  status: "eligible" | "pending" | "ineligible";
};

export type LivestockRow = LivestockAnimal & {
  hasHalal: boolean;
  score: number;
  status: "eligible" | "ineligible";
};

export type RiskData = {
  score: number;
  level: "low" | "medium" | "high";
  count: number;
};

export const TRACKING_STAGES = [
  { key: "fazenda",       en: "Farm",        pt: "Fazenda" },
  { key: "concentracao",  en: "Staging",     pt: "Concentração" },
  { key: "transporte",    en: "Transport",   pt: "Transporte" },
  { key: "porto_origem",  en: "Origin Port", pt: "Porto Origem" },
  { key: "navio",         en: "At Sea",      pt: "Navio" },
  { key: "porto_destino", en: "Dest. Port",  pt: "Porto Destino" },
  { key: "entregue",      en: "Delivered",   pt: "Entregue" },
] as const;

export const CERT_LIST = ["Halal", "MAPA", "GTA", "SIF"] as const;

export const GRAIN_STAGES = [
  { key: "fazenda",        en: "Farm",         pt: "Fazenda" },
  { key: "armazem",        en: "Storage",      pt: "Armazém" },
  { key: "transportadora", en: "Transport",    pt: "Transportadora" },
  { key: "porto_origem",   en: "Origin Port",  pt: "Porto Origem" },
  { key: "navio",          en: "At Sea",       pt: "Navio" },
  { key: "porto_destino",  en: "Dest. Port",   pt: "Porto Destino" },
  { key: "entregue",       en: "Delivered",    pt: "Entregue" },
] as const;

export const CULTURE_LABEL_EN: Record<string, string> = { soja: "Soybean", milho: "Corn", trigo: "Wheat", acucar: "Sugar", cafe: "Coffee" };
export const CULTURE_LABEL_PT: Record<string, string> = { soja: "Soja", milho: "Milho", trigo: "Trigo", acucar: "Açúcar", cafe: "Café" };
export const GRAIN_STATUS_EN: Record<string, string>  = { planejado: "PLANNED", carregando: "LOADING", embarcado: "SHIPPED", em_transito: "IN TRANSIT", entregue: "DELIVERED" };
export const GRAIN_STATUS_PT: Record<string, string>  = { planejado: "PLANEJADO", carregando: "CARREGANDO", embarcado: "EMBARCADO", em_transito: "EM TRÂNSITO", entregue: "ENTREGUE" };
export const GRAIN_STATUS_CLS: Record<string, string> = {
  planejado:   "border-gray-200 bg-gray-50 text-gray-600",
  carregando:  "border-blue-200 bg-blue-50 text-blue-700",
  embarcado:   "border-indigo-200 bg-indigo-50 text-indigo-700",
  em_transito: "border-amber-200 bg-amber-50 text-amber-700",
  entregue:    "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const T = {
  en: {
    portal: "PIF Procurement Portal", pif: "PIF · Public Investment Fund · Saudi Arabia",
    hero: { title: "Brazilian Livestock · Export Intelligence", sub: "End-to-end traceability from farm to port" },
    kpi: { total: "Total Animals", eligible: "Export Eligible", halal: "Halal Certified", shipments: "Active Shipments", departure: "Next Departure", survival: "Survival Rate" },
    shipments: { title: "Active Shipments", lotId: "Lot ID", origin: "Origin", dest: "Destination", dep: "Departure", animals: "Animals", compliance: "Compliance", status: "Status", details: "View Details" },
    tracking: { title: "Live Shipment Tracking", noData: "No tracking data available yet.", animalsConf: "animals confirmed", loss: "loss", losses: "losses" },
    matrix: { title: "Animal Certification Matrix", all: "All", eligible: "Eligible", pending: "Pending", ineligible: "Ineligible", animal: "Animal", breed: "Breed", age: "Age", withdrawal: "Withdrawal", score: "Score", status: "Status", clear: "Clear", labelEligible: "ELIGIBLE", labelPending: "PENDING", labelIneligible: "INELIGIBLE" },
    species: { all: "All Species", cattle: "Cattle", sheep: "Sheep & Goats", poultry: "Poultry" },
    risk: { title: "Risk Intelligence", sanitary: "Sanitary Risk", compliance: "Compliance Risk", delivery: "Delivery Risk", low: "ON TRACK", medium: "MONITORED", high: "ACTION REQUIRED", withWithdrawal: "animals with active withdrawal", ineligible: "ineligible animals", lostInTransit: "animals lost in transit" },
    footer: "Powered by Agraas Intelligence Layer · Certified by MAPA · Real-time data",
    signOut: "Sign Out",
  },
  pt: {
    portal: "Portal de Compras PIF", pif: "PIF · Public Investment Fund · Saudi Arabia",
    hero: { title: "Pecuária Brasileira · Inteligência de Exportação", sub: "Rastreabilidade completa da fazenda ao porto" },
    kpi: { total: "Total de Animais", eligible: "Aptos para Exportação", halal: "Certificados Halal", shipments: "Embarques Ativos", departure: "Próximo Embarque", survival: "Taxa de Sobrevivência" },
    shipments: { title: "Embarques Ativos", lotId: "ID do Lote", origin: "Origem", dest: "Destino", dep: "Embarque", animals: "Animais", compliance: "Conformidade", status: "Status", details: "Ver Detalhes" },
    tracking: { title: "Rastreio de Embarques ao Vivo", noData: "Nenhum dado de rastreio disponível ainda.", animalsConf: "animais confirmados", loss: "perda", losses: "perdas" },
    matrix: { title: "Matriz de Certificações Animais", all: "Todos", eligible: "Aptos", pending: "Pendentes", ineligible: "Inaptos", animal: "Animal", breed: "Raça", age: "Idade", withdrawal: "Carência", score: "Score", status: "Status", clear: "Livre", labelEligible: "APTO", labelPending: "PENDENTE", labelIneligible: "INAPTO" },
    species: { all: "Todas", cattle: "Bovinos", sheep: "Ovinos", poultry: "Aves" },
    risk: { title: "Inteligência de Risco", sanitary: "Risco Sanitário", compliance: "Risco de Conformidade", delivery: "Risco de Entrega", low: "EM DIA", medium: "MONITORADO", high: "AÇÃO NECESSÁRIA", withWithdrawal: "animais com carência ativa", ineligible: "animais inaptos", lostInTransit: "animais perdidos em trânsito" },
    footer: "Powered by Agraas Intelligence Layer · Certificado pelo MAPA · Dados em tempo real",
    signOut: "Sair",
  },
} as const;

export type Lang = "en" | "pt";
export type TDict = typeof T["en"] | typeof T["pt"];

export function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
export function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtAge(birth: string | null) {
  if (!birth) return "—";
  const m = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  return m >= 12 ? `${Math.floor(m / 12)}y ${m % 12}m` : `${m}m`;
}
