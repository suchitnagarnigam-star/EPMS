import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, Sector,
  type PieSectorDataItem, type BarShapeProps,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
import { useApi } from '../data/useApi';
import { fetchConstituencies } from '../data/api';
import type { ConstituencyRecord } from '../data/api';

const TOOLTIP_STYLE = {
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 8, fontSize: 11, color: '#d0d0d0',
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
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All');

  const apiBranch = branch === 'All' ? undefined : branch;

  const { data: constituencies, loading, error } = useApi<ConstituencyRecord[]>(
    () => fetchConstituencies(apiBranch), [apiBranch]
  );

  const list = constituencies || [];

  const totals = {
    works:       list.reduce((a, c) => a + c.total_works, 0),
    sanctioned:  list.reduce((a, c) => a + c.total_est_cost_lacs, 0),
    tender:      list.reduce((a, c) => a + c.total_tender_cost_lacs, 0),
    expenditure: list.reduce((a, c) => a + c.total_expenditure_lacs, 0),
    critical:    list.reduce((a, c) => a + c.critical_count, 0),
  };

  const filtered = list.filter(c =>
    search === '' || c.constituency.toLowerCase().includes(search.toLowerCase())
  );

  const pieData = list.map((c, i) => ({
    name: c.constituency,
    value: c.total_est_cost_lacs,
    fill: COLORS[i % COLORS.length],
  }));

  const utilData = list.map((c, i) => ({
    name: c.constituency.length > 12 ? c.constituency.substring(0, 12) + '…' : c.constituency,
    sanctioned: Math.round(c.total_est_cost_lacs / 100),
    spent:      Math.round(c.total_expenditure_lacs / 100),
    color:      COLORS[i % COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {error && (
        <div className="card p-4 text-[12px]" style={{ color: '#d94040', borderColor: '#d94040' }}>
          ⚠ {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Works',         value: loading ? '—' : totals.works.toLocaleString(),                  accent: '#4f6ef7'  },
          { label: 'Sanctioned Cost',     value: loading ? '—' : `₹${(totals.sanctioned/100).toFixed(0)} Cr`,    accent: '#3d9bd4'  },
          { label: 'Allotted Tender',     value: loading ? '—' : `₹${(totals.tender/100).toFixed(0)} Cr`,        accent: '#4f6ef7'  },
          { label: 'Expenditure Paid',    value: loading ? '—' : `₹${(totals.expenditure/100).toFixed(0)} Cr`,   accent: '#3db97d'  },
          { label: 'Critical Works',      value: loading ? '—' : String(totals.critical),                         accent: '#d94040'  },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#505050' }}>{k.label}</p>
            <p className="text-[22px] font-bold mt-1.5 leading-none" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-1" style={{ color: '#d0d0d0' }}>Budget Allocation by Constituency</h3>
          <p className="text-[11px] mb-3" style={{ color: '#505050' }}>Sanctioned estimate cost distribution (₹ Lacs)</p>
          {loading ? (
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
          <h3 className="text-[13px] font-semibold mb-1" style={{ color: '#d0d0d0' }}>Sanctioned vs Expenditure (₹ Cr)</h3>
          <p className="text-[11px] mb-3" style={{ color: '#505050' }}>Budget utilization comparison per constituency</p>
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={utilData} barGap={3} barSize={14}>
                <XAxis dataKey="name" tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }}
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid #1f1f1f', background: '#111111' }}>
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Constituency-wise Fund Statement</h3>
          <div className="flex items-center gap-2">
            <select
              className="input-dark py-1.5 text-[11px]"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="B&R">B&R Branch</option>
              <option value="O&M">O&M Branch</option>
            </select>
            <input className="input-dark py-1.5 text-[11px]" style={{ width: 200 }}
                   placeholder="Search constituency..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn-ghost py-1.5 text-[11px]"><Download size={12} /> Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <LoadingSkeleton height={300} label="Loading constituency data..." />
          ) : (
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
                {filtered.map((c, i) => {
                  const util = c.total_est_cost_lacs > 0
                    ? Math.round((c.total_expenditure_lacs / c.total_est_cost_lacs) * 100)
                    : 0;
                  return (
                    <tr key={c.constituency}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="font-semibold" style={{ color: '#c0c0c0' }}>{c.constituency}</span>
                        </div>
                      </td>
                      <td className="text-right font-semibold" style={{ color: '#d0d0d0' }}>{c.total_works}</td>
                      <td className="text-right">{c.br_works}</td>
                      <td className="text-right">{c.om_works}</td>
                      <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>₹{c.total_est_cost_lacs.toLocaleString()}</td>
                      <td className="text-right">₹{c.total_tender_cost_lacs.toLocaleString()}</td>
                      <td className="text-right" style={{ color: '#3db97d' }}>₹{c.total_expenditure_lacs.toLocaleString()}</td>
                      <td className="text-right" style={{ color: c.critical_count > 5 ? '#d94040' : '#808080' }}>
                        {c.critical_count}
                      </td>
                      <td><ProgressBar value={util} showLabel /></td>
                    </tr>
                  );
                })}
                {/* Total row */}
                {filtered.length > 0 && (
                  <tr style={{ background: '#131313', borderTop: '1px solid #252525' }}>
                    <td className="font-bold" style={{ color: '#d0d0d0' }}>Total (All Constituencies)</td>
                    <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>{totals.works}</td>
                    <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>
                      {list.reduce((a, c) => a + c.br_works, 0)}
                    </td>
                    <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>
                      {list.reduce((a, c) => a + c.om_works, 0)}
                    </td>
                    <td className="text-right font-bold" style={{ color: '#4f6ef7' }}>₹{totals.sanctioned.toLocaleString()}</td>
                    <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>₹{totals.tender.toLocaleString()}</td>
                    <td className="text-right font-bold" style={{ color: '#3db97d' }}>₹{totals.expenditure.toLocaleString()}</td>
                    <td className="text-right font-bold" style={{ color: '#d94040' }}>{totals.critical}</td>
                    <td>
                      <ProgressBar value={totals.sanctioned > 0 ? Math.round((totals.expenditure / totals.sanctioned) * 100) : 0} showLabel />
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
