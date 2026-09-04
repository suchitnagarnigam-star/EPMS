import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Loader2, ArrowUpDown } from 'lucide-react';
import StageBadge from '../components/StageBadge';
import RiskBadge from '../components/RiskBadge';
import ProgressBar from '../components/ProgressBar';
import MethodologyTooltip from '../components/MethodologyTooltip';
import WorkDetailModal from '../components/WorkDetailModal';
import { useApi } from '../data/useApi';
import { fetchWorks, type WorkRecord } from '../data/api';

const PAGE_SIZE = 25;

export default function MasterWorksDirectory() {
  const [selectedWork, setSelectedWork] = useState<WorkRecord | null>(null);
  const [search,    setSearch]    = useState('');
  const [branch,    setBranch]    = useState('All');
  const [zone,      setZone]      = useState('All');
  const [status,    setStatus]    = useState('All');
  const [stage,     setStage]     = useState('All');
  const [sortBy,    setSortBy]    = useState('risk_score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page,      setPage]      = useState(1);

  // Debounced search: update debouncedSearch 400ms after search state settles
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSortToggle(col: string) {
    if (sortBy === col) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  }

  // Fetch from API with server-side filtering + sorting + pagination
  const { data, loading, error } = useApi(
    () => fetchWorks({
      branch: branch === 'All' ? undefined : branch,
      zone: zone === 'All' ? undefined : zone,
      delivery_status: status === 'All' ? undefined : status,
      workflow_stage: stage === 'All' ? undefined : stage,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: PAGE_SIZE,
    }),
    [branch, zone, status, stage, debouncedSearch, sortBy, sortOrder, page]
  );

  const total = data?.total ?? 0;
  const results = data?.results ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function exportCSV() {
    if (!results.length) return;
    const headers = ['Work ID', 'Branch', 'Zone', 'Constituency', 'Ward', 'Fund', 'Description', 'Agency', 'Status', 'Cost (Lacs)', 'Progress %', 'Risk Score'];
    const rows = results.map(w => [
      w.work_id,
      w.branch,
      w.zone || '',
      w.constituency || '',
      w.ward || '',
      w.fund_type || '',
      `"${(w.work_description || '').replace(/"/g, '""')}"`,
      `"${(w.agency_name || '').replace(/"/g, '""')}"`,
      w.delivery_status || '',
      w.est_cost_lacs ?? 0,
      w.physical_progress_pct ?? 0,
      w.risk_score ?? 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_Works_Directory_Page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">

      {/* Page title + filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: 'var(--text-1)' }}>Master Works Directory</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {loading ? 'Loading...' : `${total.toLocaleString()} records found — sorted by ${sortBy.replace('_', ' ')} (${sortOrder.toUpperCase()})`}
          </p>
        </div>
        <button onClick={exportCSV} className="btn-ghost py-1.5 text-[11px] self-start sm:self-auto flex items-center gap-1.5">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="card p-4 text-[12px]" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px] relative">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
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
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
              {label}
            </label>
            <select className="input-dark py-2 w-full" value={value}
                    onChange={e => setter(e.target.value)}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div className="min-w-[140px]">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
            Sort By
          </label>
          <select
            className="input-dark py-2 w-full"
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
          >
            <option value="risk_score">🔴 Risk Score</option>
            <option value="est_cost_lacs">💰 Cost (Lacs)</option>
            <option value="physical_progress_pct">📈 Progress %</option>
            <option value="work_id">🆔 Work ID</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="text-[12px]">Loading works from database...</span>
            </div>
          ) : (
            <table className="w-full" style={{ minWidth: 1100 }}>
              <thead className="tbl-head">
                <tr>
                  <th className="cursor-pointer select-none" onClick={() => handleSortToggle('work_id')}>
                    <span className="inline-flex items-center gap-1">
                      Work ID <ArrowUpDown size={11} className="opacity-60" />
                    </span>
                  </th>
                  <th>Branch</th>
                  <th>Zone</th>
                  <th>Constituency</th>
                  <th>Ward</th>
                  <th>Fund</th>
                  <th style={{ minWidth: 260 }}>Name &amp; Description</th>
                  <th>Executing Agency</th>
                  <th>Stage</th>
                  <th className="text-right cursor-pointer select-none" onClick={() => handleSortToggle('est_cost_lacs')}>
                    <span className="inline-flex items-center justify-end gap-1">
                      Cost (Lacs) <ArrowUpDown size={11} className="opacity-60" />
                    </span>
                  </th>
                  <th style={{ minWidth: 130 }} className="cursor-pointer select-none">
                    <span className="inline-flex items-center gap-1" onClick={() => handleSortToggle('physical_progress_pct')}>
                      Progress <ArrowUpDown size={11} className="opacity-60" />
                    </span>
                    <MethodologyTooltip metric="physical_progress_source" className="ml-1" />
                  </th>
                  <th className="cursor-pointer select-none">
                    <span className="inline-flex items-center gap-1" onClick={() => handleSortToggle('risk_score')}>
                      Risk <ArrowUpDown size={11} className="opacity-60" />
                    </span>
                    <MethodologyTooltip metric="risk_score_formula" className="ml-1" />
                  </th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {results.map(w => (
                  <tr
                    key={w.work_id}
                    onClick={() => setSelectedWork(w)}
                    className="cursor-pointer transition-colors hover:bg-slate-500/10"
                  >
                    <td><span className="font-semibold" style={{ color: 'var(--text-1)' }}>{w.work_id}</span></td>
                    <td>{w.branch}</td>
                    <td>{w.zone || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{w.constituency || '—'}</td>
                    <td>{w.ward || '—'}</td>
                    <td>
                      <span className={`badge ${w.fund_type ? 'badge-accent' : 'badge-neutral'}`}>
                        {w.fund_type || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)', maxWidth: 280 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.work_description || '—'}
                      </div>
                    </td>
                    <td>{w.agency_name || '—'}</td>
                    <td><StageBadge stage={w.delivery_status || 'Not Started'} /></td>
                    <td className="text-right font-medium" style={{ color: 'var(--text-1)' }}>₹{(w.est_cost_lacs ?? 0).toFixed(1)}</td>
                    <td><ProgressBar value={w.physical_progress_pct ?? 0} inferred={w.progress_inferred ?? undefined} showLabel /></td>
                    <td><RiskBadge score={w.risk_score ?? 0} /></td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8" style={{ color: 'var(--text-3)' }}>No records match your filters</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--glass-border)', background: 'var(--tbl-head-bg)' }}>
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
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
                          background: p === page ? 'var(--accent)' : 'transparent',
                          color: p === page ? '#fff' : 'var(--text-3)',
                        }}
                        onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
            {totalPages > 7 && <span style={{ color: 'var(--text-4)' }}>…</span>}
            <button className="btn-ghost py-1 px-2" disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    style={{ opacity: page === totalPages ? 0.3 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Work Detail Modal */}
      <WorkDetailModal work={selectedWork} onClose={() => setSelectedWork(null)} />

    </div>
  );
}
