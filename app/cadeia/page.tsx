import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { PageHeader } from "@/app/components/ui/PageHeader";

type ChainRow = {
  animal_id: string;
  internal_code: string | null;
  current_property_name: string | null;
  current_lot_code?: string | null;
  slaughterhouse_name?: string | null;
  animal_status?: string | null;
  total_score?: number | null;
};

export default async function CadeiaPage() {
  const supabase = await createSupabaseServerClient();

  // Promise.allSettled para tolerância a falha individual:
  // se UMA query falhar (ex.: view indisponível, RLS bloqueando), as outras
  // continuam, e a UI degrada graciosamente em vez de quebrar a página inteira.
  const [passportResult, assignsResult, lotsResult] = await Promise.allSettled([
    supabase
      .from("agraas_master_passport")
      .select(
        "animal_id, internal_code, current_property_name, current_lot_code, slaughterhouse_name, animal_status, total_score"
      )
      .order("total_score", { ascending: false }),
    supabase
      .from("animal_lot_assignments")
      .select("animal_id, lot_id")
      .is("exit_date", null),
    supabase.from("lots").select("id, name"),
  ]);

  // Extrai data/error de cada resultado; loga warning se alguma falhar.
  const data = passportResult.status === "fulfilled" ? passportResult.value.data : null;
  const error = passportResult.status === "fulfilled"
    ? passportResult.value.error
    : passportResult.reason;
  const assignsData = assignsResult.status === "fulfilled" ? assignsResult.value.data : null;
  const lotsData = lotsResult.status === "fulfilled" ? lotsResult.value.data : null;

  if (passportResult.status === "rejected") {
    console.warn("[cadeia] agraas_master_passport falhou:", passportResult.reason);
  } else if (passportResult.value.error) {
    console.warn("[cadeia] agraas_master_passport erro:", passportResult.value.error);
  }
  if (assignsResult.status === "rejected") {
    console.warn("[cadeia] animal_lot_assignments falhou:", assignsResult.reason);
  } else if (assignsResult.value.error) {
    console.warn("[cadeia] animal_lot_assignments erro:", assignsResult.value.error);
  }
  if (lotsResult.status === "rejected") {
    console.warn("[cadeia] lots falhou:", lotsResult.reason);
  } else if (lotsResult.value.error) {
    console.warn("[cadeia] lots erro:", lotsResult.value.error);
  }

  // Mapa animal → nome do lote ativo (fallback quando view não retorna)
  const lotNameById = new Map(((lotsData ?? []) as { id: string; name: string }[]).map(l => [l.id, l.name]));
  const animalLotName = new Map<string, string>();
  for (const a of (assignsData ?? []) as { animal_id: string; lot_id: string }[]) {
    if (!animalLotName.has(a.animal_id)) {
      animalLotName.set(a.animal_id, lotNameById.get(a.lot_id) ?? "");
    }
  }

  const rawRows = (data ?? []) as ChainRow[];
  const rows: ChainRow[] = rawRows.map(r => ({
    ...r,
    current_lot_code: r.current_lot_code ?? animalLotName.get(r.animal_id) ?? null,
  }));

  const propertiesCount = new Set(
    rows.map((row) => row.current_property_name).filter(Boolean)
  ).size;

  const lotsCount = new Set(
    rows.map((row) => row.current_lot_code).filter(Boolean)
  ).size;

  const destinationsCount = new Set(
    rows.map((row) => row.slaughterhouse_name).filter(Boolean)
  ).size;

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Cadeia pecuária"
        title="Visão da cadeia e fluxo do ativo pecuário"
        description="A Agraas conecta o animal à propriedade, ao lote e ao destino, formando a base da infraestrutura digital da cadeia pecuária."
        actions={
          <>
            <Link href="/animais" className="ag-button-primary">
              Ver animais
            </Link>
            <Link href="/painel" className="ag-button-secondary">
              Dashboard executivo
            </Link>
            <Link href="/inteligencia" className="ag-button-secondary">
              Inteligência
            </Link>
          </>
        }
        panel={
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard label="Animais" value={rows.length} sub="ativos mapeados na cadeia" />
            <KpiCard label="Propriedades" value={propertiesCount} sub="origens estruturadas" />
            <KpiCard label="Lotes" value={lotsCount} sub="agrupamentos operacionais" />
            <KpiCard label="Destinos" value={destinationsCount} sub="pontos finais da cadeia" />
          </div>
        }
      />

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Fluxo da cadeia</h2>
            <p className="ag-section-subtitle">
              Visualização do ativo animal em sua trajetória operacional.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">{rows.length} registros</div>
        </div>

        <div className="mt-8">
          {error ? (
            <p className="text-sm text-[var(--danger)]">
              Erro ao carregar cadeia.
            </p>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum dado encontrado.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.slice(0, 12).map((row) => (
                <Link
                  key={row.animal_id}
                  href={`/animais/${row.animal_id}`}
                  className="block rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {row.internal_code ?? row.animal_id}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Score {row.total_score ?? "-"} • {formatStatus(row.animal_status)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <ChainPill label="Animal" value={row.internal_code ?? row.animal_id} />
                      <span>→</span>
                      <ChainPill label="Propriedade" value={row.current_property_name ?? "-"} />
                      <span>→</span>
                      <ChainPill
                        label="Lote"
                        value={row.current_lot_code ?? "—"}
                        title={row.current_lot_code ? undefined : "Sem lote atribuído"}
                      />
                      <span>→</span>
                      <ChainPill label="Destino" value={row.slaughterhouse_name ?? "-"} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ChainPill({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </span>
  );
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "-";

  const map: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    blocked: "Bloqueado",
    archived: "Arquivado",
    sold: "Vendido",
    slaughtered: "Abatido",
    ACTIVE: "Ativo",
  };

  return map[value] ?? map[value.toLowerCase()] ?? value;
}