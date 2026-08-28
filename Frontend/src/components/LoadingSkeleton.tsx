export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-32 bg-gray-300 rounded mb-2" />
      <div className="h-2 w-16 bg-gray-100 rounded" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`${height} bg-gray-100 rounded-lg animate-pulse flex items-end gap-2 p-4`}>
      {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
