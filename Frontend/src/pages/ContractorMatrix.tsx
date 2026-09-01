import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  type BarShapeProps,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
import MethodologyTooltip from '../components/MethodologyTooltip';
import { useApi } from '../data/useApi';
import { fetchContractors } from '../data/api';
import type { ContractorRecord } from '../data/api';

// ─── Chart utilities ─────────────────────────────────────────

function makeBrightBar(overrideFill?: string) {
  return function ActiveBar(props: BarShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill = '#4f6ef7' } = props;
    const useFill = overrideFill ?? String(fill);
    return (
      <rect
        x={x} y={y} width={Number(width)} height={Math.max(0, Number(height))}
        fill={useFill} rx={3} ry={3}
        style={{ filter: 'brightness(1.35)' }}
      />
    );
  };
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--glass-border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--text-1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: 'var(--glass-shadow)',
};

// ─── Health derivation from risk_score_avg ────────────────────

type AgencyHealth = 'Healthy' | 'Moderate' | 'High Risk' | 'DATA_ERROR' | 'Unassigned';

function deriveHealth(c: ContractorRecord): AgencyHealth {
  if (c.health_rating) return c.health_rating as AgencyHealth;
  if (c.total_works === 0) return 'Unassigned';
  if (c.risk_score_avg < 15) return 'Healthy';
  if (c.risk_score_avg < 40) return 'Moderate';
  return 'High Risk';
}

function HealthBadge({ health }: { health: AgencyHealth }) {
  const map: Record<AgencyHealth, string> = {
    'Healthy':    'badge-success',
    'Moderate':   'badge-warn',
    'High Risk':  'badge-danger',
    'DATA_ERROR': 'badge-danger',
    'Unassigned': 'badge-neutral',
  };
  return (
    <span
      className={`badge ${map[health]}`}
      title={health === 'DATA_ERROR' ? "Data entry anomaly in source sheet (>900 risk score)" : undefined}
    >
      {health === 'DATA_ERROR' ? 'DATA ERROR' : health}
    </span>
  );
}

const SUMMARY_CARDS = [
  { label: 'Healthy / Satisfactory',   health: 'Healthy'    as AgencyHealth, icon: TrendingUp,   color: 'var(--success)' },
  { label: 'Moderate / Slow Progress', health: 'Moderate'   as AgencyHealth, icon: Clock,        color: 'var(--warn)' },
  { label: 'High Risk / Delayed',      health: 'High Risk'  as AgencyHealth, icon: AlertTriangle, color: 'var(--danger)' },
  { label: 'Unassigned / Pending',     health: 'Unassigned' as AgencyHealth, icon: TrendingDown, color: 'var(--text-3)' },
];

