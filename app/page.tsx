import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Batch = {
  id: string;
  batch_number: string;
  quantity: number;
  expiration_date: string | null;
  product_id: string;
};

type Product = {
  id: string;
  name: string;
};

type Application = {
  id: string;
  animal_id: string;
  product_id: string;
  application_date: string | null;
};

export default async function HomePage() {
  const [
    { data: batches },
    { data: products },
    { data: applications },
  ] = await Promise.all([
    supabase.from("stock_batches").select("*"),
    supabase.from("products").select("id,name"),
    supabase
      .from("applications")
      .select("*")
      .order("application_date", { ascending: false })
      .limit(5),
  ]);

  const productMap = new Map<string, string>();
  products?.forEach((p) => productMap.set(p.id, p.name));

  const today = new Date();

  const lowStock = (batches ?? []).filter((b) => Number(b.quantity) <= 5);

  const expired = (batches ?? []).filter((b) => {
    if (!b.expiration_date) return false;

    const exp = new Date(b.expiration_date);
    return exp < today;
  });

  const expiring = (batches ?? []).filter((b) => {
    if (!b.expiration_date) return false;

    const exp = new Date(b.expiration_date);
    const diff = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);

    return diff >= 0 && diff <= 30;
  });

  const criticalLots = [
    ...expired,
    ...expiring.filter((b) => !expired.some((e) => e.id === b.id)),
  ];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.20)_0%,rgba(122,168,76,0.00)_70%)]" />

            <div className="ag-badge ag-badge-green">Painel sanitário</div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              A inteligência sanitária da Agraas transforma operação em decisão.
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Estoque crítico, lotes vencendo, aplicações recentes e links
              rápidos para o módulo sanitário em uma leitura executiva pronta
              para operação e apresentação.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estoque/dashboard" className="ag-button-primary">
                Abrir dashboard sanitário
              </Link>
              <Link href="/aplicacoes" className="ag-button-secondary">
                Nova aplicação
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Estoque crítico"
                value={lowStock.length}
                subtitle="lotes com quantidade baixa"
              />
              <HeroMetric
                label="Lotes vencendo"
                value={expiring.length}
                subtitle="vencimento em até 30 dias"
              />
              <HeroMetric
                label="Lotes vencidos"
                value={expired.length}
                subtitle="itens que exigem ação imediata"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar da operação
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Lotes críticos
                </h2>
              </div>

              <Link href="/estoque" className="ag-button-secondary">
                Ver estoque
              </Link>
            </div>

            <div className="mt-8 space-y-4">
              {criticalLots.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
                  Nenhum lote crítico encontrado.
                </div>
              ) : (
                criticalLots.slice(0, 5).map((b) => {
                  const isExpired =
                    b.expiration_date && new Date(b.expiration_date) < today;

                  return (
                    <div
                      key={b.id}
                      className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            {productMap.get(b.product_id) ?? "-"}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Lote {b.batch_number}
                          </p>
                        </div>

                        <span
                          className={
                            isExpired
                              ? "ag-badge ag-badge-dark"
                              : "ag-badge ag-badge-green"
                          }
                        >
                          {isExpired ? "Vencido" : "Vence em breve"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MiniInfo
                          label="Validade"
                          value={
                            b.expiration_date
                              ? new Date(b.expiration_date).toLocaleDateString("pt-BR")
                              : "-"
                          }
                        />
                        <MiniInfo
                          label="Quantidade"
                          value={String(b.quantity)}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          label="Estoque crítico"
          value={lowStock.length}
          icon="📦"
          subtitle="lotes com estoque ≤ 5 unidades"
        />
        <KpiCard
          label="Vencendo"
          value={expiring.length}
          icon="⏳"
          subtitle="lotes com validade próxima"
        />
        <KpiCard
          label="Vencidos"
          value={expired.length}
          icon="🚨"
          subtitle="lotes fora da validade"
        />
        <KpiCard
          label="Aplicações recentes"
          value={applications?.length ?? 0}
          icon="💉"
          subtitle="últimos registros sanitários"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Lotes com estoque crítico</h2>
              <p className="ag-section-subtitle">
                Itens que precisam de reposição ou maior atenção operacional.
              </p>
            </div>

            <Link href="/estoque" className="ag-button-secondary">
              Ver estoque
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {lowStock.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum lote com estoque baixo.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>

                <tbody>
                  {lowStock.map((b) => (
                    <tr key={b.id}>
                      <td>{productMap.get(b.product_id) ?? "-"}</td>
                      <td>{b.batch_number}</td>
                      <td>{b.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Últimas aplicações</h2>
              <p className="ag-section-subtitle">
                Registro recente da operação sanitária na plataforma.
              </p>
            </div>

            <Link href="/aplicacoes/historico" className="ag-button-secondary">
              Ver histórico
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {(applications ?? []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhuma aplicação registrada.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Produto</th>
                    <th>Data</th>
                  </tr>
                </thead>

                <tbody>
                  {applications?.map((a) => (
                    <tr key={a.id}>
                      <td>{a.animal_id}</td>
                      <td>{productMap.get(a.product_id) ?? "-"}</td>
                      <td>
                        {a.application_date
                          ? new Date(a.application_date).toLocaleDateString(
                              "pt-BR"
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: string;
  subtitle: string;
}) {
  return (
    <div className="ag-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
          {icon}
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Live
        </span>
      </div>

      <p className="mt-5 ag-kpi-label">{label}</p>
      <p className="mt-3 ag-kpi-value">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}