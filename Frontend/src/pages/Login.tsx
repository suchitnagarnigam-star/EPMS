import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, ArrowRight, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate   = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    // Simulate a tiny async delay for UX feel
    setTimeout(() => {
      login(identifier.trim(), password);
      navigate('/', { replace: true });
    }, 600);
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      {/* Subtle background radial glow — same depth as rest of app */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,110,247,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-[400px] relative z-10">

        {/* ── BRAND HEADER ── */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{             background: 'var(--accent)', boxShadow: '0 0 32px rgba(79,110,247,0.25)' }}
          >
            <Activity size={22} color="#fff" />
          </div>
          <h1
            className="text-[22px] font-bold tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            EPMS
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>
            Municipal Corporation Ludhiana
          </p>
        </div>

        {/* ── CARD ── */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          }}
        >
          <h2
            className="text-[16px] font-semibold mb-1"
            style={{ color: 'var(--text-1)' }}
          >
            Sign in to your account
          </h2>
          <p className="text-[12px] mb-6" style={{ color: 'var(--text-3)' }}>
            Enter your credentials to access the portal
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Username / Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="identifier"
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: '#505050' }}
              >
                Username or Email
              </label>
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: 'var(--input-bg)',
                  border: `1px solid ${identifier ? '#333333' : '#1e1e1e'}`,
                }}
              >
                <User size={14} color="#404040" strokeWidth={1.5} />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. admin or user@mcl.gov.in"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError(''); }}
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: 'var(--text-1)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                Password
              </label>
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: 'var(--input-bg)',
                  border: `1px solid ${password ? '#333333' : '#1e1e1e'}`,
                }}
              >
                <Lock size={14} color="#404040" strokeWidth={1.5} />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: 'var(--text-1)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="shrink-0 transition-colors"
                  style={{ color: showPass ? 'var(--accent-text)' : 'var(--text-3)' }}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p
                className="text-[12px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                background: loading ? 'var(--accent-hover)' : 'var(--accent)',
                color: '#fff',
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(79,110,247,0.30)',
              }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={15} strokeWidth={2} />
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] mt-5" style={{ color: 'var(--text-4)' }}>
          Executive Project Management System · MCL Ludhiana
        </p>
        <button
          type="button"
          onClick={toggle}
          className="block mx-auto mt-3 text-[11px]"
          style={{ color: 'var(--text-3)' }}
        >
          Switch to {theme === 'dark' ? 'light' : 'dark'} mode
        </button>

      </div>
    </div>
  );
}
