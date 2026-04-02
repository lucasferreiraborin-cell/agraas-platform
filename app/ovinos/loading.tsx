export default function Loading() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--surface-soft)] rounded w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ag-card h-20" />
          ))}
        </div>
        <div className="ag-card h-64" />
      </div>
    </main>
  );
}
