interface Props {
  value: number;   // 0-100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ value, color = '#4f6ef7', height = 6, showLabel = false }: Props) {
  const c = value >= 80 ? '#3db97d' : value >= 50 ? color : value >= 30 ? '#d4a017' : '#d94040';
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 prog-track" style={{ height }}>
        <div style={{ width: `${value}%`, height: '100%', background: c, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      {showLabel && (
        <span className="text-[11px] font-semibold w-8 text-right shrink-0" style={{ color: c }}>{value}%</span>
      )}
    </div>
  );
}
