import React, { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, AlertTriangle, Clock, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  type BarShapeProps,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
import MethodologyTooltip from '../components/MethodologyTooltip';
import { useWorkModal } from '../context/WorkModalContext';
import { useApi } from '../data/useApi';
import { fetchOfficers, fetchWorks, type OfficerRecord, type WorkRecord } from '../data/api';

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

// ─── Health derivation from avg_risk_score ────────────────────

type OfficerHealth = 'Healthy' | 'Moderate' | 'High Risk' | 'Unassigned';

function deriveOfficerHealth(o: OfficerRecord): OfficerHealth {
  if (o.total_works === 0) return 'Unassigned';
  if (o.avg_risk_score < 15) return 'Healthy';
  if (o.avg_risk_score < 40) return 'Moderate';
  return 'High Risk';
}

function HealthBadge({ health }: { health: OfficerHealth }) {
  const map: Record<OfficerHealth, string> = {
    'Healthy':    'badge-success',
    'Moderate':   'badge-warn',
    'High Risk':  'badge-danger',
    'Unassigned': 'badge-neutral',
  };
  return (
    <span className={`badge ${map[health]}`}>
      {health}
    </span>
  );
}

const SUMMARY_CARDS = [
  { label: 'Healthy / Low Risk',      health: 'Healthy'    as OfficerHealth, icon: TrendingUp,   color: 'var(--success)' },
  { label: 'Moderate Workload',        health: 'Moderate'   as OfficerHealth, icon: Clock,        color: 'var(--warn)' },
  { label: 'High Risk / Delayed',      health: 'High Risk'  as OfficerHealth, icon: AlertTriangle, color: 'var(--danger)' },
  { label: 'Unassigned / Pending',     health: 'Unassigned' as OfficerHealth, icon: TrendingDown, color: 'var(--text-3)' },
];

function LoadingSkeleton({ height = 200, label = 'Loading...' }: { height?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height, color: 'var(--text-3)' }}>
      <Loader2 size={22} className="animate-spin" />
      <span className="text-[12px]">{label}</span>
    </div>
  );
}

const DESIGNATIONS = ['All', 'JE', 'SDO', 'XEN', 'EE'] as const;

// ─── Main component ──────────────────────────────────────────

