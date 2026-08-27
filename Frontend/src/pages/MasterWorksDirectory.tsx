import { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { works } from '../data/mockData';
import StageBadge from '../components/StageBadge';
import RiskBadge from '../components/RiskBadge';
import ProgressBar from '../components/ProgressBar';
import type { WorkStage, FundSource, Branch } from '../data/types';

const PAGE_SIZE = 8;

export default function MasterWorksDirectory() {
  const [search,   setSearch]   = useState('');
  const [branch,   setBranch]   = useState<Branch | 'All'>('All');
  const [zone,     setZone]     = useState('All');
  const [fund,     setFund]     = useState<FundSource | 'All'>('All');
  const [stage,    setStage]    = useState<WorkStage | 'All'>('All');
  const [page,     setPage]     = useState(1);

  const filtered = useMemo(() => works.filter(w =>
    (branch === 'All' || w.branch === branch) &&
    (zone   === 'All' || w.zone   === zone)   &&
    (fund   === 'All' || w.fundSource === fund) &&
    (stage  === 'All' || w.stage === stage)   &&
    (search === '' ||
      w.id.toLowerCase().includes(search.toLowerCase()) ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.agency.toLowerCase().includes(search.toLowerCase()))
  ), [search, branch, zone, fund, stage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">

      {/* Page title + filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: '#d0d0d0' }}>Master Works Directory</h2>
          <p className="text-[11px] mt-0.5" style={{ color: '#505050' }}>
            Full register of {works.length} records — use filters to drill down
          </p>
        </div>
        <button className="btn-ghost py-1.5 text-[11px] self-start sm:self-auto">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px] relative">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#404040' }}>
            Search
          </label>
          <input className="input-dark w-full py-2" placeholder="Work ID, description, agency..."
                 value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {[
          { label: 'Branch', value: branch, setter: setBranch,
            opts: ['All','B&R','O&M','Light','Horticulture','SWM'] },
          { label: 'Zone',   value: zone,   setter: setZone,
            opts: ['All','Zone A','Zone B','Zone C','Zone D','Zone E'] },
          { label: 'Fund',   value: fund,   setter: setFund,
            opts: ['All','MDF','SASCI','PIDB','SFC','Municipal'] },
          { label: 'Stage',  value: stage,  setter: setStage,
            opts: ['All','Completed','In Progress','Tender Issued','Delayed','Stalled','Not Started'] },
        ].map(({ label, value, setter, opts }) => (
          <div key={label} className="min-w-[130px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#404040' }}>
              {label}
            </label>
            <select className="input-dark py-2 w-full" value={value}
                    onChange={e => { setter(e.target.value as never); setPage(1); }}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1100 }}>
            <thead className="tbl-head">
              <tr>
                <th>Work ID</th>
                <th>Branch</th>
                <th>Zone</th>
                <th>AC</th>
                <th>Ward</th>
                <th>Fund</th>
                <th style={{ minWidth: 260 }}>Name &amp; Description</th>
                <th>Executing Agency</th>
                <th>Stage</th>
                <th className="text-right">Cost (Lacs)</th>
                <th style={{ minWidth: 130 }}>Progress</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {paged.map(w => (
                <tr key={w.id}>
                  <td><span className="font-semibold" style={{ color: '#a0a0a0' }}>{w.id}</span></td>
                  <td>{w.branch}</td>
                  <td>{w.zone}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{w.ac}</td>
                  <td>{w.ward}</td>
                  <td>
                    <span className={`badge ${w.fundSource === 'MDF' || w.fundSource === 'SASCI' ? 'badge-accent' : 'badge-neutral'}`}>
                      {w.fundSource}
                    </span>
                  </td>
                  <td style={{ color: '#c0c0c0', maxWidth: 280 }}>
                    <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {w.name}
                    </div>
                  </td>
                  <td>{w.agency}</td>
                  <td><StageBadge stage={w.stage} /></td>
                  <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>₹{w.estimateCost.toFixed(1)}</td>
                  <td><ProgressBar value={w.physicalProgress} showLabel /></td>
                  <td><RiskBadge score={w.riskScore} /></td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8" style={{ color: '#404040' }}>No records match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 flex items-center justify-between"
             style={{ borderTop: '1px solid #1f1f1f', background: '#0f0f0f' }}>
          <span className="text-[11px]" style={{ color: '#505050' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
          </span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost py-1 px-2" disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{ opacity: page === 1 ? 0.3 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p}
                      className="w-7 h-7 rounded-md text-[12px] font-medium transition-colors"
                      style={{
                        background: p === page ? '#4f6ef7' : 'transparent',
                        color: p === page ? '#fff' : '#606060',
                      }}
                      onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            {totalPages > 5 && <span style={{ color: '#404040' }}>…</span>}
            <button className="btn-ghost py-1 px-2" disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    style={{ opacity: page === totalPages ? 0.3 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
