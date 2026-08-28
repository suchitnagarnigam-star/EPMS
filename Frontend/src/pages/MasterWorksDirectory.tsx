import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import StageBadge from '../components/StageBadge';
import RiskBadge from '../components/RiskBadge';
import ProgressBar from '../components/ProgressBar';
import { useApi } from '../data/useApi';
import { fetchWorks } from '../data/api';

const PAGE_SIZE = 25;

export default function MasterWorksDirectory() {
  const [search,   setSearch]   = useState('');
  const [branch,   setBranch]   = useState('All');
  const [zone,     setZone]     = useState('All');
  const [status,   setStatus]   = useState('All');
  const [stage,    setStage]    = useState('All');
  const [page,     setPage]     = useState(1);

  // Debounced search: update debouncedSearch 400ms after search state settles
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer); // clears previous timer on every keystroke
  }, [search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  // Fetch from API with server-side filtering + pagination
  const { data, loading, error } = useApi(
    () => fetchWorks({
      branch: branch === 'All' ? undefined : branch,
      zone: zone === 'All' ? undefined : zone,
      delivery_status: status === 'All' ? undefined : status,
      workflow_stage: stage === 'All' ? undefined : stage,
      search: debouncedSearch || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [branch, zone, status, stage, debouncedSearch, page]
  );

  const total = data?.total ?? 0;
  const results = data?.results ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">

      {/* Page title + filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: '#d0d0d0' }}>Master Works Directory</h2>
          <p className="text-[11px] mt-0.5" style={{ color: '#505050' }}>
            {loading ? 'Loading...' : `${total.toLocaleString()} records found — use filters to drill down`}
          </p>
        </div>
        <button className="btn-ghost py-1.5 text-[11px] self-start sm:self-auto">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="card p-4 text-[12px]" style={{ color: '#d94040', borderColor: '#d94040' }}>
          ⚠ {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px] relative">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#404040' }}>
            Search
          </label>
          <input className="input-dark w-full py-2" placeholder="Work ID, description, agency..."
                 value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        {[
          { label: 'Branch', value: branch, setter: (v: string) => { setBranch(v); setPage(1); },
            opts: ['All', 'B&R', 'O&M'] },
          { label: 'Zone', value: zone, setter: (v: string) => { setZone(v); setPage(1); },
            opts: ['All', 'A', 'B', 'C', 'D'] },
          { label: 'Delivery Status', value: status, setter: (v: string) => { setStatus(v); setPage(1); },
            opts: ['All', 'In Progress', 'Completed', 'Delayed/Held Up', 'Not Started', 'Procurement'] },
          { label: 'Workflow Stage', value: stage, setter: (v: string) => { setStage(v); setPage(1); },
            opts: ['All', 'Awarded', 'Work Order Issued', 'Procurement', 'Approval Pending', 'In Progress', 'Completed', 'Not Started', 'Delayed/Held Up'] },
        ].map(({ label, value, setter, opts }) => (
          <div key={label} className="min-w-[130px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#404040' }}>
              {label}
            </label>
            <select className="input-dark py-2 w-full" value={value}
                    onChange={e => setter(e.target.value)}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16" style={{ color: '#505050' }}>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-[12px]">Loading works from database...</span>
            </div>
          ) : (
            <table className="w-full" style={{ minWidth: 1100 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Work ID</th>
                  <th>Branch</th>
                  <th>Zone</th>
                  <th>Constituency</th>
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
                {results.map(w => (
                  <tr key={w.work_id}>
                    <td><span className="font-semibold" style={{ color: '#a0a0a0' }}>{w.work_id}</span></td>
                    <td>{w.branch}</td>
                    <td>{w.zone || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{w.constituency || '—'}</td>
                    <td>{w.ward || '—'}</td>
                    <td>
                      <span className={`badge ${w.fund_type ? 'badge-accent' : 'badge-neutral'}`}>
                        {w.fund_type || '—'}
                      </span>
                    </td>
                    <td style={{ color: '#c0c0c0', maxWidth: 280 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.work_description || '—'}
                      </div>
                    </td>
                    <td>{w.agency_name || '—'}</td>
                    <td><StageBadge stage={w.delivery_status || 'Not Started'} /></td>
                    <td className="text-right font-medium" style={{ color: '#d0d0d0' }}>₹{(w.est_cost_lacs ?? 0).toFixed(1)}</td>
                    <td><ProgressBar value={w.physical_progress_pct ?? 0} showLabel /></td>
                    <td><RiskBadge score={w.risk_score ?? 0} /></td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8" style={{ color: '#404040' }}>No records match your filters</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 flex items-center justify-between"
             style={{ borderTop: '1px solid #1f1f1f', background: '#0f0f0f' }}>
          <span className="text-[11px]" style={{ color: '#505050' }}>
            {total > 0
              ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()} records`
              : 'No records'}
          </span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost py-1 px-2" disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{ opacity: page === 1 ? 0.3 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show pages around current page
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button key={p}
                        className="w-7 h-7 rounded-md text-[12px] font-medium transition-colors"
                        style={{
                          background: p === page ? '#4f6ef7' : 'transparent',
                          color: p === page ? '#fff' : '#606060',
                        }}
                        onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
            {totalPages > 7 && <span style={{ color: '#404040' }}>…</span>}
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