export default function OfficerCommand() {
  const { openWorkModal } = useWorkModal();
  const [search, setSearch] = useState('');
  const [designationFilter, setDesignationFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [chartMode, setChartMode] = useState<'risk' | 'progress'>('risk');
  
  const [expandedOfficer, setExpandedOfficer] = useState<number | null>(null);
  const [officerWorksMap, setOfficerWorksMap] = useState<Record<number, WorkRecord[]>>({});
  const [loadingWorks, setLoadingWorks] = useState<Record<number, boolean>>({});

  const toggleExpandOfficer = (officerId: number) => {
    if (expandedOfficer === officerId) {
      setExpandedOfficer(null);
      return;
    }
    setExpandedOfficer(officerId);
    if (!officerWorksMap[officerId]) {
      setLoadingWorks(prev => ({ ...prev, [officerId]: true }));
      fetchWorks({ officer_id: officerId, page_size: 200 })
        .then(res => {
          setOfficerWorksMap(prev => ({ ...prev, [officerId]: res.results }));
        })
        .catch(err => console.error("Error fetching works for officer:", err))
        .finally(() => {
          setLoadingWorks(prev => ({ ...prev, [officerId]: false }));
        });
    }
  };

  const { data: officers, loading, error } = useApi(
    () => fetchOfficers(
      designationFilter === 'All' ? undefined : designationFilter,
      branchFilter === 'All' ? undefined : branchFilter
    ),
    [designationFilter, branchFilter]
  );

  // Enrich with derived health
  const enriched = useMemo(() =>
    (officers || []).map(o => ({ ...o, health: deriveOfficerHealth(o) })),
    [officers]
  );

  const filtered = useMemo(() => {
    return enriched.filter(o => {
      // Search filter
      if (search !== '') {
        const q = search.toLowerCase();
        if (!o.officer_name.toLowerCase().includes(q) && !o.designation.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [enriched, search]);

  const healthCount = (h: OfficerHealth) => enriched.filter(o => o.health === h).length;

  // Chart data sliced to Top 20 based on chartMode toggle
  const top20ChartData = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => {
      if (chartMode === 'risk') {
        return b.avg_risk_score - a.avg_risk_score;
      }
      return b.avg_physical_progress - a.avg_physical_progress;
    });

    return sorted.slice(0, 20).map(o => ({
      name: o.officer_name.length > 15 ? `${o.officer_name.slice(0, 14)}…` : o.officer_name,
      fullName: `${o.officer_name} (${o.designation})`,
      value: chartMode === 'risk' ? o.avg_risk_score : o.avg_physical_progress,
      color: o.health === 'Healthy' ? '#34d399' : o.health === 'High Risk' ? '#f87171' : '#fbbf24',
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
                {chartMode === 'risk' ? 'Top 20 Officers by Risk Score' : 'Top 20 Officers by Physical Progress'}
              </h3>
              <MethodologyTooltip metric={chartMode === 'risk' ? 'risk_score' : 'physical_progress'} />
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              {chartMode === 'risk'
                ? 'Supervising officers ranked by average portfolio risk score'
                : 'Supervising officers ranked by average physical completion %'}
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
              Supervising Officer Directory
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
              {filtered.length} Officers
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Designation Segmented Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              {DESIGNATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDesignationFilter(d)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    designationFilter === d
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Branch Filter */}
            <select
              className="input-dark py-1.5 text-[11px]"
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="B&R">B&R</option>
              <option value="O&M">O&M</option>
            </select>

            <input
              className="input-dark py-1.5 text-[11px]"
              style={{ width: 180 }}
              placeholder="Search officer..."
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
            <LoadingSkeleton height={300} label="Loading officers..." />
          ) : (
            <table className="w-full" style={{ minWidth: 950 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Supervising Officer</th>
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
                {filtered.map(o => (
                  <React.Fragment key={o.officer_id}>
                    <tr
                      onClick={() => toggleExpandOfficer(o.officer_id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-500/10 ${o.health === 'High Risk' ? 'row-danger' : ''}`}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          {expandedOfficer === o.officer_id ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{o.officer_name}</p>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{o.designation}</span>
                          </div>
                        </div>
                      </td>
                      <td><HealthBadge health={o.health} /></td>
                      <td className="text-right font-semibold" style={{ color: 'var(--text-1)' }}>{o.total_works}</td>
                      <td className="text-right" style={{ color: 'var(--info)' }}>{o.in_progress_count}</td>
                      <td className="text-right" style={{ color: o.delayed_count > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                        {o.delayed_count}
                      </td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>{o.completed_count}</td>
                      <td className="text-right font-medium" style={{ color: 'var(--text-1)' }}>
                        ₹{o.total_expenditure_lacs.toLocaleString()}
                      </td>
                      <td className="text-right font-semibold" style={{ color: o.avg_risk_score > 40 ? 'var(--danger)' : 'var(--text-3)' }}>
                        {o.avg_risk_score.toFixed(1)}
                      </td>
                      <td>
                        <ProgressBar value={o.avg_physical_progress} showLabel />
                      </td>
                    </tr>

                    {/* Expanded Works Sub-Table */}
                    {expandedOfficer === o.officer_id && (
                      <tr>
                        <td colSpan={9} className="p-4" style={{ background: 'var(--tbl-head-bg)', borderBottom: '1px solid var(--border)' }}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>
                              <span>Works supervised by <strong style={{ color: 'var(--text-1)' }}>{o.officer_name} ({o.designation})</strong></span>
                              <span className="text-[10px] text-blue-400">💡 Click any work row to view full details modal</span>
                            </div>
                            {loadingWorks[o.officer_id] ? (
                              <LoadingSkeleton height={80} label="Loading supervised works..." />
                            ) : (officerWorksMap[o.officer_id] || []).length > 0 ? (
                              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                                <table className="w-full text-[11px]">
                                  <thead className="tbl-head">
                                    <tr>
                                      <th className="py-2 px-3 text-left">Work ID</th>
                                      <th className="py-2 px-3 text-left">Description</th>
                                      <th className="py-2 px-3 text-left">Status</th>
                                      <th className="py-2 px-3 text-right">Physical Progress</th>
                                      <th className="py-2 px-3 text-right">Days Overdue</th>
                                      <th className="py-2 px-3 text-right">Risk Score</th>
                                    </tr>
                                  </thead>
                                  <tbody className="tbl-body">
                                    {(officerWorksMap[o.officer_id] || []).map(w => (
                                      <tr
                                        key={w.work_id}
                                        onClick={(e) => { e.stopPropagation(); openWorkModal(w.work_id, w); }}
                                        className="cursor-pointer hover:bg-blue-500/10 transition-colors"
                                      >
                                        <td className="py-2 px-3 font-mono font-semibold" style={{ color: 'var(--accent-text)' }}>{w.work_id}</td>
                                        <td className="py-2 px-3 max-w-md truncate" style={{ color: 'var(--text-1)' }}>{w.work_description || '—'}</td>
                                        <td className="py-2 px-3">{w.delivery_status || '—'}</td>
                                        <td className="py-2 px-3 text-right font-mono">{(w.physical_progress_pct ?? 0).toFixed(1)}%</td>
                                        <td className={`py-2 px-3 text-right font-mono ${(w.days_overdue ?? 0) > 0 ? 'text-red-400 font-bold' : ''}`}>
                                          {w.days_overdue ?? 0}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: (w.risk_score ?? 0) >= 30 ? 'var(--danger)' : 'var(--success)' }}>
                                          {w.risk_score ?? 0}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-[11px] py-2" style={{ color: 'var(--text-3)' }}>No work records found for this officer.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                      No officers found matching your selection criteria.
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
            Showing {filtered.length} of {enriched.length} officers
          </span>
        </div>
      </div>

    </div>
  );
}
