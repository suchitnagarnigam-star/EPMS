import { useState } from 'react';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { constituencies } from '../data/mockData';
import ProgressBar from '../components/ProgressBar';

const TOOLTIP_STYLE = {
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 8, fontSize: 11, color: '#d0d0d0',
};

const COLORS = ['#4f6ef7','#3d9bd4','#3db97d','#d4a017','#d94040','#8b5cf6'];

export default function ConstituencyFunds() {
  const [search, setSearch] = useState('');

  const totals = {
    works:       constituencies.reduce((a, c) => a + c.totalWorks, 0),
    sanctioned:  constituencies.reduce((a, c) => a + c.sanctionedCost, 0),
    tender:      constituencies.reduce((a, c) => a + c.tenderValue, 0),
    expenditure: constituencies.reduce((a, c) => a + c.expenditure, 0),
    critical:    constituencies.reduce((a, c) => a + c.criticalCount, 0),
  };

  const filtered = constituencies.filter(c =>
    search === '' || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const pieData = constituencies.map((c, i) => ({
    name: c.name.replace('Ludhiana ', ''),
    value: c.sanctionedCost,
    fill: COLORS[i],
  }));

  const utilData = constituencies.map((c, i) => ({
    name: c.name.replace('Ludhiana ', ''),
    sanctioned: Math.round(c.sanctionedCost / 100),
    spent:      Math.round(c.expenditure / 100),
    color:      COLORS[i],
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Works',         value: totals.works.toLocaleString(),                  accent: '#4f6ef7'  },
          { label: 'Sanctioned Cost',     value: `₹${(totals.sanctioned/100).toFixed(0)} Cr`,    accent: '#3d9bd4'  },
          { label: 'Allotted Tender',     value: `₹${(totals.tender/100).toFixed(0)} Cr`,        accent: '#4f6ef7'  },
          { label: 'Expenditure Paid',    value: `₹${(totals.expenditure/100).toFixed(0)} Cr`,   accent: '#3db97d'  },
          { label: 'Critical Works',      value: String(totals.critical),                         accent: '#d94040'  },
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
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`₹${Number(v).toLocaleString()} L`, '']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#606060' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-1" style={{ color: '#d0d0d0' }}>Sanctioned vs Expenditure (₹ Cr)</h3>
          <p className="text-[11px] mb-3" style={{ color: '#505050' }}>Budget utilization comparison per constituency</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={utilData} barGap={3} barSize={14}>
              <XAxis dataKey="name" tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e1e1e' }}
                       formatter={(v) => [`₹${Number(v)} Cr`, '']} />
              <Bar dataKey="sanctioned" name="Sanctioned (₹ Cr)" fill="#4f6ef7" radius={[3,3,0,0]} />
              <Bar dataKey="spent"      name="Expenditure (₹ Cr)" fill="#3db97d" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid #1f1f1f', background: '#111111' }}>
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Constituency-wise Fund Statement</h3>
          <div className="flex items-center gap-2">
            <input className="input-dark py-1.5 text-[11px]" style={{ width: 200 }}
                   placeholder="Search constituency..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn-ghost py-1.5 text-[11px]"><Download size={12} /> Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 820 }}>
            <thead className="tbl-head">
              <tr>
                <th>Assembly Constituency</th>
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
                const util = Math.round((c.expenditure / c.sanctionedCost) * 100);
                return (
                  <tr key={c.name}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                        <span className="font-semibold" style={{ color: '#c0c0c0' }}>{c.name}</span>
                      </div>
                    </td>
                    <td className="text-right font-semibold" style={{ color: '#d0d0d0' }}>{c.totalWorks}</td>
                    <td className="text-right">{c.brWorks}</td>
                    <td className="text-right">{c.omWorks}</td>
                    <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>₹{c.sanctionedCost.toLocaleString()}</td>
                    <td className="text-right">₹{c.tenderValue.toLocaleString()}</td>
                    <td className="text-right" style={{ color: '#3db97d' }}>₹{c.expenditure.toLocaleString()}</td>
                    <td className="text-right" style={{ color: c.criticalCount > 5 ? '#d94040' : '#808080' }}>
                      {c.criticalCount}
                    </td>
                    <td><ProgressBar value={util} showLabel /></td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr style={{ background: '#131313', borderTop: '1px solid #252525' }}>
                <td className="font-bold" style={{ color: '#d0d0d0' }}>Total (All Constituencies)</td>
                <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>{totals.works}</td>
                <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>
                  {constituencies.reduce((a, c) => a + c.brWorks, 0)}
                </td>
                <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>
                  {constituencies.reduce((a, c) => a + c.omWorks, 0)}
                </td>
                <td className="text-right font-bold" style={{ color: '#4f6ef7' }}>₹{totals.sanctioned.toLocaleString()}</td>
                <td className="text-right font-bold" style={{ color: '#d0d0d0' }}>₹{totals.tender.toLocaleString()}</td>
                <td className="text-right font-bold" style={{ color: '#3db97d' }}>₹{totals.expenditure.toLocaleString()}</td>
                <td className="text-right font-bold" style={{ color: '#d94040' }}>{totals.critical}</td>
                <td>
                  <ProgressBar value={Math.round((totals.expenditure / totals.sanctioned) * 100)} showLabel />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
