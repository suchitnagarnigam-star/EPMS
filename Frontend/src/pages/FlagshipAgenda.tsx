import { useState } from 'react';
import { Download, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  type BarShapeProps,
} from 'recharts';
import { flagshipMDF, flagshipSASCI } from '../data/mockData';
import ProgressBar from '../components/ProgressBar';
import type { FlagshipWork } from '../data/types';

// Factory that returns a brightened active-bar render function accepted by Recharts
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
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 8, fontSize: 11, color: '#d0d0d0',
};

function stageBadgeFor(w: FlagshipWork) {
  if (w.physicalProgress === 100) return <span className="badge badge-success">Completed</span>;
  if (w.physicalProgress === 0)   return <span className="badge badge-neutral">Not Started</span>;
  if (w.physicalProgress < 30)    return <span className="badge badge-danger">Early Stage</span>;
  if (w.physicalProgress < 60)    return <span className="badge badge-warn">In Progress</span>;
  return <span className="badge badge-info">Advanced</span>;
}

function WorkTable({ works, title, color }: { works: FlagshipWork[]; title: string; color: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5"
           style={{ borderBottom: '1px solid #1f1f1f', background: '#111111' }}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>{title}</h3>
          <span className="badge badge-neutral">{works.length} Works</span>
        </div>
        <button className="btn-ghost py-1 text-[11px]"><Download size={12} /> Export</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 1060 }}>
          <thead className="tbl-head">
            <tr>
              <th>Work ID</th>
              <th style={{ minWidth: 280 }}>Name of Work</th>
              <th>Road Type</th>
              <th className="text-right">Total Km</th>
              <th className="text-right">Done Km</th>
              <th className="text-right">Estimate (Lacs)</th>
              <th className="text-right">Tender (Lacs)</th>
              <th className="text-right">Bills Paid</th>
              <th style={{ minWidth: 140 }}>Physical %</th>
              <th style={{ minWidth: 140 }}>Financial %</th>
              <th>Status</th>
              <th style={{ minWidth: 180 }}>Supervisor Notes</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {works.map(w => (
              <tr key={w.id}>
                <td><span className="font-semibold" style={{ color: '#a0a0a0' }}>{w.id}</span></td>
                <td style={{ color: '#c0c0c0', maxWidth: 300 }}>
                  <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {w.name}
                  </div>
                </td>
                <td><span className="badge badge-neutral">{w.roadType}</span></td>
                <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>{w.totalKm}</td>
                <td className="text-right" style={{ color: '#3db97d' }}>{w.completedKm}</td>
                <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>₹{w.estimateCost.toLocaleString()}</td>
                <td className="text-right">₹{w.tenderCost.toLocaleString()}</td>
                <td className="text-right" style={{ color: '#3db97d' }}>₹{w.billsPaid.toLocaleString()}</td>
                <td><ProgressBar value={w.physicalProgress} showLabel /></td>
                <td><ProgressBar value={w.financialProgress} color="#3d9bd4" showLabel /></td>
                <td>{stageBadgeFor(w)}</td>
                <td className="text-[11px]" style={{ color: '#707070', maxWidth: 200 }}>
                  <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {w.supervisorNotes}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FlagshipAgenda() {
  const [activeTab, setActiveTab] = useState<'MDF' | 'SASCI'>('MDF');

  const allWorks = [...flagshipMDF, ...flagshipSASCI];

  const kpis = {
    total:      allWorks.length,
    mdf:        flagshipMDF.length,
    sasci:      flagshipSASCI.length,
    sanctioned: allWorks.reduce((a, w) => a + w.estimateCost, 0),
    tender:     allWorks.reduce((a, w) => a + w.tenderCost,   0),
    totalKm:    allWorks.reduce((a, w) => a + w.totalKm,      0),
    doneKm:     allWorks.reduce((a, w) => a + w.completedKm,  0),
    paid:       allWorks.reduce((a, w) => a + w.billsPaid,     0),
  };

  const chartData = allWorks.map(w => ({
    name:     w.id,
    physical: w.physicalProgress,
    financial:w.financialProgress,
    fill:     w.fundSource === 'MDF' ? '#4f6ef7' : '#3d9bd4',
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">

      {/* Reference data banner */}
      <div className="card p-3.5 flex items-center gap-3" style={{ borderColor: '#3d9bd4', background: '#0d1b2a' }}>
        <Info size={16} color="#3d9bd4" />
        <span className="text-[12px]" style={{ color: '#8bb8d4' }}>
          Flagship data from last manual import — live sync pipeline coming in Phase 5
        </span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Flagship Works (MDF + SASCI)',  value: `${kpis.total} Major Works`,      sub: `${kpis.mdf} MDF • ${kpis.sasci} SASCI Flagship`,                          accent: '#4f6ef7' },
          { label: 'Sanctioned Est. Cost',          value: `₹${(kpis.sanctioned/100).toFixed(2)} Cr`, sub: `MDF: ₹${(flagshipMDF.reduce((a,w)=>a+w.estimateCost,0)/100).toFixed(2)} Cr`,  accent: '#3d9bd4' },
          { label: 'Allotted Tender Value',         value: `₹${(kpis.tender/100).toFixed(2)} Cr`,    sub: 'Vetted Contract Outlay',                                              accent: '#4f6ef7' },
          { label: 'Road Infrastructure Length',    value: `${kpis.totalKm.toFixed(2)} Km`,  sub: `${kpis.doneKm.toFixed(2)} Km Completed (${((kpis.doneKm/kpis.totalKm)*100).toFixed(1)}%)`, accent: '#3db97d' },
          { label: 'Disbursed & Prepared Bills',    value: `₹${(kpis.paid/100).toFixed(2)} Cr`,      sub: `MDF: ₹${(flagshipMDF.reduce((a,w)=>a+w.billsPaid,0)/100).toFixed(2)} Cr`,          accent: '#d4a017' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#505050' }}>{k.label}</p>
            <p className="text-[20px] font-bold mt-1.5 leading-none" style={{ color: k.accent }}>{k.value}</p>
            <p className="text-[10px] mt-1" style={{ color: '#404040' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress Chart */}
      <div className="card p-5">
        <h3 className="text-[13px] font-semibold mb-1" style={{ color: '#d0d0d0' }}>Physical vs Financial Progress — All Flagship Works</h3>
        <p className="text-[11px] mb-4" style={{ color: '#505050' }}>Blue = Physical %, Teal = Financial %</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={1} barSize={9}>
            <XAxis dataKey="name" tick={{ fill: '#404040', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#505050', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="physical" name="Physical %" radius={[2,2,0,0]} activeBar={makeBrightBar()}>
              {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
            </Bar>
            <Bar dataKey="financial" name="Financial %" fill="#3d9bd4" radius={[2,2,0,0]}
                 activeBar={makeBrightBar('#60b8e8')} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['MDF','SASCI'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
                  className="px-5 py-2 rounded-lg text-[12px] font-semibold transition-colors"
                  style={{
                    background: activeTab === t ? '#4f6ef7' : '#1a1a1a',
                    color:      activeTab === t ? '#fff'    : '#606060',
                    border:     `1px solid ${activeTab === t ? '#4f6ef7' : '#2a2a2a'}`,
                  }}>
            {t} Works ({t === 'MDF' ? flagshipMDF.length : flagshipSASCI.length})
          </button>
        ))}
      </div>

      {activeTab === 'MDF'
        ? <WorkTable works={flagshipMDF}   title="MDF Flagship Works"   color="#4f6ef7" />
        : <WorkTable works={flagshipSASCI} title="SASCI Flagship Works" color="#3d9bd4" />
      }

    </div>
  );
}
