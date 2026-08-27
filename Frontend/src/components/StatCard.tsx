import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  accent?: string;
  icon?: ReactNode;
}

export default function StatCard({ label, value, sub, trend, trendLabel, accent = '#4f6ef7', icon }: Props) {
  return (
    <div className="card p-5 flex flex-col gap-2.5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#606060' }}>{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[11px] mt-1.5" style={{ color: '#505050' }}>{sub}</p>}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1.5 mt-auto">
          {trend === 'up'   && <TrendingUp  size={12} color="#3db97d" />}
          {trend === 'down' && <TrendingDown size={12} color="#d94040" />}
          {trend === 'flat' && <Minus size={12} color="#808080" />}
          <span className="text-[10px]" style={{ color: '#505050' }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
