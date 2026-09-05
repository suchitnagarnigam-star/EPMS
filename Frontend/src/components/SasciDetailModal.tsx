import { useEffect, useState } from 'react';
import { X, MapPin, Road, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import type { SasciWork } from '../data/api';
import ProgressBar from './ProgressBar';

interface SasciDetailModalProps {
  work: SasciWork | null;
  onClose: () => void;
}

export default function SasciDetailModal({ work, onClose }: SasciDetailModalProps) {
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

  const pct = work.pct_length_completed ?? 0;
  let statusBadge = <span className="badge badge-danger">Early Stage</span>;
  if (pct === 100) {
    statusBadge = <span className="badge badge-success">Completed</span>;
  } else if (pct > 75) {
    statusBadge = <span className="badge badge-info">Advanced</span>;
  } else if (pct >= 25) {
    statusBadge = <span className="badge badge-warn">In Progress</span>;
  }

  const funding = (work.source_of_funding || 'FLAGSHIP').toUpperCase();
  const workId = `${funding.includes('MDF') ? 'MDF' : 'SCI'}-${String(work.sr_no || work.id).padStart(3, '0')}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        animateIn ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto card p-6 space-y-6 shadow-2xl transition-all duration-300 transform ${
          animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{ background: 'var(--card)', borderColor: 'var(--glass-border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                {workId}
              </span>
              <span className="badge badge-neutral">{funding}</span>
              {statusBadge}
            </div>
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              {work.name_of_road || 'Unnamed Road Project'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Identity */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Road size={14} className="text-primary-400" /> Identity & Categorization
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <p className="text-slate-500 mb-0.5">Road Type</p>
              <p className="font-semibold text-slate-200">{work.type_of_road || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <p className="text-slate-500 mb-0.5">Constituency</p>
              <p className="font-semibold text-slate-200 flex items-center gap-1">
                <MapPin size={12} className="text-emerald-400" /> {work.constituency || 'Ludhiana'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <p className="text-slate-500 mb-0.5">Funding Source</p>
              <p className="font-semibold text-slate-200">{funding}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Physical Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" /> Physical Progress
            </h3>
            {work.progress_as_of && (
              <span className="text-[11px] text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                Progress As Of: <strong className="text-slate-200">{work.progress_as_of}</strong>
              </span>
            )}
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Completion Status</span>
              <span className="text-emerald-400 font-bold text-sm">{pct}%</span>
            </div>
            <ProgressBar value={pct} showLabel={false} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs">
              <div>
                <p className="text-slate-500">Total KM</p>
                <p className="font-bold text-slate-200">{work.total_length_km ?? 'N/A'} km</p>
              </div>
              <div>
                <p className="text-slate-500">Completed KM</p>
                <p className="font-bold text-emerald-400">{work.completed_length_km ?? 'N/A'} km</p>
              </div>
              <div>
                <p className="text-slate-500">White Line Target</p>
                <p className="font-semibold text-slate-300">{work.white_line_target_km ?? 'N/A'} km</p>
              </div>
              <div>
                <p className="text-slate-500">White Line Done</p>
                <p className="font-semibold text-slate-300">{work.white_line_done_km ?? 'N/A'} km</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Cost Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            Financial & Cost Outlay
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-slate-500 mb-0.5">Est. Cost (Lacs)</p>
              <p className="text-lg font-bold text-amber-400">
                ₹{work.est_cost_lacs ? work.est_cost_lacs.toLocaleString() : 'N/A'} Lacs
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-slate-500 mb-0.5">Est. Cost (Crores)</p>
              <p className="text-lg font-bold text-amber-400">
                ₹{work.est_cost_crores ? work.est_cost_crores.toFixed(2) : (work.est_cost_lacs ? (work.est_cost_lacs / 100).toFixed(2) : 'N/A')} Cr
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Remarks & Completion */}
        <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-sky-400" /> Target Completion & Remarks
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-sky-400" />
              <span className="text-slate-400">Target Completion Date:</span>
              <span className="font-semibold text-slate-200">
                {work.target_completion_date || 'Not Specified'}
              </span>
            </div>
            {work.remarks && (
              <p className="text-slate-300 text-xs leading-relaxed pt-1 border-t border-slate-800/80">
                {work.remarks}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
