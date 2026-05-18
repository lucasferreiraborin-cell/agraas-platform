import type { ReactNode } from "react";

function HeaderContent({
  badge,
  title,
  description,
  actions,
}: {
  badge?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <>
      {badge && <div className="ag-badge ag-badge-green">{badge}</div>}
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
    </>
  );
}

export function PageHeader({
  badge,
  title,
  description,
  actions,
  panel,
}: {
  badge?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  panel?: ReactNode;
}) {
  if (panel) {
    return (
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="p-7 lg:p-9">
            <HeaderContent
              badge={badge}
              title={title}
              description={description}
              actions={actions}
            />
          </div>
          <div className="ag-hero-panel">{panel}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="ag-card-strong p-7 lg:p-9">
      <HeaderContent
        badge={badge}
        title={title}
        description={description}
        actions={actions}
      />
    </section>
  );
}
