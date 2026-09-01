import { useState } from 'react';
import { AlertTriangle, Database, CheckCircle, RefreshCw } from 'lucide-react';
import { useApi } from '../data/useApi';
import { fetchQuality } from '../data/api';
import ProgressBar from '../components/ProgressBar';
import { TableRowSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';

export default function DataQuality() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, loading, error, refetch } = useApi(
    () => fetchQuality(page, pageSize),
    [page]
  );

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  const backlogResults = data?.backlog_rows?.results || [];
  const backlogTotal = data?.backlog_count || 0;
  const totalPages = Math.max(1, Math.ceil(backlogTotal / pageSize));

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: '#d0d0d0' }}>Data Quality Dashboard</h2>
          <p className="text-[11px] mt-0.5" style={{ color: '#505050' }}>
            Quarantine area and structural validation report for tracker ingestion
          </p>
        </div>
        <button className="btn-ghost py-1.5 text-[11px] gap-1.5" onClick={refetch}>
          <RefreshCw size={12} /> Refetch
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#606060' }}>Analytics-Ready Rows</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
              <CheckCircle size={16} color="#3db97d" />
            </div>
          </div>
          <div>
            <p className="text-[26px] font-bold leading-none" style={{ color: '#3db97d' }}>
              {loading ? '—' : data?.analytics_ready_count?.toLocaleString()}
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: '#505050' }}>
              Successfully parsed and mapped to fact table
            </p>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#606060' }}>Quarantined Backlog</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
              <AlertTriangle size={16} color="#d94040" />
            </div>
          </div>
          <div>
            <p className="text-[26px] font-bold leading-none" style={{ color: '#d94040' }}>
              {loading ? '—' : data?.backlog_count?.toLocaleString()}
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: '#505050' }}>
              Rows failing project identification or schema validation
            </p>
            <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-3)' }}>
              Unique source rows with data issues — rows reappear each sync until fixed in the master tracker.
            </p>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#606060' }}>Quality Pass Rate</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
              <Database size={16} color="#4f6ef7" />
            </div>
          </div>
          <div>
            <p className="text-[26px] font-bold leading-none" style={{ color: '#4f6ef7' }}>
              {loading ? '—' : `${data?.analytics_ready_pct}%`}
            </p>
            <div className="mt-2">
              <ProgressBar value={data?.analytics_ready_pct ?? 0} showLabel={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue frequency list */}
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Validation Errors Breakdown</h3>
          <p className="text-[11px]" style={{ color: '#505050' }}>Flag frequencies for quarantined items</p>
          <div className="flex flex-col gap-3 mt-2">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded" />
                ))}
              </div>
            ) : Object.entries(data?.flag_breakdown || {}).length === 0 ? (
              <p className="text-center py-8 text-[12px]" style={{ color: '#505050' }}>No validation errors found</p>
            ) : (
              Object.entries(data?.flag_breakdown || {}).map(([flag, count]) => (
                <div key={flag} className="flex justify-between items-center p-3 rounded-lg" style={{ background: '#131313', border: '1px solid #1f1f1f' }}>
                  <div>
                    <p className="font-semibold text-[11.5px]" style={{ color: '#a0a0a0' }}>{flag}</p>
                    <p className="text-[10px]" style={{ color: '#505050' }}>Fix required in sheet</p>
                  </div>
                  <span className="badge badge-danger text-[11px] font-bold">{count} rows</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backlog rows table */}
        <div className="card lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #1f1f1f', background: '#111111' }}>
            <h3 className="text-[13px] font-semibold" style={{ color: '#d0d0d0' }}>Quarantine Register (Backlog)</h3>
            <p className="text-[11px] mt-0.5" style={{ color: '#505050' }}>
              Detailed logs of rows that failed ingestion rules
            </p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full" style={{ minWidth: 800 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Source</th>
                  <th>Row #</th>
                  <th style={{ minWidth: 240 }}>Description</th>
                  <th>Raw Zone / Ward</th>
                  <th>Quality Flags</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                ) : backlogResults.map(row => (
                  <tr key={row.id}>
                    <td><span className="badge badge-neutral">{row.source_sheet || '—'}</span></td>
                    <td className="font-medium" style={{ color: '#a0a0a0' }}>{row.source_row || '—'}</td>
                    <td style={{ color: '#c0c0c0', maxWidth: 280 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {row.work_description || '—'}
                      </div>
                    </td>
                    <td>{row.raw_zone || '—'} / {row.raw_ward || '—'}</td>
                    <td>
                      <span className="badge badge-danger">
                        {row.flags || 'MISSING_PROJECT_ID'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && backlogResults.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16" style={{ color: '#404040' }}>
                      Backlog is clean! All rows are analytics-ready.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {backlogTotal > 0 && (
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #1f1f1f', background: '#0f0f0f' }}>
              <span className="text-[11px]" style={{ color: '#505050' }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, backlogTotal)} of {backlogTotal.toLocaleString()} backlog rows
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  className="btn-ghost py-1.5 px-2.5 text-[11px]"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ opacity: page === 1 ? 0.35 : 1 }}
                >
                  Prev
                </button>
                <span className="text-[11.5px]" style={{ color: '#808080' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn-ghost py-1.5 px-2.5 text-[11px]"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ opacity: page === totalPages ? 0.35 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
