export function KpiCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-3 w-24 rounded mb-3" style={{ background: 'var(--border)' }} />
      <div className="h-8 w-32 rounded mb-2" style={{ background: 'var(--hover)' }} />
      <div className="h-2 w-16 rounded" style={{ background: 'var(--border)' }} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded w-3/4" style={{ background: 'var(--border)' }} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`${height} card animate-pulse flex items-end gap-2 p-4`}>
      {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${h}%`, background: 'var(--border)' }}
        />
      ))}
    </div>
  );
}
