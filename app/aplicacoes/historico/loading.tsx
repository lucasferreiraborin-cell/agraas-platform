export default function Loading() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--surface-soft)] rounded w-56" />
        <div className="flex gap-3">
          <div className="h-10 bg-[var(--surface-soft)] rounded w-40" />
          <div className="h-10 bg-[var(--surface-soft)] rounded w-32" />
        </div>
        <div className="ag-card overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 border-b border-[var(--border)] last:border-0 bg-[var(--surface-soft)] opacity-50 m-2 rounded" />
          ))}
        </div>
      </div>
    </main>
  );
}
