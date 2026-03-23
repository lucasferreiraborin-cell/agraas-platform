import Link from "next/link";

const actions = [
  {
    title: "Nova aplicação",
    description: "Registre uma aplicação sanitária na base.",
    href: "/aplicacoes",
    icon: "💉",
  },
  {
    title: "Nova pesagem",
    description: "Registre o peso atual de um animal.",
    href: "/pesagens",
    icon: "⚖️",
  },
  {
    title: "Registrar venda",
    description: "Registre transferência ou venda do animal.",
    href: "/vendas",
    icon: "💰",
  },
  {
    title: "Gerenciar lotes",
    description: "Crie lotes e acompanhe a cadeia produtiva.",
    href: "/lotes",
    icon: "📦",
  },
  {
    title: "Registrar abate",
    description: "Registre o abate e o frigorífico.",
    href: "/abates",
    icon: "📋",
  },
  {
    title: "Certificações",
    description: "Consulte animais certificados na base.",
    href: "/certificacoes",
    icon: "✅",
  },
];

export default function OperacoesPage() {
  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Hub operacional</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Centro de operações da base
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Registre eventos sanitários, movimentações, pesagens, vendas e
              etapas da cadeia produtiva em uma estrutura operacional unificada
              da plataforma Agraas.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Aplicações"
                value="Sanidade"
                subtitle="registro sanitário contínuo"
              />
              <HeroMetric
                label="Movimentações"
                value="Lotes"
                subtitle="estrutura produtiva"
              />
              <HeroMetric
                label="Cadeia"
                value="Abate"
                subtitle="rastreamento final"
              />
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar operacional
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Camada operacional da Agraas
                </h2>
              </div>

              <span className="ag-badge ag-badge-dark">Operations</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Aplicações" value="Sanidade animal" />
              <SnapshotCard label="Pesagens" value="Monitoramento de peso" />
              <SnapshotCard label="Lotes" value="Gestão produtiva" />
              <SnapshotCard label="Abates" value="Final da cadeia" />
            </div>

            <div className="mt-6 ag-kpi-card">
              <p className="text-sm text-[var(--text-muted)]">
                Estrutura da plataforma
              </p>

              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Cada operação registrada alimenta o passaporte do animal,
                fortalecendo a rastreabilidade e a construção do score de
                confiança da base pecuária.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          label="Sanidade"
          value="Aplicações"
          icon="💉"
          subtitle="controle sanitário"
        />

        <KpiCard
          label="Pesagem"
          value="Peso"
          icon="⚖️"
          subtitle="monitoramento zootécnico"
        />

        <KpiCard
          label="Movimentação"
          value="Lotes"
          icon="📦"
          subtitle="gestão produtiva"
        />

        <KpiCard
          label="Cadeia final"
          value="Abate"
          icon="📋"
          subtitle="integração frigorífica"
        />
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Operações disponíveis</h2>

            <p className="ag-section-subtitle">
              Acesse rapidamente os módulos operacionais da plataforma.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {actions.length} módulos
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-[var(--shadow-soft)]">
                  {action.icon}
                </div>

                <span className="ag-badge ag-badge-green">Abrir</span>
              </div>

              <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {action.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {action.description}
              </p>
            </Link>
          ))}
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
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
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
  value: string;
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
          Hub
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