import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, MapPin,
  Star, Bell, Search, ChevronDown, Activity, LogOut,
  Sun, Moon, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SyncStatus } from './SyncStatus';

const NAV_ITEMS = [
  { to: '/',               icon: LayoutDashboard, label: 'Executive Overview'     },
  { to: '/contractors',    icon: Users,           label: 'Contractors'            },
  { to: '/constituencies', icon: MapPin,          label: 'Constituencies & Wards' },
  { to: '/works',          icon: ClipboardList,   label: 'Works Directory'        },
  { to: '/flagship',       icon: Star,            label: 'MDF & SASCI Agenda'     },
  { to: '/quality',        icon: ShieldAlert,     label: 'Data Quality'           },
];

const PAGE_TITLES: Record<string, string> = {
  '/':               'Executive Command Overview',
  '/contractors':    'Contractor Performance Matrix',
  '/constituencies': 'Constituency & Ward Funds',
  '/works':          'Master Works Directory',
  '/flagship':       'MDF & SASCI Special Agenda',
  '/quality':        'Data Quality Dashboard',
};

export default function Layout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const title = PAGE_TITLES[pathname] ?? 'EPMS';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const isDark = theme === 'dark';

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside
        className="flex flex-col shrink-0 h-full overflow-hidden"
        style={{
          width: 220,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          transition: 'background 0.2s',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <Activity size={16} color="#fff" />
          </div>
          <div>
            <p className="text-[14px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>EPMS</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>MCL • Ludhiana</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: isActive ? '10px 12px 10px 15px' : '10px 12px',
                borderRadius: isActive ? '0 8px 8px 0' : 8,
                marginLeft: isActive ? -4 : 0,
                fontSize: 12.5,
                fontWeight: 500,
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-3)',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'var(--hover)';
                  el.style.color = 'var(--text-2)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'transparent';
                  el.style.color = 'var(--text-3)';
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? 'var(--accent)' : undefined} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div
          className="px-4 py-3 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-4)' }}
        >
          <SyncStatus />
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header
          className="h-[52px] flex items-center justify-between px-6 shrink-0"
          style={{
            background: 'var(--topbar-bg)',
            borderBottom: '1px solid var(--border)',
            transition: 'background 0.2s',
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              width: 240,
            }}
          >
            <Search size={13} color="var(--text-3)" />
            <input
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--text-1)' }}
              placeholder="Search works, agencies..."
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium hidden md:block" style={{ color: 'var(--text-4)' }}>
              {title}
            </span>
            <div className="hidden lg:block">
              <SyncStatus />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: 'var(--card-alt)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              {isDark
                ? <Sun  size={14} strokeWidth={1.75} />
                : <Moon size={14} strokeWidth={1.75} />
              }
            </button>

            {/* Notifications */}
            <button className="relative" style={{ color: 'var(--text-3)' }}>
              <Bell size={16} />
              <span
                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--danger)' }}
              />
            </button>

            {/* User */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)' }}
              >
                {user ? user.slice(0, 2).toUpperCase() : 'AS'}
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>
                  {user ?? 'Admin'}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>Commissioner</p>
              </div>
              <ChevronDown size={12} color="var(--text-3)" />
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.color = 'var(--danger)';
                b.style.borderColor = 'var(--danger)';
                b.style.background = 'var(--danger-bg)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.color = 'var(--text-3)';
                b.style.borderColor = 'var(--border)';
                b.style.background = 'transparent';
              }}
            >
              <LogOut size={13} strokeWidth={1.75} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page canvas */}
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
