import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, ShieldAlert, Award, AlertTriangle, Search, ChevronRight } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import MethodologyTooltip from '../components/MethodologyTooltip';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../data/useApi';
import { fetchOfficers, type OfficerRecord } from '../data/api';

const DESIGNATIONS = ['All', 'JE', 'SDO', 'XEN', 'EE'] as const;

export default function OfficerCommand() {
  const navigate = useNavigate();
  const [designationFilter, setDesignationFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<keyof OfficerRecord>('total_works');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: officers, loading, error } = useApi(
    () => fetchOfficers(
      designationFilter === 'All' ? undefined : designationFilter,
      branchFilter === 'All' ? undefined : branchFilter
    ),
    [designationFilter, branchFilter]
  );

  const filtered = useMemo(() => {
    let list = officers || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.officer_name.toLowerCase().includes(q) || o.designation.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [officers, search, sortBy, sortOrder]);

  function handleSort(col: keyof OfficerRecord) {
    if (sortBy === col) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  }

  // Summary Metrics
  const totalOfficers = officers?.length || 0;
  const totalSupervisedWorks = (officers || []).reduce((acc, o) => acc + o.total_works, 0);
  const avgSupervisedRisk = totalOfficers > 0
    ? ((officers || []).reduce((acc, o) => acc + o.avg_risk_score, 0) / totalOfficers).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
      {error && (
        <div className="card p-4 flex items-center gap-3 animate-fade-in" style={{ borderColor: 'var(--danger)' }}>
          <AlertTriangle size={16} color="var(--danger)" />
          <span className="text-[12px]" style={{ color: 'var(--text-1)' }}>{error}</span>
        </div>
      )}

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4 animate-slide-up">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-dim)' }}>
            <UserCheck size={18} color="var(--accent-text)" />
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Supervising Officers</p>
            <p className="text-[24px] font-bold leading-none mt-1" style={{ color: 'var(--text-1)' }}>
              {loading ? '—' : totalOfficers}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '60ms' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-dim)' }}>
            <Award size={18} color="var(--success)" />
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Assigned Works Portfolio</p>
            <p className="text-[24px] font-bold leading-none mt-1 text-emerald-400">
              {loading ? '—' : totalSupervisedWorks.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-dim)' }}>
            <ShieldAlert size={18} color="var(--warn)" />
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Avg Portfolio Risk Score</p>
            <p className="text-[24px] font-bold leading-none mt-1 text-amber-400">
              {loading ? '—' : avgSupervisedRisk}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '180ms' }}>
        {/* Header & Filter Controls */}
        <div
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
              Supervising Officer Directory
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
              {filtered.length} Officers
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Designation Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              {DESIGNATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDesignationFilter(d)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    designationFilter === d
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Branch Filter */}
            <select
              className="input-dark py-1.5 text-[11px]"
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="B&R">B&R</option>
              <option value="O&M">O&M</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <input
                className="input-dark py-1.5 text-[11px] pl-8"
                style={{ width: 180 }}
                placeholder="Search officer name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingSkeleton height={300} label="Loading supervising officers..." />
          ) : (
            <table className="w-full" style={{ minWidth: 1000 }}>
              <thead className="tbl-head">
                <tr>
                  <th className="cursor-pointer" onClick={() => handleSort('officer_name')}>Officer Name</th>
                  <th className="cursor-pointer" onClick={() => handleSort('designation')}>Designation</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('total_works')}>Works Count</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('completed_count')}>Completed</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('in_progress_count')}>In Progress</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('delayed_count')}>Delayed</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('total_tender_cost_lacs')}>Tender Value (₹L)</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('total_expenditure_lacs')}>Expenditure (₹L)</th>
                  <th className="text-right cursor-pointer" onClick={() => handleSort('avg_risk_score')}>
                    <span className="inline-flex items-center gap-1">
                      Avg Risk <MethodologyTooltip metric="risk_score" />
                    </span>
                  </th>
                  <th style={{ minWidth: 140 }}>Avg Physical Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {filtered.map(o => (
                  <tr
                    key={o.officer_id}
                    onClick={() => navigate(`/works?officer_id=${o.officer_id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-500/10"
                  >
                    <td>
                      <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{o.officer_name}</p>
                    </td>
                    <td>
                      <span className="badge badge-accent font-mono text-[10px]">
                        {o.designation}
                      </span>
                    </td>
                    <td className="text-right font-bold font-mono" style={{ color: 'var(--text-1)' }}>{o.total_works}</td>
                    <td className="text-right font-mono" style={{ color: 'var(--success)' }}>{o.completed_count}</td>
                    <td className="text-right font-mono" style={{ color: 'var(--info)' }}>{o.in_progress_count}</td>
                    <td className="text-right font-mono" style={{ color: o.delayed_count > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                      {o.delayed_count}
                    </td>
                    <td className="text-right font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                      ₹{o.total_tender_cost_lacs.toLocaleString()}
                    </td>
                    <td className="text-right font-mono font-medium text-emerald-400">
                      ₹{o.total_expenditure_lacs.toLocaleString()}
                    </td>
                    <td className="text-right font-mono font-bold" style={{ color: o.avg_risk_score >= 30 ? 'var(--danger)' : 'var(--success)' }}>
                      {o.avg_risk_score.toFixed(1)}
                    </td>
                    <td>
                      <ProgressBar value={o.avg_physical_progress} showLabel />
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium">
                        Filter Works <ChevronRight size={13} />
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                      No officers found matching your selection criteria.
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