function LoadingSkeleton({ height = 200, label = 'Loading...' }: { height?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height, color: 'var(--text-3)' }}>
      <Loader2 size={22} className="animate-spin" />
      <span className="text-[12px]">{label}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export default function ContractorMatrix() {
  const [search, setSearch] = useState('');
  const [chartMode, setChartMode] = useState<'risk' | 'progress'>('risk');
  const [tableFilter, setTableFilter] = useState<'all' | 'high_risk' | 'top_performers' | 'zero_progress'>('all');

  const { data: contractors, loading, error } = useApi(() => fetchContractors(), []);

  // Enrich with derived health
  const enriched = useMemo(() =>
    (contractors || []).map(c => ({ ...c, health: deriveHealth(c) })),
    [contractors]
  );

  const filtered = useMemo(() => {
    return enriched.filter(c => {
      // Table segmented control filter
      if (tableFilter === 'high_risk' && c.health !== 'High Risk' && c.health !== 'DATA_ERROR') return false;
      if (tableFilter === 'top_performers' && (c.health !== 'Healthy' || c.avg_financial_progress_pct <= 60)) return false;
      if (tableFilter === 'zero_progress' && c.avg_financial_progress_pct !== 0) return false;

      // Search filter
      if (search !== '' && !c.agency_name.toLowerCase().includes(search.toLowerCase())) return false;

      return true;
    });
  }, [enriched, tableFilter, search]);

  const healthCount = (h: AgencyHealth) => enriched.filter(c => c.health === h).length;

  // Chart data sliced to Top 20 based on chartMode toggle
  const top20ChartData = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => {
      if (chartMode === 'risk') {
        return b.risk_score_avg - a.risk_score_avg;
      }
      return b.avg_financial_progress_pct - a.avg_financial_progress_pct;
    });

    return sorted.slice(0, 20).map(c => ({
      name: c.agency_name.length > 15 ? `${c.agency_name.slice(0, 14)}…` : c.agency_name,
      fullName: c.agency_name,
      value: chartMode === 'risk' ? c.risk_score_avg : c.avg_financial_progress_pct,
      color: c.health === 'Healthy' ? '#34d399' : c.health === 'High Risk' || c.health === 'DATA_ERROR' ? '#f87171' : '#fbbf24',
    }));
  }, [enriched, chartMode]);

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {error && (
        <div className="card p-4 flex items-center gap-3 animate-fade-in" style={{ borderColor: 'var(--danger)' }}>
          <AlertTriangle size={16} color="var(--danger)" />
          <span className="text-[12px]" style={{ color: 'var(--text-1)' }}>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map(({ label, health: h, icon: Icon, color }, i) => (
          <div
            key={h}
            className="card p-4 flex items-center gap-4 animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-dim)' }}
            >
              <Icon size={18} color={color} />
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>{label}</p>
              <p className="text-[24px] font-bold leading-none mt-1" style={{ color }}>
                {loading ? '—' : healthCount(h)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top 20 Chart with Toggle */}
      <div className="card p-5 animate-slide-up" style={{ animationDelay: '240ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {chartMode === 'risk' ? 'Top 20 Agencies by Risk Score' : 'Top 20 Agencies by Financial Progress'}
              </h3>
              <MethodologyTooltip metric={chartMode === 'risk' ? 'risk_score' : 'financial_progress'} />
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              {chartMode === 'risk'
                ? 'Agencies requiring performance monitoring due to risk escalation'
                : 'Top executing agencies ranked by average financial progress %'}
            </p>
          </div>

          {/* Segmented Toggle for Chart */}
          <div className="flex items-center gap-1 p-1 rounded-lg shrink-0" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setChartMode('risk')}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                chartMode === 'risk' ? 'bg-red-500/20 text-red-400 font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              🔴 Top 20 by Risk
            </button>
            <button
              onClick={() => setChartMode('progress')}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                chartMode === 'progress' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              🟢 Top 20 by Progress
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top20ChartData} barSize={16}>
              <XAxis dataKey="name" tick={{ fill: 'var(--chart-text, #505050)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--chart-text, #505050)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={{ color: 'var(--text-1)' }}
                labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                formatter={(value: any) => [
                  chartMode === 'risk' ? Number(value).toFixed(1) : `${Number(value)}%`,
                  chartMode === 'risk' ? 'Avg Risk Score' : 'Avg Progress %'
                ]}
                labelFormatter={(label: any, payload: any) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName || label;
                  }
                  return label;
                }}
              />
              <Bar dataKey="value" name={chartMode === 'risk' ? 'Risk Score' : 'Progress %'} radius={[4, 4, 0, 0]} activeBar={makeBrightBar()}>
                {top20ChartData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Master Directory Table */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
              Contractor Master Directory
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
              {filtered.length} Agencies
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Table Segmented Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              {(['all', 'high_risk', 'top_performers', 'zero_progress'] as const).map(mode => {
                const labels = {
                  all: 'All',
                  high_risk: 'High Risk',
                  top_performers: 'Top Performers',
                  zero_progress: 'Zero Progress',
                };
                const isActive = tableFilter === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setTableFilter(mode)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>

            <input
              className="input-dark py-1.5 text-[11px]"
              style={{ width: 180 }}
              placeholder="Search agency..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn-ghost py-1.5 text-[11px]">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <LoadingSkeleton height={300} label="Loading contractors..." />
          ) : (
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Executing Agency</th>
                  <th>Health Rating</th>
                  <th className="text-right">Total Works</th>
                  <th className="text-right">In Progress</th>
                  <th className="text-right">Delayed</th>
                  <th className="text-right">Completed</th>
                  <th className="text-right">Expenditure (Lacs)</th>
                  <th className="text-right">Risk Score</th>
                  <th style={{ minWidth: 160 }}>Avg Progress</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {filtered.map(c => (
                  <tr key={c.agency_name} className={c.health === 'High Risk' || c.health === 'DATA_ERROR' ? 'row-danger' : ''}>
                    <td>
                      <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{c.agency_name}</p>
                    </td>
                    <td><HealthBadge health={c.health} /></td>
                    <td className="text-right font-semibold" style={{ color: 'var(--text-1)' }}>{c.total_works}</td>
                    <td className="text-right" style={{ color: 'var(--info)' }}>{c.in_progress}</td>
                    <td className="text-right" style={{ color: c.delayed > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                      {c.delayed}
                    </td>
                    <td className="text-right" style={{ color: 'var(--success)' }}>{c.completed}</td>
                    <td className="text-right font-medium" style={{ color: 'var(--text-1)' }}>
                      ₹{c.total_expenditure_lacs.toLocaleString()}
                    </td>
                    <td className="text-right font-semibold" style={{ color: c.risk_score_avg > 40 ? 'var(--danger)' : 'var(--text-3)' }}>
                      {c.risk_score_avg.toFixed(1)}
                    </td>
                    <td title={c.avg_financial_progress_pct === 0 ? "No expenditure recorded in source sheet. May indicate work not yet started or missing data entry." : undefined}>
                      <ProgressBar value={c.avg_financial_progress_pct} showLabel />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                      No contractors found matching your selection
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            Showing {filtered.length} of {enriched.length} agencies
          </span>
        </div>
      </div>

    </div>
  );
}
