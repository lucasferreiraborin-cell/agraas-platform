export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`ag-skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonKpiCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-40" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
