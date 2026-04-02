export default function Loading() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--surface-soft)] rounded w-40" />
        <div className="ag-card h-12 w-full" />
        <div className="ag-card overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 border-b border-[var(--border)] last:border-0 bg-[var(--surface-soft)] opacity-50 m-2 rounded" />
          ))}
        </div>
      </div>
    </main>
  );
}
