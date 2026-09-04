import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, MapPin,
  Star, ChevronDown, Activity, LogOut,
  Sun, Moon, ShieldAlert, UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SyncStatus } from './SyncStatus';

const NAV_ITEMS = [
  { to: '/',               icon: LayoutDashboard, label: 'Executive Overview'     },
  { to: '/contractors',    icon: Users,           label: 'Contractors'            },
  { to: '/constituencies', icon: MapPin,          label: 'Constituencies & Wards' },
  { to: '/works',          icon: ClipboardList,   label: 'Works Directory'        },
  { to: '/officers',       icon: UserCheck,       label: 'Officer Command'        },
  { to: '/flagship',       icon: Star,            label: 'MDF & SASCI Agenda'     },
  { to: '/quality',        icon: ShieldAlert,     label: 'Data Quality'           },
];

const PAGE_TITLES: Record<string, string> = {
  '/':               'Executive Command Overview',
  '/contractors':    'Contractor Performance Matrix',
  '/constituencies': 'Constituency & Ward Funds',
  '/works':          'Master Works Directory',
  '/officers':       'Officer Performance Command',
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
    <div
      className="flex h-full overflow-hidden"
      style={{ background: 'var(--bg)', position: 'relative' }}
    >
      {/* ── Ambient background mesh ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        {/* Top-left orb */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--mesh-a) 0%, transparent 65%)',
          animation: 'floatOrb 14s ease-in-out infinite',
        }} />
        {/* Bottom-right orb */}
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-5%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--mesh-b) 0%, transparent 65%)',
          animation: 'floatOrb 18s ease-in-out infinite reverse',
          animationDelay: '-6s',
        }} />
      </div>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside
        className="flex flex-col shrink-0 h-full overflow-hidden"
        style={{
          width: 224,
          position: 'relative',
          zIndex: 10,
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--glass-border)',
          transition: 'background 0.3s',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 20px rgba(79,110,247,0.40)',
            }}
          >
            <Activity size={17} color="#fff" />
          </div>
          <div>
            <p className="text-[14px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>
              EPMS
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              MCL • Ludhiana
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: isActive ? 600 : 500,
                background: isActive
                  ? 'rgba(79, 110, 247, 0.15)'
                  : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-3)',
                borderLeft: isActive
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s, transform 0.12s, border-color 0.15s',
                transform: 'translateX(0)',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'var(--hover)';
                  el.style.color = 'var(--text-2)';
                  el.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'transparent';
                  el.style.color = 'var(--text-3)';
                  el.style.transform = 'translateX(0)';
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    color={isActive ? 'var(--accent)' : undefined}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div
          className="px-4 py-3 flex flex-col gap-1"
          style={{
            borderTop: '1px solid var(--glass-border)',
            color: 'var(--text-4)',
          }}
        >
          <SyncStatus />
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ position: 'relative', zIndex: 5 }}>

        {/* Topbar */}
        <header
          className="h-[52px] flex items-center justify-between px-6 shrink-0"
          style={{
            background: 'var(--topbar-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            transition: 'background 0.3s',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Page title */}
          <span className="text-[13px] font-semibold hidden md:block" style={{ color: 'var(--text-2)' }}>
            {title}
          </span>

          {/* Right actions */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden lg:block">
              <SyncStatus />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-2)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.background = 'var(--hover)';
                b.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.background = 'var(--glass-bg)';
                b.style.transform = 'scale(1)';
              }}
            >
              {isDark
                ? <Sun  size={14} strokeWidth={1.75} />
                : <Moon size={14} strokeWidth={1.75} />
              }
            </button>

            {/* User chip */}
            <button
              onClick={() => navigate('/profile')}
              title="View Profile & Admin Access"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all hover:brightness-110"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
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
              <ChevronDown size={11} color="var(--text-3)" />
            </button>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{
                color: 'var(--text-3)',
                border: '1px solid var(--glass-border)',
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
                b.style.borderColor = 'var(--glass-border)';
                b.style.background = 'transparent';
              }}
            >
              <LogOut size={13} strokeWidth={1.75} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page canvas */}
        <main className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
