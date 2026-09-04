import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}
    >
      {/* ── Animated floating orbs ── */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        {/* Orb 1 */}
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,110,247,0.14) 0%, transparent 65%)',
          animation: 'floatOrb 12s ease-in-out infinite',
        }} />
        {/* Orb 2 */}
        <div style={{
          position: 'absolute', bottom: '15%', right: '20%',
          width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.09) 0%, transparent 65%)',
          animation: 'floatOrb 16s ease-in-out infinite reverse',
          animationDelay: '-4s',
        }} />
        {/* Orb 3 — subtle top-right */}
        <div style={{
          position: 'absolute', top: '-5%', right: '5%',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,110,247,0.07) 0%, transparent 65%)',
          animation: 'floatOrb 20s ease-in-out infinite',
          animationDelay: '-8s',
        }} />
      </div>

      {/* ── Card ── */}
      <div className="w-full max-w-[400px] relative z-10 animate-slide-up">

        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 40px rgba(79,110,247,0.40), 0 8px 24px rgba(79,110,247,0.25)',
            }}
          >
            <Activity size={26} color="#fff" />
          </div>
          <h1
            className="text-[24px] font-bold tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            EPMS
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>
            Municipal Corporation Ludhiana
          </p>
        </div>

        {/* Glass login card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow-lg)',
          }}
        >
          <h2
            className="text-[16px] font-semibold mb-1"
            style={{ color: 'var(--text-1)' }}
          >
            Sign in to your account
          </h2>
          <p className="text-[12px] mb-6" style={{ color: 'var(--text-3)' }}>
            Enter your email and password to access the portal
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-3)' }}
              >
                Email Address
              </label>
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: 'var(--input-bg)',
                  border: `1px solid ${email ? 'var(--input-focus)' : 'var(--input-border)'}`,
                  boxShadow: email ? '0 0 0 3px rgba(79,110,247,0.12)' : 'none',
                }}
              >
                <Mail size={14} color="var(--text-3)" strokeWidth={1.5} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@mcl.gov.in"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: 'var(--text-1)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-3)' }}
              >
                Password
              </label>
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: 'var(--input-bg)',
                  border: `1px solid ${password ? 'var(--input-focus)' : 'var(--input-border)'}`,
                  boxShadow: password ? '0 0 0 3px rgba(79,110,247,0.12)' : 'none',
                }}
              >
                <Lock size={14} color="var(--text-3)" strokeWidth={1.5} />
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

            {/* Error */}
            {error && (
              <p
                className="text-[12px] px-3 py-2 rounded-lg animate-fade-in"
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                }}
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
                background: loading
                  ? 'var(--accent-hover)'
                  : 'linear-gradient(135deg, #5b7cff 0%, #4f6ef7 50%, #3a57e0 100%)',
                backgroundSize: '200% auto',
                color: '#fff',
                opacity: loading ? 0.80 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(79,110,247,0.40)',
                animation: loading ? 'shimmer 1.8s linear infinite' : 'none',
              }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in...
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
          className="block mx-auto mt-3 text-[11px] transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
        >
          Switch to {theme === 'dark' ? 'light' : 'dark'} mode
        </button>

      </div>
    </div>
  );
}
