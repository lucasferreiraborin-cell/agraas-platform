import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Warehouse, MapPin } from "lucide-react";

type Storage = {
  id: string;
  name: string;
  type: string;
  state: string | null;
  city: string | null;
  capacity_tons: number | null;
  mapa_registration: string | null;
  status: string;
};

type Movement = {
  storage_id: string;
  movement_type: string;
  quantity_tons: number;
};

const TYPE_LABEL: Record<string, string> = {
  proprio: "Próprio", terceiro: "Terceiro", cooperativa: "Cooperativa", porto: "Porto",
};

const TYPE_STYLE: Record<string, string> = {
  proprio:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  terceiro:   "bg-blue-100 text-blue-700 border-blue-200",
  cooperativa:"bg-violet-100 text-violet-700 border-violet-200",
  porto:      "bg-amber-100 text-amber-700 border-amber-200",
};

function fmtTons(t: number) {
  return t.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export default async function ArmazensPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: storagesData }, { data: movementsData }] = await Promise.all([
    supabase
      .from("crop_storage")
      .select("id, name, type, state, city, capacity_tons, mapa_registration, status")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("crop_storage_movements")
      .select("storage_id, movement_type, quantity_tons"),
  ]);

  const storages: Storage[] = (storagesData ?? []) as Storage[];
  const movements: Movement[] = (movementsData ?? []) as Movement[];

  // Calculate net occupancy per storage (entradas - saídas)
  const occupancyMap = new Map<string, number>();
  for (const m of movements) {
    const current = occupancyMap.get(m.storage_id) ?? 0;
    if (m.movement_type === "entrada") {
      occupancyMap.set(m.storage_id, current + m.quantity_tons);
    } else if (m.movement_type === "saida") {
      occupancyMap.set(m.storage_id, current - m.quantity_tons);
    }
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <section className="ag-card-strong p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <Warehouse size={20} className="text-[var(--primary)]" />
          </span>
          <div>
            <h1 className="ag-page-title leading-none">Armazéns</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{storages.length} armazém{storages.length !== 1 ? "ns" : ""} ativo{storages.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {storages.length === 0 && (
          <div className="ag-card-strong col-span-3 py-16 text-center text-sm text-[var(--text-muted)]">
            Nenhum armazém cadastrado.
          </div>
        )}
        {storages.map(storage => {
          const net = Math.max(0, occupancyMap.get(storage.id) ?? 0);
          const capacity = storage.capacity_tons ?? 0;
          const pct = capacity > 0 ? Math.min(100, (net / capacity) * 100) : 0;
          const pctColor = pct >= 85 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";

          return (
            <div key={storage.id} className="ag-card-strong p-6 space-y-4">
              {/* Title + type badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--text-primary)] leading-snug">{storage.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <MapPin size={11} className="shrink-0" />
                    {[storage.city, storage.state].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[storage.type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {TYPE_LABEL[storage.type] ?? storage.type}
                </span>
              </div>

              {/* Occupancy bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--text-muted)]">Ocupação</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--border)]">
                  <div className={`h-2 rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-muted)]">{fmtTons(net)} t atual</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{fmtTons(capacity)} t capacidade</span>
                </div>
              </div>

              {/* MAPA */}
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-[11px] text-[var(--text-muted)]">
                  MAPA: <span className="font-medium text-[var(--text-secondary)]">{storage.mapa_registration ?? "—"}</span>
                </p>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
