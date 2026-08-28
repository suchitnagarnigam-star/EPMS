import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  type BarShapeProps,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
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

type AgencyHealth = 'Healthy' | 'Moderate' | 'High Risk' | 'Unassigned';

function deriveHealth(c: ContractorRecord): AgencyHealth {
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
    'Unassigned': 'badge-neutral',
  };
  return <span className={`badge ${map[health]}`}>{health}</span>;
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
  const [healthFilter, setHealthFilter] = useState('All');

  const { data: contractors, loading, error } = useApi(() => fetchContractors(), []);

  // Enrich with derived health
  const enriched = useMemo(() =>
    (contractors || []).map(c => ({ ...c, health: deriveHealth(c) })),
    [contractors]
  );

  const filtered = enriched.filter(c =>
    (healthFilter === 'All' || c.health === healthFilter) &&
    (search === '' || c.agency_name.toLowerCase().includes(search.toLowerCase()))
  );

  const healthCount = (h: AgencyHealth) => enriched.filter(c => c.health === h).length;

  const chartData = enriched.map(c => ({
    name: c.agency_name.split(' ').slice(0, 2).join(' '),
    fullName: c.agency_name,
    progress: c.avg_financial_progress_pct,
    color: c.health === 'Healthy' ? '#34d399' : c.health === 'High Risk' ? '#f87171' : '#fbbf24',
  }));

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

      {/* Avg Progress Chart */}
      <div className="card p-5 animate-slide-up" style={{ animationDelay: '240ms' }}>
        <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>
          Average Financial Progress by Agency
        </h3>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-3)' }}>
          Financial completion across active works portfolio
        </p>
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={20}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={{ color: 'var(--text-1)' }}
                labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                formatter={(value: any) => [`${value}%`, 'Avg Progress']}
                labelFormatter={(label: any, payload: any) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName || label;
                  }
                  return label;
                }}
              />
              <Bar dataKey="progress" name="Avg Progress %" radius={[4, 4, 0, 0]} activeBar={makeBrightBar()}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Master Directory Table */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
            Contractor Master Directory
          </h3>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <input
              className="input-dark py-1.5 text-[11px]"
              style={{ width: 180 }}
              placeholder="Search agency..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="input-dark py-1.5 text-[11px]"
              value={healthFilter}
              onChange={e => setHealthFilter(e.target.value)}
            >
              <option value="All">All Health</option>
              {['Healthy', 'Moderate', 'High Risk', 'Unassigned'].map(h => <option key={h}>{h}</option>)}
            </select>
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
                  <tr key={c.agency_name} className={c.health === 'High Risk' ? 'row-danger' : ''}>
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
                    <td><ProgressBar value={c.avg_financial_progress_pct} showLabel /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                      No contractors found matching your search
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
