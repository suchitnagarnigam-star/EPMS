import { useEffect, useState } from 'react';
import { X, MapPin, Building2, ShieldAlert, DollarSign, Clock, AlertTriangle, Tag, CheckCircle2, Layers } from 'lucide-react';
import type { WorkRecord } from '../data/api';
import StageBadge from './StageBadge';
import ProgressBar from './ProgressBar';

interface WorkDetailModalProps {
  work: WorkRecord | null;
  onClose: () => void;
}

export default function WorkDetailModal({ work, onClose }: WorkDetailModalProps) {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (work) {
      setAnimateIn(true);
      document.body.style.overflow = 'hidden';
    } else {
      setAnimateIn(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [work]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && work) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [work, onClose]);

  if (!work) return null;

  // Helper for risk ring color
  const riskScore = work.risk_score ?? 0;
  let riskColor = '#34d399'; // green
  let riskTextClass = 'text-emerald-500';
  let riskBgClass = 'bg-emerald-500/10 border-emerald-500/20';

  if (riskScore >= 60) {
    riskColor = '#f87171'; // red
    riskTextClass = 'text-red-500';
    riskBgClass = 'bg-red-500/10 border-red-500/20';
  } else if (riskScore >= 30) {
    riskColor = '#fbbf24'; // amber
    riskTextClass = 'text-amber-500';
    riskBgClass = 'bg-amber-500/10 border-amber-500/20';
  }

  // Parse data quality flags into individual items
  const parseQualityFlags = (flagsStr: string | null) => {
    if (!flagsStr) return [];
    return flagsStr
      .split(/[,|;]/)
      .map(f => f.trim())
      .filter(Boolean);
  };

  const qualityFlags = parseQualityFlags(work.data_quality_flags);

  const getFlagSeverity = (flag: string) => {
    const uppercase = flag.toUpperCase();
    if (uppercase.includes('CRITICAL') || uppercase.includes('ANOMALY') || uppercase.includes('HIGH') || uppercase.includes('MISSING') || uppercase.includes('OVERDUE')) {
      return 'badge-danger';
    }
    if (uppercase.includes('WARN') || uppercase.includes('PENDING') || uppercase.includes('UNVERIFIED') || uppercase.includes('INFERRED') || uppercase.includes('INCOMPLETE')) {
      return 'badge-warn';
    }
    return 'badge-neutral';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(7, 10, 18, 0.65)' }}
    >
      {/* Backdrop blur click handler */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl transition-all duration-200 transform ${
          animateIn ? 'translate-y-0 scale-100' : 'translate-y-4 scale-98'
        }`}
        style={{
          background: 'var(--card)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b backdrop-blur-xl"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--tbl-head-bg)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md" style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', border: '1px solid rgba(79, 110, 247, 0.3)' }}>
              ID: {work.work_id}
            </span>
            <span className="badge badge-neutral uppercase tracking-wider text-[10px]">
              Branch: {work.branch}
            </span>
            {work.fund_type && (
              <span className="badge badge-accent text-[10px]">
                {work.fund_type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* PROMINENT WORK DESCRIPTION */}
          <div className="p-4 rounded-xl border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>
              Work Description
            </span>
            <p className="text-[14px] font-medium leading-relaxed" style={{ color: 'var(--text-1)' }}>
              {work.work_description || 'No detailed description provided for this work record.'}
            </p>
          </div>

          {/* GRID SECTION: 1 IDENTITY, 2 LOCATION, 3 AGENCY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
            {/* 1 IDENTITY */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                <Tag size={13} className="text-blue-400" /> 1. Identity
              </div>
              <div className="text-[12px] space-y-1">
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Nature of Work: </span>
                  <span className="font-medium">{work.nature_of_work || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Work Order / Date: </span>
                  <span className="font-mono text-[11px]">{work.work_order_no_date || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Resolution No: </span>
                  <span className="font-mono text-[11px]">{work.resolution_no_date || '—'}</span>
                </div>
                {work.length_rmt != null && (
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Length / Width: </span>
                    <span className="font-medium">{work.length_rmt} RMT {work.road_width_ft ? `× ${work.road_width_ft} FT` : ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2 LOCATION */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                <MapPin size={13} className="text-emerald-400" /> 2. Location
              </div>
              <div className="text-[12px] space-y-1">
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Zone / Sub-Zone: </span>
                  <span className="font-medium">{work.zone ? `Zone ${work.zone}` : '—'} {work.sub_zone ? `(${work.sub_zone})` : ''}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Constituency: </span>
                  <span className="font-medium">{work.constituency || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Ward: </span>
                  <span className="font-medium">{work.ward || '—'}</span>
                </div>
              </div>
            </div>

            {/* 3 AGENCY */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                <Building2 size={13} className="text-purple-400" /> 3. Agency &amp; Officer
              </div>
              <div className="text-[12px] space-y-1">
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Executing Agency: </span>
                  <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{work.agency_name || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>Officer In Charge: </span>
                  <span className="font-medium">{work.officer_name || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>TS Accorded By: </span>
                  <span className="font-medium">{work.ts_accorded_by || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 FINANCIALS (3-col stat row) */}
          <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
              <DollarSign size={13} className="text-emerald-400" /> 4. Financial Progress
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tender Cost */}
              <div className="p-3.5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Tender Value (₹ Lacs)</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[20px] font-bold font-mono" style={{ color: 'var(--text-1)' }}>
                    ₹{(work.tender_cost_lacs ?? 0).toFixed(1)}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    Est: ₹{(work.est_cost_lacs ?? 0).toFixed(1)}L
                  </span>
                </div>
              </div>

              {/* Expenditure */}
              <div className="p-3.5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Total Expenditure (₹ Lacs)</span>
                <div className="mt-1">
                  <span className="text-[20px] font-bold font-mono text-emerald-400">
                    ₹{(work.expenditure_lacs ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Financial Progress % */}
              <div className="p-3.5 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Financial Progress %</span>
                  {work.fin_progress_anomaly && (
                    <span className="badge badge-danger text-[9px]">Anomaly</span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[20px] font-bold font-mono text-blue-400">
                    {(work.financial_progress_pct ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 STATUS (2-col layout) */}
          <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
              <Clock size={13} className="text-amber-400" /> 5. Status &amp; Physical Timeline
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Badges + Progress */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-3)' }}>Delivery Status</span>
                    <StageBadge stage={work.delivery_status || 'Not Started'} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase block mb-1" style={{ color: 'var(--text-3)' }}>Workflow Stage</span>
                    <StageBadge stage={work.workflow_stage || 'Not Started'} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1.5">
                    <span style={{ color: 'var(--text-3)' }}>Physical Progress</span>
                    <span className="font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                      {(work.physical_progress_pct ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={work.physical_progress_pct ?? 0}
                    inferred={work.progress_inferred ?? undefined}
                  />
                </div>
              </div>

              {/* Overdue & Dates */}
              <div className="space-y-3 text-[12px]">
                <div className="p-3 rounded-xl border flex items-center justify-between" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className={(work.days_overdue ?? 0) > 0 ? 'text-red-400' : 'text-slate-400'} />
                    <span style={{ color: 'var(--text-2)' }}>Days Overdue:</span>
                  </div>
                  <span className={`font-mono font-bold text-[14px] ${(work.days_overdue ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {work.days_overdue ?? 0} days
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Start Date: </span>
                    <span className="font-mono">
                      {work.start_date && work.start_date.trim() && work.start_date !== '-' ? (
                        work.start_date
                      ) : work.work_order_no_date && work.work_order_no_date.match(/\b(\d{1,4}[-./]\d{1,2}[-./]\d{1,4})\b/) ? (
                        <>
                          {work.work_order_no_date.match(/\b(\d{1,4}[-./]\d{1,2}[-./]\d{1,4})\b/)?.[1]}
                          <span className="text-[10px] text-blue-400 font-sans ml-1">(WO Date)</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Sched. End: </span>
                    <span className="font-mono">{work.scheduled_end_date || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6 RISK ASSESSMENT */}
          <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
              <ShieldAlert size={13} className="text-red-400" /> 6. Risk Assessment &amp; Driving Factors
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Score Ring */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r="36"
                      stroke="var(--border)"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="36"
                      stroke={riskColor}
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 36}
                      strokeDashoffset={(2 * Math.PI * 36) - (Math.min(100, Math.max(0, riskScore)) / 100) * (2 * Math.PI * 36)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                    <span className={`font-bold font-mono leading-none ${
                      String(riskScore).length >= 6
                        ? 'text-[11px]'
                        : String(riskScore).length >= 5
                        ? 'text-[13px]'
                        : 'text-[17px]'
                    } ${riskTextClass}`}>
                      {typeof riskScore === 'number' ? (Number.isInteger(riskScore) ? String(riskScore) : riskScore.toFixed(1)) : '0'}
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 leading-none mt-1 tracking-wider">
                      Score
                    </span>
                  </div>
                </div>
              </div>

              {/* Driving Factors / Issues & Bottlenecks */}
              <div className="flex-1 space-y-2 w-full text-[12px]">
                {work.issues_bottlenecks ? (
                  <div className={`p-3 rounded-xl border ${riskBgClass}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-red-400">
                      Issues &amp; Bottlenecks Identified
                    </span>
                    <p style={{ color: 'var(--text-1)' }}>{work.issues_bottlenecks}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border text-slate-400 text-[11px]" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                    No specific issues or bottlenecks flagged for this work item.
                  </div>
                )}

                {work.remarks && (
                  <div className="p-3 rounded-xl border text-[11px]" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5" style={{ color: 'var(--text-3)' }}>
                      Remarks
                    </span>
                    <p style={{ color: 'var(--text-2)' }}>{work.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7 DATA QUALITY FLAGS */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-3)' }}>
              <Layers size={13} className="text-blue-400" /> 7. Data Quality Flags
            </div>

            {qualityFlags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {qualityFlags.map((flag, idx) => (
                  <span key={idx} className={`badge ${getFlagSeverity(flag)} font-mono text-[11px] px-2.5 py-1`}>
                    {flag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 size={14} />
                <span>No data quality issues detected for this record.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
