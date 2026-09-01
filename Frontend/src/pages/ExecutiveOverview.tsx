import { useState } from 'react';
import { Download, Filter, Loader2, AlertCircle, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, Sector, type PieSectorDataItem,
  type BarShapeProps,
} from 'recharts';
import StatCard from '../components/StatCard';
import StageBadge from '../components/StageBadge';
import RiskBadge from '../components/RiskBadge';
import ProgressBar from '../components/ProgressBar';
import MethodologyTooltip from '../components/MethodologyTooltip';
import { useApi } from '../data/useApi';
import { fetchKpis, fetchWorks, fetchZones, fetchFundDistribution } from '../data/api';
import type { KpiData, WorkRecord, ZoneRecord, FundDistributionRecord } from '../data/api';

// ─── Chart utilities ─────────────────────────────────────────

function makeBrightBar(overrideFill?: string) {
  return function ActiveBar(props: BarShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill = '#4f6ef7' } = props;
    const useFill = overrideFill ?? String(fill);
    return (
      <rect x={x} y={y} width={Number(width)} height={Math.max(0, Number(height))}
            fill={useFill} rx={3} ry={3}
            style={{ filter: 'brightness(1.35)' }} />
    );
  };
}

function ActivePieShape(props: PieSectorDataItem) {
  const {
    cx = 0, cy = 0, innerRadius = 0, outerRadius = 0,
    startAngle = 0, endAngle = 0, fill = '#fff',
  } = props;
  return (
    <Sector cx={cx} cy={cy}
            innerRadius={innerRadius}
            outerRadius={Number(outerRadius) + 6}
            startAngle={startAngle} endAngle={endAngle}
            fill={fill} stroke="none"
            style={{ outline: 'none', filter: 'brightness(1.18)' }} />
  );
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--glass-border)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--text-2)',
  backdropFilter: 'blur(8px)',
};

const STATUS_COLORS: Record<string, string> = {
  'Completed': '#3db97d',
  'In Progress': '#4f6ef7',
  'Procurement': '#3d9bd4',
  'Not Started': '#404040',
  'Delayed/Held Up': '#d4a017',
};

const FUND_COLORS = ['#4f6ef7', '#3d9bd4', '#3db97d', '#d4a017', '#d94040', '#8b5cf6', '#606060'];

// ─── Loading skeleton component ──────────────────────────────

