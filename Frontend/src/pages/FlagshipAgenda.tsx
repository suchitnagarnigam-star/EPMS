import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  type BarShapeProps,
} from 'recharts';
import { fetchSasciData, type SasciWork } from '../data/api';
import { useApi } from '../data/useApi';
import ProgressBar from '../components/ProgressBar';
import SasciDetailModal from '../components/SasciDetailModal';
import LoadingSkeleton, { KpiCardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';

function makeBrightBar(overrideFill?: string) {
  return function ActiveBar(props: BarShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill = '#4f6ef7' } = props;
    const useFill = overrideFill ?? String(fill);
    return (
      <rect x={x} y={y} width={Number(width)} height={Math.max(0, Number(height))}
            fill={useFill} rx={2} ry={2}
            style={{ filter: 'brightness(1.35)' }} />
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

function stageBadgeFor(pct: number | null) {
  const p = pct ?? 0;
  if (p === 100) return <span className="badge badge-success">Completed</span>;
  if (p > 75)    return <span className="badge badge-info">Advanced</span>;
  if (p >= 25)   return <span className="badge badge-warn">In Progress</span>;
  return <span className="badge badge-danger">Early Stage</span>;
}

export default function FlagshipAgenda() {
  const { data, loading, error, refetch } = useApi(fetchSasciData);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'MDF' | 'SASCI'>('ALL');
  const [selectedWork, setSelectedWork] = useState<SasciWork | null>(null);

  if (loading) {
    return (
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
        <ChartSkeleton height="h-48" />
        <LoadingSkeleton height={300} label="Loading flagship road works..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1440px] mx-auto">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  const allWorks = data?.works || [];
  const kpis = data?.kpis || {
    total_works: 0,
    total_km: 0,
    completed_km: 0,
    avg_pct_complete: 0,
    mdf_count: 0,
    sasci_count: 0,
  };

  const filteredWorks = allWorks.filter(w => {
    if (sourceFilter === 'ALL') return true;
    const funding = (w.source_of_funding || '').toUpperCase();
    return funding.includes(sourceFilter);
  });

  const chartData = filteredWorks.map(w => {
    const funding = (w.source_of_funding || '').toUpperCase();
    const prefix = funding.includes('MDF') ? 'MDF' : 'SCI';
    const workId = `${prefix}-${String(w.sr_no || w.id).padStart(3, '0')}`;
    return {
      name: workId,
      physical: w.pct_length_completed ?? 0,
      fill: funding.includes('MDF') ? '#4f6ef7' : '#3d9bd4',
    };
  });

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Flagship Works</p>
          <p className="text-[24px] font-bold mt-1.5 leading-none text-primary-400">{kpis.total_works} Works</p>
          <p className="text-[10px] mt-1 text-slate-400">{kpis.mdf_count} MDF • {kpis.sasci_count} SASCI</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Road Length</p>
          <p className="text-[24px] font-bold mt-1.5 leading-none text-sky-400">{kpis.total_km} Km</p>
          <p className="text-[10px] mt-1 text-slate-400">Target Infrastructure Scope</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Completed Length</p>
          <p className="text-[24px] font-bold mt-1.5 leading-none text-emerald-400">{kpis.completed_km} Km</p>
          <p className="text-[10px] mt-1 text-slate-400">
            {kpis.total_km > 0 ? ((kpis.completed_km / kpis.total_km) * 100).toFixed(1) : 0}% Total Completion
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Average Physical %</p>
          <p className="text-[24px] font-bold mt-1.5 leading-none text-amber-400">{kpis.avg_pct_complete}%</p>
          <p className="text-[10px] mt-1 text-slate-400">Cross-Project Progress Mean</p>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-200">Physical Progress — All Flagship Works</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Physical completion percentage by flagship road project</p>
          </div>
          <button onClick={refetch} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-200">
            <RefreshCw size={14} />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={1} barSize={12}>
            <XAxis dataKey="name" tick={{ fill: '#808080', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#808080', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-1)' }} labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="physical" name="Physical Progress %" radius={[2,2,0,0]} activeBar={makeBrightBar()}>
              {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Source Filter Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['ALL', 'MDF', 'SASCI'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
              style={{
                background: sourceFilter === f ? '#4f6ef7' : 'var(--card)',
                color:      sourceFilter === f ? '#fff'    : 'var(--text-2)',
                border:     `1px solid ${sourceFilter === f ? '#4f6ef7' : 'var(--border)'}`,
              }}
            >
              {f === 'ALL' ? `All Works (${allWorks.length})` : f === 'MDF' ? `MDF Works (${kpis.mdf_count})` : `SASCI Works (${kpis.sasci_count})`}
            </button>
          ))}
        </div>
      </div>

      {/* Flagship Works Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1060 }}>
            <thead className="tbl-head">
              <tr>
                <th>Work ID</th>
                <th style={{ minWidth: 260 }}>Name of Road</th>
                <th>Road Type</th>
                <th>Constituency</th>
                <th className="text-right">Total KM</th>
                <th className="text-right">Done KM</th>
                <th style={{ minWidth: 140 }}>Physical %</th>
                <th>Progress As Of</th>
                <th className="text-right">Est. Cost (Lacs)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {filteredWorks.map(w => {
                const funding = (w.source_of_funding || '').toUpperCase();
                const prefix = funding.includes('MDF') ? 'MDF' : 'SCI';
                const workId = `${prefix}-${String(w.sr_no || w.id).padStart(3, '0')}`;
                return (
                  <tr
                    key={w.id}
                    onClick={() => setSelectedWork(w)}
                    className="cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <td>
                      <span className="font-semibold text-slate-300">{workId}</span>
                    </td>
                    <td style={{ color: 'var(--text-1)', maxWidth: 300 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.name_of_road || 'N/A'}
                      </div>
                    </td>
                    <td><span className="badge badge-neutral">{w.type_of_road || 'N/A'}</span></td>
                    <td className="text-slate-300">{w.constituency || 'Ludhiana'}</td>
                    <td className="text-right font-medium text-slate-200">{w.total_length_km ?? 'N/A'}</td>
                    <td className="text-right text-emerald-400 font-medium">{w.completed_length_km ?? 'N/A'}</td>
                    <td><ProgressBar value={w.pct_length_completed ?? 0} showLabel /></td>
                    <td className="text-xs text-slate-400">{w.progress_as_of || 'N/A'}</td>
                    <td className="text-right font-medium text-slate-200">
                      {w.est_cost_lacs ? `₹${w.est_cost_lacs.toLocaleString()}` : 'N/A'}
                    </td>
                    <td>{stageBadgeFor(w.pct_length_completed)}</td>
                  </tr>
                );
              })}
              {filteredWorks.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-500">
                    No flagship works found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <SasciDetailModal work={selectedWork} onClose={() => setSelectedWork(null)} />
    </div>
  );
}
