import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import CalendarForm from "@/app/components/CalendarForm";

type CalendarEntry = {
  id: string;
  product_name: string;
  animal_category: string;
  interval_days: number;
  last_applied: string | null;
  next_due: string | null;
  notes: string | null;
  active: boolean;
};

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function statusBadge(daysLeft: number | null) {
  if (daysLeft === null) return { cls: "bg-gray-100 text-gray-600 border-gray-200", label: "Sem data", icon: Clock };
  if (daysLeft < 0)  return { cls: "bg-red-50 text-red-700 border-red-200", label: `${Math.abs(daysLeft)}d atrasado`, icon: AlertTriangle };
  if (daysLeft <= 14) return { cls: "bg-amber-50 text-amber-700 border-amber-200", label: `${daysLeft}d restantes`, icon: Clock };
  return { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: `${daysLeft}d restantes`, icon: CheckCircle2 };
}

export default async function CalendarioSanitarioPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("sanitary_calendar").select("*").eq("active", true).order("next_due", { ascending: true, nullsFirst: false });
  const entries = (data ?? []) as CalendarEntry[];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <Calendar size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Calendário Sanitário</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{entries.length} {entries.length === 1 ? "item programado" : "itens programados"}</p>
            </div>
          </div>
          <CalendarForm />
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><Calendar size={24} /></div>
          <p className="ag-empty-state-title">Nenhum item no calendário</p>
          <p className="ag-empty-state-text">Adicione vacinas e vermífugos ao calendário para acompanhar as próximas doses.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {entries.map(e => {
            const dl = daysUntil(e.next_due);
            const badge = statusBadge(dl);
            const Icon = badge.icon;
            return (
              <div key={e.id} className="ag-card flex items-center gap-5 p-5">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-[var(--text-primary)]">{e.product_name}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {e.animal_category} · a cada {e.interval_days} dias
                    {e.last_applied ? ` · última: ${new Date(e.last_applied).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                  {e.notes && <p className="mt-1 text-xs text-[var(--text-muted)] italic">{e.notes}</p>}
                </div>
                <div className="shrink-0">
                  {e.next_due && (
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Próxima: {new Date(e.next_due).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badge.cls}`}>
                    <Icon size={12} /> {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
