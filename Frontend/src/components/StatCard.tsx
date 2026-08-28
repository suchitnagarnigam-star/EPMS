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
  delay?: number; // stagger delay in ms
}

export default function StatCard({
  label, value, sub, trend, trendLabel,
  accent = '#4f6ef7', icon, delay = 0,
}: Props) {
  return (
    <div
      className="card p-5 flex flex-col gap-2.5 stat-glow animate-slide-up"
      style={{
        animationDelay: `${delay}ms`,
        borderTop: `2px solid ${accent}40`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 8px 32px rgba(0,0,0,0.40), 0 0 28px ${accent}20`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div className="flex items-start justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}18`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-[28px] font-bold leading-none" style={{ color: accent }}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-3)' }}>
            {sub}
          </p>
        )}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1.5 mt-auto">
          {trend === 'up'   && <TrendingUp   size={12} color="var(--success)" />}
          {trend === 'down' && <TrendingDown  size={12} color="var(--danger)"  />}
          {trend === 'flat' && <Minus         size={12} color="var(--text-3)"  />}
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
