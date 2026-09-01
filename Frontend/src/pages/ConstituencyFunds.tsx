import { useState, useMemo } from 'react';
import { Download, Loader2, MapPin, Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, Sector,
  type PieSectorDataItem, type BarShapeProps,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
import MethodologyTooltip from '../components/MethodologyTooltip';
import { useApi } from '../data/useApi';
import { fetchConstituencies, fetchWards } from '../data/api';
import type { ConstituencyRecord, WardRecord } from '../data/api';

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

const COLORS = ['#4f6ef7','#3d9bd4','#3db97d','#d4a017','#d94040','#8b5cf6','#606060','#e879f9','#f97316'];

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

function LoadingSkeleton({ height = 200, label = 'Loading...' }: { height?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height, color: '#505050' }}>
      <Loader2 size={20} className="animate-spin" />
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

export default function ConstituencyFunds() {
  const [activeTab, setActiveTab] = useState<'constituencies' | 'wards'>('constituencies');
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All');
  const [selectedConstituency, setSelectedConstituency] = useState('All');

  const apiBranch = branch === 'All' ? undefined : branch;
  const apiConstituency = selectedConstituency === 'All' ? undefined : selectedConstituency;

  // Fetch constituencies
  const { data: constituencies, loading: constLoading, error: constError } = useApi<ConstituencyRecord[]>(
    () => fetchConstituencies(apiBranch), [apiBranch]
  );

  // Fetch wards
  const { data: wards, loading: wardsLoading, error: wardsError } = useApi<WardRecord[]>(
    () => fetchWards(apiConstituency, apiBranch), [apiConstituency, apiBranch]
  );

  const constList = constituencies || [];
  const wardList = wards || [];

  const uniqueConstituencies = useMemo(() => {
    return Array.from(new Set(constList.map(c => c.constituency))).filter(Boolean).sort();
  }, [constList]);

  const totals = {
    works:       constList.reduce((a, c) => a + c.total_works, 0),
    sanctioned:  constList.reduce((a, c) => a + c.total_est_cost_lacs, 0),
    tender:      constList.reduce((a, c) => a + c.total_tender_cost_lacs, 0),
    expenditure: constList.reduce((a, c) => a + c.total_expenditure_lacs, 0),
    critical:    constList.reduce((a, c) => a + c.critical_count, 0),
  };

  const filteredConstituencies = constList.filter(c =>
    search === '' || c.constituency.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWards = wardList.filter(w =>
    search === '' ||
    w.ward.toLowerCase().includes(search.toLowerCase()) ||
    w.constituency.toLowerCase().includes(search.toLowerCase())
  );

  const pieData = constList.map((c, i) => ({
    name: c.constituency,
    value: c.total_est_cost_lacs,
    fill: COLORS[i % COLORS.length],
  }));

  const utilData = constList.map((c, i) => ({
    name: c.constituency.length > 12 ? c.constituency.substring(0, 12) + '…' : c.constituency,
    sanctioned: Math.round(c.total_est_cost_lacs / 100),
    spent:      Math.round(c.total_expenditure_lacs / 100),
    color:      COLORS[i % COLORS.length],
  }));

  const exportCSV = () => {
    let csvContent = "";
    if (activeTab === 'constituencies') {
      csvContent = "Constituency,Total Works,B&R Works,O&M Works,Sanctioned (Lacs),Tender (Lacs),Expenditure (Lacs),Critical\n";
      filteredConstituencies.forEach(c => {
        csvContent += `"${c.constituency}",${c.total_works},${c.br_works},${c.om_works},${c.total_est_cost_lacs},${c.total_tender_cost_lacs},${c.total_expenditure_lacs},${c.critical_count}\n`;
      });
    } else {
      csvContent = "Ward,Constituency,Total Works,B&R Works,O&M Works,Sanctioned (Lacs),Tender (Lacs),Expenditure (Lacs),Utilisation %,Critical\n";
      filteredWards.forEach(w => {
        csvContent += `"${w.ward}","${w.constituency}",${w.total_works},${w.br_works},${w.om_works},${w.sanctioned_cost_lacs},${w.tender_value_lacs},${w.expenditure_lacs},${w.utilization_pct},${w.critical_works_count}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}_report.csv`;
    link.click();
  };

  const loading = activeTab === 'constituencies' ? constLoading : wardsLoading;
  const error = constError || wardsError;

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {/* Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: 'var(--text-1)' }}>Constituency & Ward Funds</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Financial distribution and work allocation across Ludhiana municipal electoral divisions
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setActiveTab('constituencies')}
            className={`flex items-center gap-2 px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeTab === 'constituencies'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Building2 size={14} /> Constituencies
          </button>
          <button
            onClick={() => setActiveTab('wards')}
            className={`flex items-center gap-2 px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeTab === 'wards'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapPin size={14} /> Wards
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-[12px]" style={{ color: '#d94040', borderColor: '#d94040' }}>
          ⚠ {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Works',         value: constLoading ? '—' : totals.works.toLocaleString(),                  accent: '#4f6ef7', metric: 'total_works' },
          { label: 'Sanctioned Cost',     value: constLoading ? '—' : `₹${(totals.sanctioned/100).toFixed(0)} Cr`,    accent: '#3d9bd4', metric: 'sanctioned_budget' },
          { label: 'Allotted Tender',     value: constLoading ? '—' : `₹${(totals.tender/100).toFixed(0)} Cr`,        accent: '#4f6ef7', metric: 'allotted_contract_value' },
          { label: 'Expenditure Paid',    value: constLoading ? '—' : `₹${(totals.expenditure/100).toFixed(0)} Cr`,   accent: '#3db97d', metric: 'verified_disbursed' },
          { label: 'Critical Works',      value: constLoading ? '—' : String(totals.critical),                         accent: '#d94040', metric: 'risk_score' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{k.label}</p>
              <MethodologyTooltip metric={k.metric} />
            </div>
            <p className="text-[22px] font-bold mt-1.5 leading-none" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts (Only shown on Constituencies tab) */}
      {activeTab === 'constituencies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Budget Allocation by Constituency</h3>
              <MethodologyTooltip metric="sanctioned_budget" />
            </div>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>Sanctioned estimate cost distribution (₹ Lacs)</p>
            {constLoading ? (
              <LoadingSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                    stroke="none"
                    activeShape={ActivePieShape}
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`₹${Number(v).toLocaleString()} L`, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#606060' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Sanctioned vs Expenditure (₹ Cr)</h3>
              <MethodologyTooltip metric="utilization_pct" />
            </div>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>Budget utilization comparison per constituency</p>
            {constLoading ? (
              <LoadingSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={utilData} barGap={3} barSize={14}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--chart-text, #505050)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--chart-text, #505050)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-1)' }} labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                           formatter={(v) => [`₹${Number(v)} Cr`, '']} />
                  <Bar dataKey="sanctioned" name="Sanctioned (₹ Cr)" fill="#4f6ef7" radius={[3,3,0,0]}
                       activeBar={makeBrightBar('#7b93ff')} />
                  <Bar dataKey="spent" name="Expenditure (₹ Cr)" fill="#3db97d" radius={[3,3,0,0]}
                       activeBar={makeBrightBar('#5ed4a0')} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
            {activeTab === 'constituencies' ? 'Constituency-wise Fund Statement' : 'Ward-wise Infrastructure Statement'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'wards' && (
              <select
                className="input-dark py-1.5 text-[11px]"
                value={selectedConstituency}
                onChange={e => setSelectedConstituency(e.target.value)}
              >
                <option value="All">All Constituencies</option>
                {uniqueConstituencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            <select
              className="input-dark py-1.5 text-[11px]"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="B&R">B&R Branch</option>
              <option value="O&M">O&M Branch</option>
            </select>

            <input
              className="input-dark py-1.5 text-[11px]"
              style={{ width: 180 }}
              placeholder={activeTab === 'constituencies' ? "Search constituency..." : "Search ward or constituency..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <button onClick={exportCSV} className="btn-ghost py-1.5 text-[11px]">
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <LoadingSkeleton height={300} label="Loading data..." />
          ) : activeTab === 'constituencies' ? (
            <table className="w-full" style={{ minWidth: 820 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Constituency</th>
                  <th className="text-right">Total Works</th>
                  <th className="text-right">B&amp;R Works</th>
                  <th className="text-right">O&amp;M Works</th>
                  <th className="text-right">Sanctioned (₹ Lacs)</th>
                  <th className="text-right">Tender Value (₹ Lacs)</th>
                  <th className="text-right">Expenditure (₹ Lacs)</th>
                  <th className="text-right">Critical</th>
                  <th style={{ minWidth: 160 }}>Utilization %</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {filteredConstituencies.map((c, i) => {
                  const util = c.total_est_cost_lacs > 0
                    ? Math.round((c.total_expenditure_lacs / c.total_est_cost_lacs) * 100)
                    : 0;
                  return (
                    <tr key={c.constituency}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{c.constituency}</span>
                        </div>
                      </td>
                      <td className="text-right font-semibold" style={{ color: 'var(--text-1)' }}>{c.total_works}</td>
                      <td className="text-right">{c.br_works}</td>
                      <td className="text-right">{c.om_works}</td>
                      <td className="text-right font-medium" style={{ color: 'var(--text-1)' }}>₹{c.total_est_cost_lacs.toLocaleString()}</td>
                      <td className="text-right">₹{c.total_tender_cost_lacs.toLocaleString()}</td>
                      <td className="text-right" style={{ color: '#3db97d' }}>₹{c.total_expenditure_lacs.toLocaleString()}</td>
                      <td className="text-right" style={{ color: c.critical_count > 5 ? '#d94040' : 'var(--text-3)' }}>
                        {c.critical_count}
                      </td>
                      <td><ProgressBar value={util} showLabel /></td>
                    </tr>
                  );
                })}
                {filteredConstituencies.length > 0 && (
                  <tr style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)' }}>
                    <td className="font-bold" style={{ color: 'var(--text-1)' }}>Total (All Constituencies)</td>
                    <td className="text-right font-bold" style={{ color: 'var(--text-1)' }}>{totals.works}</td>
                    <td className="text-right font-bold" style={{ color: 'var(--text-1)' }}>
                      {constList.reduce((a, c) => a + c.br_works, 0)}
                    </td>
                    <td className="text-right font-bold" style={{ color: 'var(--text-1)' }}>
                      {constList.reduce((a, c) => a + c.om_works, 0)}
                    </td>
                    <td className="text-right font-bold" style={{ color: '#4f6ef7' }}>₹{totals.sanctioned.toLocaleString()}</td>
                    <td className="text-right font-bold" style={{ color: 'var(--text-1)' }}>₹{totals.tender.toLocaleString()}</td>
                    <td className="text-right font-bold" style={{ color: '#3db97d' }}>₹{totals.expenditure.toLocaleString()}</td>
                    <td className="text-right font-bold" style={{ color: '#d94040' }}>{totals.critical}</td>
                    <td>
                      <ProgressBar value={totals.sanctioned > 0 ? Math.round((totals.expenditure / totals.sanctioned) * 100) : 0} showLabel />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Ward</th>
                  <th>Constituency</th>
                  <th className="text-right">Total Works</th>
                  <th className="text-right">B&amp;R</th>
                  <th className="text-right">O&amp;M</th>
                  <th className="text-right">Sanctioned (₹ Lacs)</th>
                  <th className="text-right">Tender Value (₹ Lacs)</th>
                  <th className="text-right">Expenditure (₹ Lacs)</th>
                  <th className="text-right">Critical</th>
                  <th style={{ minWidth: 160 }}>Utilisation %</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {filteredWards.map(w => (
                  <tr key={`${w.constituency}-${w.ward}`}>
                    <td>
                      <span className="font-semibold text-blue-400">Ward {w.ward}</span>
                    </td>
                    <td><span style={{ color: 'var(--text-2)' }}>{w.constituency}</span></td>
                    <td className="text-right font-semibold" style={{ color: 'var(--text-1)' }}>{w.total_works}</td>
                    <td className="text-right">{w.br_works}</td>
                    <td className="text-right">{w.om_works}</td>
                    <td className="text-right font-medium" style={{ color: 'var(--text-1)' }}>₹{w.sanctioned_cost_lacs.toLocaleString()}</td>
                    <td className="text-right">₹{w.tender_value_lacs.toLocaleString()}</td>
                    <td className="text-right" style={{ color: '#3db97d' }}>₹{w.expenditure_lacs.toLocaleString()}</td>
                    <td className="text-right" style={{ color: w.critical_works_count > 0 ? '#d94040' : 'var(--text-3)' }}>
                      {w.critical_works_count}
                    </td>
                    <td><ProgressBar value={w.utilization_pct} showLabel /></td>
                  </tr>
                ))}
                {filteredWards.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                      No ward records found matching your search
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
