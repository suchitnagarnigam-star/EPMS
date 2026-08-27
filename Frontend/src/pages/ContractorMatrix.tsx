import { useState } from 'react';
import { Download, TrendingUp, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  type BarShapeProps,
} from 'recharts';
import { contractors } from '../data/mockData';
import ProgressBar from '../components/ProgressBar';
import type { AgencyHealth } from '../data/types';

// Factory that returns a brightened active-bar render function accepted by Recharts
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

const TOOLTIP_STYLE = {
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 8, fontSize: 11, color: '#d0d0d0',
};

function HealthBadge({ health }: { health: AgencyHealth }) {
  const map: Record<AgencyHealth, string> = {
    'Healthy':    'badge-success',
    'Moderate':   'badge-warn',
    'High Risk':  'badge-danger',
    'Unassigned': 'badge-neutral',
  };
  return <span className={`badge ${map[health]}`}>{health}</span>;
}

const healthCount = (h: AgencyHealth) => contractors.filter(c => c.health === h).length;

const SUMMARY_CARDS = [
  { label: 'Healthy / Satisfactory',    health: 'Healthy'    as AgencyHealth, icon: TrendingUp,    color: '#3db97d' },
  { label: 'Moderate / Slow Progress',  health: 'Moderate'   as AgencyHealth, icon: Clock,         color: '#d4a017' },
  { label: 'High Risk / Delayed',       health: 'High Risk'  as AgencyHealth, icon: AlertTriangle,  color: '#d94040' },
  { label: 'Unassigned / Pending',      health: 'Unassigned' as AgencyHealth, icon: TrendingDown,  color: '#606060' },
];

export default function ContractorMatrix() {
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All');
  const [health, setHealth] = useState('All');

  const filtered = contractors.filter(c =>
    (branch === 'All' || c.branch === branch) &&
    (health === 'All' || c.health === health) &&
    (search === '' || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const chartData = contractors.map(c => ({
    name: c.name.split(' ').slice(0, 2).join(' '),
    progress: c.avgProgress,
    color: c.health === 'Healthy' ? '#3db97d' : c.health === 'High Risk' ? '#d94040' : '#d4a017',
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map(({ label, health: h, icon: Icon, color }) => (
          <div key={h} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: `${color}18` }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: '#505050' }}>{label}</p>
              <p className="text-[24px] font-bold leading-none mt-1" style={{ color }}>{healthCount(h)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Avg Progress Chart */}
      <div className="card p-5">
        <h3 className="text-[13px] font-semibold mb-1" style={{ color: '#d0d0d0' }}>Average Progress by Agency</h3>
        <p className="text-[11px] mb-4" style={{ color: '#505050' }}>Physical completion across active works portfolio</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={20}>
            <XAxis dataKey="name" tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="progress" name="Avg Progress %" radius={[3,3,0,0]} activeBar={makeBrightBar()}>
              {chartData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Master Directory Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid #1f1f1f', background: '#111111' }}>
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Contractor Master Directory</h3>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <input className="input-dark py-1.5 text-[11px]" style={{ width: 180 }}
                   placeholder="Search agency..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-dark py-1.5 text-[11px]" value={branch} onChange={e => setBranch(e.target.value)}>
              <option value="All">All Branches</option>
              {['B&R','O&M','Light','Horticulture','SWM'].map(b => <option key={b}>{b}</option>)}
            </select>
            <select className="input-dark py-1.5 text-[11px]" value={health} onChange={e => setHealth(e.target.value)}>
              <option value="All">All Health</option>
              {['Healthy','Moderate','High Risk','Unassigned'].map(h => <option key={h}>{h}</option>)}
            </select>
            <button className="btn-ghost py-1.5 text-[11px]"><Download size={12} /> Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 900 }}>
            <thead className="tbl-head">
              <tr>
                <th>Executing Agency</th>
                <th>Health Rating</th>
                <th className="text-right">Total Works</th>
                <th className="text-right">In Progress</th>
                <th className="text-right">Critical Flagged</th>
                <th className="text-right">Completed</th>
                <th className="text-right">Tender Value (Lacs)</th>
                <th className="text-right">Paid (Lacs)</th>
                <th style={{ minWidth: 160 }}>Avg Progress</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <p className="font-semibold" style={{ color: '#c0c0c0' }}>{c.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#505050' }}>{c.class} • {c.branch}</p>
                  </td>
                  <td><HealthBadge health={c.health} /></td>
                  <td className="text-right font-semibold" style={{ color: '#d0d0d0' }}>{c.totalWorks}</td>
                  <td className="text-right" style={{ color: '#3d9bd4' }}>{c.inProgress}</td>
                  <td className="text-right" style={{ color: c.criticalFlagged > 0 ? '#d94040' : '#505050' }}>
                    {c.criticalFlagged}
                  </td>
                  <td className="text-right" style={{ color: '#3db97d' }}>{c.completed}</td>
                  <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>₹{c.tenderValue.toLocaleString()}</td>
                  <td className="text-right" style={{ color: '#808080' }}>₹{c.paidAmount.toLocaleString()}</td>
                  <td><ProgressBar value={c.avgProgress} showLabel /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8" style={{ color: '#404040' }}>No results found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 flex items-center justify-between"
             style={{ borderTop: '1px solid #1f1f1f', background: '#0f0f0f' }}>
          <span className="text-[11px]" style={{ color: '#505050' }}>
            Showing {filtered.length} of {contractors.length} agencies
          </span>
        </div>
      </div>

    </div>
  );
}
