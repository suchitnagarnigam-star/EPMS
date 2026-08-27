import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, MapPin,
  Star, Bell, Search, ChevronDown, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',              icon: LayoutDashboard, label: 'Executive Overview'      },
  { to: '/contractors',   icon: Users,           label: 'Contractors'             },
  { to: '/constituencies',icon: MapPin,          label: 'Constituencies & Wards'  },
  { to: '/works',         icon: ClipboardList,   label: 'Works Directory'         },
  { to: '/flagship',      icon: Star,            label: 'MDF & SASCI Agenda'      },
];

const PAGE_TITLES: Record<string, string> = {
  '/':               'Executive Command Overview',
  '/contractors':    'Contractor Performance Matrix',
  '/constituencies': 'Constituency & Ward Funds',
  '/works':          'Master Works Directory',
  '/flagship':       'MDF & SASCI Special Agenda',
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'EPMS';

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: '#0f0f0f', borderRight: '1px solid #1f1f1f' }}
             className="flex flex-col shrink-0 h-full overflow-hidden">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid #1f1f1f' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: '#4f6ef7' }}>
            <Activity size={16} color="#fff" />
          </div>
          <div>
            <p className="text-[14px] font-bold leading-none" style={{ color: '#f0f0f0' }}>EPMS</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#505050' }}>MCL • Ludhiana</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12.5px] font-medium transition-all ${
                  isActive
                    ? 'text-[#f0f0f0]'
                    : 'text-[#606060] hover:text-[#a0a0a0] hover:bg-[#171717]'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: '#1c1c2e', color: '#8899ff', borderLeft: '3px solid #4f6ef7', borderRadius: '0 8px 8px 0', marginLeft: -4, paddingLeft: 15 }
                : {}
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? '#8899ff' : undefined} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid #1f1f1f', color: '#404040' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#3db97d]" />
          <span className="text-[10px]">Live · 26 Aug 2026</span>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-[52px] flex items-center justify-between px-6 shrink-0"
                style={{ background: '#0f0f0f', borderBottom: '1px solid #1f1f1f' }}>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
               style={{ background: '#161616', border: '1px solid #242424', width: 240 }}>
            <Search size={13} color="#505050" />
            <input className="flex-1 bg-transparent outline-none text-[12px] placeholder:text-[#404040]"
                   style={{ color: '#d0d0d0' }}
                   placeholder="Search works, agencies..." />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-medium" style={{ color: '#404040' }}>
              {title}
            </span>
            <button className="relative" style={{ color: '#505050' }}>
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#d94040' }} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                   style={{ background: '#1c1c2e', color: '#8899ff' }}>AS</div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold leading-none" style={{ color: '#d0d0d0' }}>Anurag S.</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#505050' }}>Commissioner</p>
              </div>
              <ChevronDown size={12} color="#505050" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
