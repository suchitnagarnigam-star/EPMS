import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { methodology } from '../data/methodology';

interface Props {
  metric: string;
  className?: string;
}

export default function MethodologyTooltip({ metric, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
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

  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const popoverWidth = 288; // 72 * 4 = 288px (w-72)
      const popoverHeight = 180;

      let top = rect.top - popoverHeight - 8;
      // If icon is near top of screen (less than 200px from top), position popover below icon
      if (rect.top < 200) {
        top = rect.bottom + 8;
      }

      // Bound left position within viewport horizontally
      let left = rect.left + rect.width / 2 - popoverWidth / 2;
      if (left < 12) left = 12;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }

      setCoords({ top, left });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setOpen(true);
  };

  if (!entry) return null;

  return (
    <div ref={ref} className={`inline-flex items-center ${className}`}>
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
          className="fixed z-[9999] w-72 p-3 rounded-xl text-left shadow-2xl pointer-events-none transition-all animate-fade-in"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            background: 'var(--card)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(16px)',
            color: 'var(--text-1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
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
