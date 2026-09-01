import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { methodology } from '../data/methodology';

interface Props {
  metric: string;
  className?: string;
}

export default function MethodologyTooltip({ metric, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [placeBelow, setPlaceBelow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entry = methodology[metric];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPlaceBelow(rect.top < 200);
    }
    setOpen(true);
  };

  if (!entry) return null;

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => { if (!open) handleOpen(); else setOpen(false); }}
        onMouseEnter={handleOpen}
        onMouseLeave={() => setOpen(false)}
        aria-label={`Methodology info for ${entry.label}`}
        className="text-[11px] opacity-70 hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-blue-500 cursor-pointer"
      >
        <Info size={13} strokeWidth={2} />
      </button>

      {open && (
        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 w-72 p-3 rounded-xl text-left shadow-xl pointer-events-none transition-all animate-fade-in ${
            placeBelow ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(16px)',
            color: 'var(--text-1)',
          }}
        >
          <div className="flex items-center gap-1.5 border-b pb-1.5 mb-2" style={{ borderColor: 'var(--glass-border)' }}>
            <Info size={13} className="text-blue-500 shrink-0" />
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-1)' }}>{entry.label}</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9.5px]">Formula:</span>
              <p className="font-mono text-[10.5px] mt-0.5" style={{ color: 'var(--text-2)' }}>{entry.formula}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9.5px]">Source:</span>
              <p style={{ color: 'var(--text-2)' }}>{entry.source}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9.5px]">Notes:</span>
              <p className="italic text-[10.5px]" style={{ color: 'var(--text-3)' }}>{entry.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
