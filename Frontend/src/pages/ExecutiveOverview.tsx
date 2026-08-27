import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import StageBadge from '../components/StageBadge';
import RiskBadge from '../components/RiskBadge';
import ProgressBar from '../components/ProgressBar';
import { kpiSummary, works, stageDistribution, zoneProgress, monthlySpend } from '../data/mockData';

const TOOLTIP_STYLE = {
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 8, fontSize: 11, color: '#d0d0d0',
};

export default function ExecutiveOverview() {
  const [branch, setBranch]         = useState('All');
  const [zone,   setZone]           = useState('All');
  const [search, setSearch]         = useState('');

  const critical = works.filter(w => w.riskScore >= 75);
  const filtered = critical.filter(w =>
    (branch === 'All' || w.branch === branch) &&
    (zone   === 'All' || w.zone   === zone)   &&
    (search === '' || w.name.toLowerCase().includes(search.toLowerCase()) || w.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Sanctioned Works"     value={kpiSummary.totalWorks.toLocaleString()}
                  sub={`B&R: ${kpiSummary.brWorks} • O&M: ${kpiSummary.omWorks}`}
                  trend="up" trendLabel="+6.8% vs Jul" accent="#4f6ef7" />
        <StatCard label="Sanctioned Budget Outlay"   value={`₹${kpiSummary.sanctionedBudget} Cr`}
                  sub="Total Vetted Estimate Cost"
                  trend="up" trendLabel="+3.2% vs Jul" accent="#3d9bd4" />
        <StatCard label="Allotted Contract Value"    value={`₹${kpiSummary.contractValue} Cr`}
                  sub={`${((kpiSummary.contractValue/kpiSummary.sanctionedBudget)*100).toFixed(1)}% of Estimated Cost`}
                  trend="up" trendLabel="+4.1% vs Jul" accent="#4f6ef7" />
        <StatCard label="Verified Disbursed Payment" value={`₹${kpiSummary.disbursed} Cr`}
                  sub={`${((kpiSummary.disbursed/kpiSummary.contractValue)*100).toFixed(1)}% Settlements Disbursed`}
                  trend="up" trendLabel="+8.5% vs Jul" accent="#3db97d" />
        <StatCard label="High Risk Critical Works"   value={String(kpiSummary.criticalWorks)}
                  sub="Overdue / High Value"
                  trend="down" trendLabel="+4 new this month" accent="#d94040" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stage Distribution Donut */}
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Works by Project Stage</h3>
          <p className="text-[11px]" style={{ color: '#505050' }}>Current portfolio distribution — 1,158 works</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stageDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                   dataKey="value" strokeWidth={0}>
                {stageDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#606060' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Progress Grouped Bar */}
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Progress by Zone</h3>
          <p className="text-[11px]" style={{ color: '#505050' }}>Avg physical progress — B&amp;R vs O&amp;M</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneProgress} barGap={2} barSize={10}>
              <XAxis dataKey="zone" tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e1e1e' }} />
              <Bar dataKey="BR"  fill="#4f6ef7" radius={[3,3,0,0]} name="B&R"  />
              <Bar dataKey="OM"  fill="#3d9bd4" radius={[3,3,0,0]} name="O&M" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Spend Area */}
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Monthly Disbursements (₹ Cr)</h3>
          <p className="text-[11px]" style={{ color: '#505050' }}>FY 2023–24 payment trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySpend} barSize={14}>
              <XAxis dataKey="month" tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e1e1e' }} />
              <Bar dataKey="spend" name="₹ Cr" radius={[3,3,0,0]}>
                {monthlySpend.map((_, i) => (
                  <Cell key={i} fill={i === monthlySpend.length - 1 ? '#d4a017' : '#4f6ef7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Commissioner Priority Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid #1f1f1f', background: '#111111' }}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Commissioner's Priority Monitoring List</h3>
              <span className="badge badge-danger">{kpiSummary.criticalWorks} Critical</span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: '#505050' }}>
              Works requiring attention before next review — sorted by risk score
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Filters */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#161616', border: '1px solid #222' }}>
              <Filter size={12} color="#505050" />
              <select className="bg-transparent outline-none text-[11px] cursor-pointer" style={{ color: '#808080' }}
                      value={branch} onChange={e => setBranch(e.target.value)}>
                <option value="All">All Branches</option>
                <option>B&R</option><option>O&M</option><option>Light</option><option>SWM</option>
              </select>
            </div>
            <select className="input-dark text-[11px] py-1.5" value={zone} onChange={e => setZone(e.target.value)}>
              <option value="All">All Zones</option>
              {['Zone A','Zone B','Zone C','Zone D','Zone E'].map(z => <option key={z}>{z}</option>)}
            </select>
            <input className="input-dark text-[11px] py-1.5" style={{ width: 160 }}
                   placeholder="Search ID or work..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn-ghost py-1.5 text-[11px] gap-1.5">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 900 }}>
            <thead className="tbl-head">
              <tr>
                <th>Work ID</th>
                <th style={{ minWidth: 260 }}>Description</th>
                <th>Branch / Zone</th>
                <th>Ward</th>
                <th>Agency</th>
                <th>Stage</th>
                <th style={{ minWidth: 160 }}>Physical Progress</th>
                <th>Risk Score</th>
                <th>Cost (Lacs)</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {filtered.map(w => (
                <tr key={w.id}>
                  <td><span className="font-semibold" style={{ color: '#a0a0a0' }}>{w.id}</span></td>
                  <td style={{ color: '#c0c0c0', maxWidth: 280 }}>
                    <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {w.name}
                    </div>
                  </td>
                  <td>{w.branch} / {w.zone}</td>
                  <td>{w.ward}</td>
                  <td>{w.agency}</td>
                  <td><StageBadge stage={w.stage} /></td>
                  <td><ProgressBar value={w.physicalProgress} showLabel /></td>
                  <td><RiskBadge score={w.riskScore} /></td>
                  <td style={{ color: '#d0d0d0' }}>₹{w.estimateCost.toFixed(1)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8" style={{ color: '#404040' }}>No results found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
