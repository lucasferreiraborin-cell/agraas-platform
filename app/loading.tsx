export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero skeleton */}
      <div className="ag-card-strong p-8">
        <div className="h-4 w-32 rounded-full bg-[var(--border)]" />
        <div className="mt-4 h-8 w-64 rounded-full bg-[var(--border)]" />
        <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-[var(--border)]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <div className="h-3 w-20 rounded-full bg-[var(--border)]" />
              <div className="mt-4 h-7 w-16 rounded-full bg-[var(--border)]" />
              <div className="mt-2 h-3 w-28 rounded-full bg-[var(--border)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="ag-card p-8">
            <div className="h-5 w-40 rounded-full bg-[var(--border)]" />
            <div className="mt-2 h-3 w-56 rounded-full bg-[var(--border)]" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-14 rounded-2xl bg-[var(--surface-soft)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