function LoadingSkeleton({ height = 200, label = 'Loading...' }: { height?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height, color: '#505050' }}>
      <Loader2 size={20} className="animate-spin" />
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-4 flex items-center gap-3" style={{ borderColor: '#d94040' }}>
      <AlertCircle size={16} color="#d94040" />
      <span className="text-[12px]" style={{ color: '#d0d0d0' }}>{message}</span>
      {onRetry && (
        <button className="btn-ghost py-1 px-2 text-[11px] ml-auto" onClick={onRetry}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export default function ExecutiveOverview() {
  const [branch, setBranch] = useState('All');
  const [zone,   setZone]   = useState('All');
  const [search, setSearch] = useState('');
  const [expandedChart, setExpandedChart] = useState<'delivery' | 'zone' | 'fund' | null>(null);

  const cleanParam = (val: string | undefined) => {
    if (!val || val === 'All' || val === 'all' || val.trim() === '') return undefined;
    return val;
  };

  const apiBranch = cleanParam(branch);
  const apiZone   = cleanParam(zone);

  // Fetch data from backend
  const { data: kpis, loading: kpisLoading, error: kpisError, refetch: refetchKpis } =
    useApi<KpiData>(() => fetchKpis(apiBranch), [apiBranch]);

  const { data: criticalWorks, loading: worksLoading, error: worksError, refetch: refetchWorks } =
    useApi(() => fetchWorks({
      branch: apiBranch,
      zone: apiZone,
      risk_score_min: 30,
      page: 1,
      page_size: 50,
    }), [apiBranch, apiZone]);

  const { data: zoneProgress, loading: zonesLoading } =
    useApi<ZoneRecord[]>(() => fetchZones(apiBranch), [apiBranch]);

  const { data: fundDist, loading: fundLoading } =
    useApi<FundDistributionRecord[]>(() => fetchFundDistribution(), []);

  // Derive stage distribution from KPIs delivery status
  const stageDistribution = kpis
    ? Object.entries(kpis.by_delivery_status)
        .filter(([, count]) => count > 0)
        .map(([name, value]) => ({
          name,
          value,
          fill: STATUS_COLORS[name] || '#606060',
        }))
    : [];

  // Zone chart data (group by zone, mapping B&R to BR and O&M to OM)
  const zoneMap: Record<string, { zone: string; BR: number; OM: number }> = {};
  (zoneProgress || []).forEach(z => {
    const name = z.zone || 'Unknown';
    if (!zoneMap[name]) {
      zoneMap[name] = { zone: name, BR: 0, OM: 0 };
    }
    if (z.branch === 'B&R') {
      zoneMap[name].BR = Math.round(z.avg_physical_progress);
    } else if (z.branch === 'O&M') {
      zoneMap[name].OM = Math.round(z.avg_physical_progress);
    }
  });
  const zoneChartData = Object.values(zoneMap);
  const uniqueZones = Object.keys(zoneMap);

  // Fund distribution chart data
  const fundChartData = (fundDist || []).map((f, i) => ({
    name: f.fund_type,
    expenditure: Math.round(f.total_expenditure_lacs * 100) / 100,
    color: FUND_COLORS[i % FUND_COLORS.length],
  }));

  // Critical works (high risk) — filter from results
  const criticalList: WorkRecord[] = (criticalWorks?.results || [])
    .filter(w => Number(w.risk_score ?? 0) >= 30)
    .sort((a, b) => Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0));

  // Apply local search filter
  const filtered = criticalList.filter(w =>
    search === '' ||
    (w.work_id?.toLowerCase().includes(search.toLowerCase())) ||
    (w.work_description?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalWorks = kpis?.total_works ?? 0;
  const brWorks = kpis?.by_branch?.['B&R'] ?? 0;
  const omWorks = kpis?.by_branch?.['O&M'] ?? 0;
  const estCostCr = ((kpis?.total_est_cost_lacs ?? 0) / 100).toFixed(1);
  const tenderCostCr = ((kpis?.total_tender_cost_lacs ?? 0) / 100).toFixed(1);
  const expenditureCr = ((kpis?.total_expenditure_lacs ?? 0) / 100).toFixed(1);
  const tenderToEstPct = kpis && kpis.total_est_cost_lacs > 0
    ? ((kpis.total_tender_cost_lacs / kpis.total_est_cost_lacs) * 100).toFixed(1)
    : '0';
  const disbursedPct = kpis && kpis.total_tender_cost_lacs > 0
    ? ((kpis.total_expenditure_lacs / kpis.total_tender_cost_lacs) * 100).toFixed(1)
    : '0';

  const toggleExpand = (chartId: 'delivery' | 'zone' | 'fund') => {
    setExpandedChart(prev => prev === chartId ? null : chartId);
  };

  const renderDeliveryChart = (height = 200) => (
    <div className="card p-5 flex flex-col gap-3 animate-slide-up relative transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Works by Delivery Status</h3>
          <MethodologyTooltip metric="total_works" />
        </div>
        <button
          onClick={() => toggleExpand('delivery')}
          title={expandedChart === 'delivery' ? 'Collapse chart' : 'Expand chart'}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {expandedChart === 'delivery' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
        Current portfolio distribution — {totalWorks.toLocaleString()} works
      </p>
      {kpisLoading ? (
        <LoadingSkeleton height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={stageDistribution}
              cx="50%" cy="50%"
              innerRadius={expandedChart === 'delivery' ? 80 : 55}
              outerRadius={expandedChart === 'delivery' ? 120 : 80}
              dataKey="value"
              strokeWidth={0}
              stroke="none"
              activeShape={ActivePieShape}
            >
              {stageDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-1)' }} labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: expandedChart === 'delivery' ? 12 : 11, color: '#606060' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderZoneChart = (height = 200) => (
    <div className="card p-5 flex flex-col gap-3 animate-slide-up relative transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Progress by Zone</h3>
          <MethodologyTooltip metric="physical_progress" />
        </div>
        <button
          onClick={() => toggleExpand('zone')}
          title={expandedChart === 'zone' ? 'Collapse chart' : 'Expand chart'}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {expandedChart === 'zone' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Avg physical progress — B&amp;R vs O&amp;M</p>
      {zonesLoading ? (
        <LoadingSkeleton height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={zoneChartData} barGap={2} barSize={expandedChart === 'zone' ? 18 : 10}>
            <XAxis dataKey="zone" tick={{ fill: 'var(--chart-text, #505050)', fontSize: expandedChart === 'zone' ? 12 : 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--chart-text, #505050)', fontSize: expandedChart === 'zone' ? 12 : 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-1)' }} labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="BR" fill="#4f6ef7" radius={[3,3,0,0]} name="B&R" activeBar={makeBrightBar('#7b93ff')} />
            <Bar dataKey="OM" fill="#3d9bd4" radius={[3,3,0,0]} name="O&M" activeBar={makeBrightBar('#60b8e8')} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderFundChart = (height = 200) => (
    <div className="card p-5 flex flex-col gap-3 animate-slide-up relative transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Expenditure by Fund Type (₹ Lacs)</h3>
          <MethodologyTooltip metric="verified_disbursed" />
        </div>
        <button
          onClick={() => toggleExpand('fund')}
          title={expandedChart === 'fund' ? 'Collapse chart' : 'Expand chart'}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {expandedChart === 'fund' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Disbursement distribution across funding sources</p>
      {fundLoading ? (
        <LoadingSkeleton height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={fundChartData} barSize={expandedChart === 'fund' ? 22 : 14}>
            <XAxis dataKey="name" tick={{ fill: 'var(--chart-text, #505050)', fontSize: expandedChart === 'fund' ? 12 : 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--chart-text, #505050)', fontSize: expandedChart === 'fund' ? 12 : 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} formatter={(v) => [`₹${Number(v).toLocaleString()} L`, '']} />
            <Bar dataKey="expenditure" name="₹ Lacs" radius={[3,3,0,0]} activeBar={makeBrightBar()}>
              {fundChartData.map((d, i) => (
                <Cell key={i} fill={d.color} stroke="none" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {/* Error banner */}
      {(kpisError || worksError) && (
        <ErrorBanner
          message={kpisError || worksError || 'Failed to load data'}
          onRetry={() => { refetchKpis(); refetchWorks(); }}
        />
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpisLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5">
              <LoadingSkeleton height={80} label="" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Sanctioned Works" value={totalWorks.toLocaleString()}
                      sub={`B&R: ${brWorks} • O&M: ${omWorks}`}
                      accent="#4f6ef7" delay={0} />
            <StatCard label="Sanctioned Budget Outlay" value={`₹${estCostCr} Cr`}
                      sub="Total Vetted Estimate Cost"
                      accent="#38bdf8" delay={60} />
            <StatCard label="Allotted Contract Value" value={`₹${tenderCostCr} Cr`}
                      sub={`${tenderToEstPct}% of Estimated Cost`}
                      accent="#4f6ef7" delay={120} />
            <StatCard label="Verified Disbursed Payment" value={`₹${expenditureCr} Cr`}
                      sub={`${disbursedPct}% Settlements Disbursed`}
                      accent="#34d399" delay={180} />
            <StatCard label="Financial Anomalies" value={String(kpis?.anomaly_count ?? 0)}
                      sub="Progress > 100% flagged"
                      accent="#f87171" delay={240} />
          </>
        )}
      </div>

      {/* Charts Row with Expandable Interaction */}
      {!expandedChart ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 transition-all duration-500">
          {renderDeliveryChart(200)}
          {renderZoneChart(200)}
          {renderFundChart(200)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 transition-all duration-500">
          {/* Left Column: Expanded Chart */}
          <div className="min-w-0">
            {expandedChart === 'delivery' && renderDeliveryChart(360)}
            {expandedChart === 'zone' && renderZoneChart(360)}
            {expandedChart === 'fund' && renderFundChart(360)}
          </div>
          {/* Right Column: Stacked Non-Expanded Charts */}
          <div className="flex flex-col gap-4 min-w-0">
            {expandedChart !== 'delivery' && renderDeliveryChart(150)}
            {expandedChart !== 'zone' && renderZoneChart(150)}
            {expandedChart !== 'fund' && renderFundChart(150)}
          </div>
        </div>
      )}


      {/* High Risk Works Table */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '320ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>High Risk Works Monitoring</h3>
              <span className="badge badge-danger">{criticalList.length} Flagged</span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              Works with risk score ≥ 30 — sorted by severity
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Filters */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} color="#505050" />
              <select className="input-dark text-[11px] py-1.5" value={branch} onChange={e => setBranch(e.target.value)}>
                <option value="All">All Branches</option>
                <option>B&R</option><option>O&M</option>
              </select>
            </div>
            <select className="input-dark text-[11px] py-1.5" value={zone} onChange={e => setZone(e.target.value)}>
              <option value="All">All Zones</option>
              {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <input className="input-dark text-[11px] py-1.5" style={{ width: 160 }}
                   placeholder="Search ID or work..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn-ghost py-1.5 text-[11px] gap-1.5">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {worksLoading ? (
            <LoadingSkeleton height={200} label="Loading works..." />
          ) : (
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Work ID</th>
                  <th style={{ minWidth: 260 }}>Description</th>
                  <th>Branch / Zone</th>
                  <th>Ward</th>
                  <th>Agency</th>
                  <th>Status</th>
                  <th style={{ minWidth: 160 }}>Physical Progress</th>
                  <th>Risk Score</th>
                  <th>Cost (Lacs)</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {filtered.map(w => (
                  <tr key={w.work_id} className={(w.risk_score ?? 0) >= 60 ? 'row-danger' : ''}>
                    <td><span className="font-semibold" style={{ color: 'var(--text-2)' }}>{w.work_id}</span></td>
                    <td style={{ color: 'var(--text-1)', maxWidth: 280 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.work_description || '—'}
                      </div>
                    </td>
                    <td>{w.branch} / {w.zone || '—'}</td>
                    <td>{w.ward || '—'}</td>
                    <td>{w.agency_name || '—'}</td>
                    <td><StageBadge stage={w.delivery_status || 'Not Started'} /></td>
                    <td><ProgressBar value={w.physical_progress_pct ?? 0} showLabel /></td>
                    <td><RiskBadge score={w.risk_score ?? 0} /></td>
                    <td style={{ color: '#d0d0d0' }}>₹{(w.est_cost_lacs ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8" style={{ color: '#404040' }}>
                    {worksLoading ? 'Loading...' : 'No high-risk works found'}
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
