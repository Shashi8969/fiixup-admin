'use client'

import { useState, Suspense }            from 'react'
import { useRouter, useSearchParams }    from 'next/navigation'
import { getBrowserClient }           from '@/lib/supabase'
import {
  Wrench, Loader2, Eye, EyeOff,
  Shield, Zap, Lock, UserPlus,
  KeyRound, ArrowLeft, CheckCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'login' | 'register' | 'forgot'

// ─── Shared input style ───────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: '100%', background: '#0d1117',
  border: '1px solid #1e2535', borderRadius: '10px',
  padding: '12px 14px', color: '#f1f5f9',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  display: 'block', color: '#64748b', fontSize: '11px',
  fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '8px',
}
const FGROUP: React.CSSProperties = { marginBottom: '18px' }

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/dashboard'

  const [mode,     setMode]    = useState<Mode>('login')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')
  const [success,  setSuccess] = useState('')

  // Login fields
  const [email,    setEmail]   = useState('')
  const [password, setPassword]= useState('')
  const [showPw,   setShowPw]  = useState(false)

  // Register fields
  const [regEmail,    setRegEmail]    = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm,  setRegConfirm]  = useState('')
  const [regName,     setRegName]     = useState('')
  const [showRegPw,   setShowRegPw]   = useState(false)
  const [adminSecret, setAdminSecret] = useState('')

  // Forgot field
  const [forgotEmail, setForgotEmail] = useState('')

  const reset = (m: Mode) => {
    setError(''); setSuccess(''); setMode(m)
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const sb = getBrowserClient()
      const { data, error: authError } = await sb.auth.signInWithPassword({
        email: email.trim(), password,
      })
      if (authError) { setError(authError.message); setLoading(false); return }
      if (!data.session) { setError('No session returned. Check credentials.'); setLoading(false); return }
      window.location.href = next
    } catch { setError('Unexpected error. Check your internet connection.'); setLoading(false) }
  }

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')

    // Validate
    if (regPassword !== regConfirm) { setError('Passwords do not match.'); return }
    if (regPassword.length < 8)    { setError('Password must be at least 8 characters.'); return }
    if (adminSecret !== process.env.NEXT_PUBLIC_ADMIN_INVITE_SECRET) {
      setError('Invalid admin invite code. Ask the site owner for the code.'); return
    }

    setLoading(true)
    try {
      const sb = getBrowserClient()
      const { error: authError } = await sb.auth.signUp({
        email:    regEmail.trim(),
        password: regPassword,
        options:  { data: { full_name: regName } },
      })
      if (authError) { setError(authError.message); setLoading(false); return }
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setLoading(false)
      setTimeout(() => reset('login'), 4000)
    } catch { setError('Unexpected error.'); setLoading(false) }
  }

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      const sb = getBrowserClient()
      const { error: authError } = await sb.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (authError) { setError(authError.message); setLoading(false); return }
      setSuccess(`Reset link sent to ${forgotEmail}. Check your inbox.`)
      setLoading(false)
    } catch { setError('Unexpected error.'); setLoading(false) }
  }

  // ── ICONS per mode ─────────────────────────────────────────────────────────
  const modeIcon = {
    login:    <Lock    style={{ width: '26px', height: '26px', color: '#fff' }} />,
    register: <UserPlus style={{ width: '26px', height: '26px', color: '#fff' }} />,
    forgot:   <KeyRound style={{ width: '26px', height: '26px', color: '#fff' }} />,
  }
  const modeTitle = {
    login:    'Welcome back',
    register: 'Create admin account',
    forgot:   'Reset your password',
  }
  const modeSubtitle = {
    login:    'Sign in to your admin panel',
    register: 'Use your invite code to register',
    forgot:   'We\'ll send a reset link to your email',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c10', display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>

      {/* ── LEFT PANEL ── */}
      <div className="left-panel" style={{
        display: 'none', width: '45%',
        background: 'linear-gradient(145deg, #0f1729 0%, #0d1420 50%, #0a0c10 100%)',
        borderRight: '1px solid #1e2535', padding: '48px',
        flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench style={{ width: '20px', height: '20px', color: '#fff' }} />
          </div>
          <span style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: 600 }}>Fiixup Admin</span>
        </div>

        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1e2535', border: '1px solid #2a3448', borderRadius: '20px', padding: '6px 14px', color: '#60a5fa', fontSize: '12px', fontWeight: 600, marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Content Management System
          </div>
          <h2 style={{ color: '#f1f5f9', fontSize: '32px', fontWeight: 700, lineHeight: 1.2, marginBottom: '16px' }}>
            Manage your entire<br />
            <span style={{ color: '#3b82f6' }}>Fiixup platform</span><br />
            from one place.
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Edit city pages, service content, pricing, blog posts, and testimonials — without touching code.
          </p>
          <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { icon: Shield,  text: '4 cities — Bangalore, Mumbai, Chennai, Hyderabad' },
              { icon: Zap,     text: 'Changes go live instantly via ISR revalidation'   },
              { icon: UserPlus,text: 'Invite-code protected admin registration'          },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                </div>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#334155', fontSize: '12px' }}>© 2025 Fiixup · fiixup.in</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: '16px', marginBottom: '18px',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(37,99,235,0.25)',
            }}>
              {modeIcon[mode]}
            </div>
            <h1 style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
              {modeTitle[mode]}
            </h1>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              {modeSubtitle[mode]}
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{
            display: 'flex', background: '#111827', border: '1px solid #1e2535',
            borderRadius: '12px', padding: '4px', marginBottom: '20px', gap: '4px',
          }}>
            {([
              { id: 'login',    label: 'Sign In'  },
              { id: 'register', label: 'Register' },
              { id: 'forgot',   label: 'Forgot'   },
            ] as { id: Mode; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => reset(tab.id)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  transition: 'all 0.15s',
                  background: mode === tab.id ? '#2563eb' : 'transparent',
                  color:      mode === tab.id ? '#fff'    : '#475569',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: '#111827', border: '1px solid #1e2535', borderRadius: '16px', padding: '28px' }}>

            {/* Success message */}
            {success && (
              <div style={{
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '10px', padding: '12px 14px', color: '#4ade80',
                fontSize: '13px', marginBottom: '20px',
                display: 'flex', alignItems: 'flex-start', gap: '8px',
              }}>
                <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                {success}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', padding: '12px 14px', color: '#f87171',
                fontSize: '13px', marginBottom: '20px',
                display: 'flex', alignItems: 'flex-start', gap: '8px',
              }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>⚠</span>
                {error}
              </div>
            )}

            {/* ════ LOGIN FORM ════ */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} noValidate>
                <div style={FGROUP}>
                  <label htmlFor="l-email" style={LABEL}>Email address</label>
                  <input id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@fiixup.in" required autoComplete="email" autoFocus
                    style={INPUT}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                  />
                </div>

                <div style={FGROUP}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label htmlFor="l-password" style={{ ...LABEL, marginBottom: 0 }}>Password</label>
                    <button type="button" onClick={() => reset('forgot')}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input id="l-password" type={showPw ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" required autoComplete="current-password"
                      style={{ ...INPUT, paddingRight: '44px' }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
                      {showPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                    </button>
                  </div>
                </div>

                <SubmitButton loading={loading} disabled={!email || !password} label="Sign in to Admin →" />
              </form>
            )}

            {/* ════ REGISTER FORM ════ */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} noValidate>
                <div style={FGROUP}>
                  <label htmlFor="r-name" style={LABEL}>Full name</label>
                  <input id="r-name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                    placeholder="Rishi Kumar" required
                    style={INPUT}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                  />
                </div>

                <div style={FGROUP}>
                  <label htmlFor="r-email" style={LABEL}>Email address</label>
                  <input id="r-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@fiixup.in" required autoComplete="email"
                    style={INPUT}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                  />
                </div>

                <div style={FGROUP}>
                  <label htmlFor="r-password" style={LABEL}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input id="r-password" type={showRegPw ? 'text' : 'password'} value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 characters" required
                      style={{ ...INPUT, paddingRight: '44px' }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                    />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)} tabIndex={-1}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
                      {showRegPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {regPassword.length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                      {[1,2,3,4].map((i) => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '9999px',
                          background: regPassword.length >= i * 3
                            ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#3b82f6' : '#22c55e'
                            : '#1e2535',
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={FGROUP}>
                  <label htmlFor="r-confirm" style={LABEL}>Confirm password</label>
                  <input id="r-confirm" type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="••••••••" required
                    style={{ ...INPUT, borderColor: regConfirm && regConfirm !== regPassword ? '#ef4444' : '#1e2535' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e)  => (e.target.style.borderColor = regConfirm && regConfirm !== regPassword ? '#ef4444' : '#1e2535')}
                  />
                  {regConfirm && regConfirm !== regPassword && (
                    <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>Passwords do not match</p>
                  )}
                </div>

                <div style={{ ...FGROUP, marginBottom: '24px' }}>
                  <label htmlFor="r-secret" style={LABEL}>Admin invite code</label>
                  <input id="r-secret" type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Ask the site owner for this code" required
                    style={INPUT}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                  />
                  <p style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>
                    Set <code style={{ color: '#60a5fa' }}>NEXT_PUBLIC_ADMIN_INVITE_SECRET</code> in your <code style={{ color: '#60a5fa' }}>.env.local</code> to control who can register.
                  </p>
                </div>

                <SubmitButton loading={loading} disabled={!regEmail || !regPassword || !regConfirm || !adminSecret} label="Create Admin Account →" />
              </form>
            )}

            {/* ════ FORGOT PASSWORD FORM ════ */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgot} noValidate>
                <div style={FGROUP}>
                  <label htmlFor="f-email" style={LABEL}>Your email address</label>
                  <input id="f-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@fiixup.in" required autoFocus
                    style={INPUT}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e)  => (e.target.style.borderColor = '#1e2535')}
                  />
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '8px', lineHeight: 1.5 }}>
                    We'll send a password reset link to this address. Check your inbox and spam folder.
                  </p>
                </div>

                <SubmitButton loading={loading} disabled={!forgotEmail} label="Send Reset Link →" />

                <button type="button" onClick={() => reset('login')}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    color: '#475569', fontSize: '13px', cursor: 'pointer',
                    marginTop: '12px', padding: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                  <ArrowLeft style={{ width: '14px', height: '14px' }} />
                  Back to sign in
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Lock style={{ width: '12px', height: '12px', color: '#334155' }} />
            <p style={{ color: '#334155', fontSize: '12px', margin: 0 }}>
              Restricted access · Fiixup Admin Panel
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .left-panel { display: flex !important; } }
        input::placeholder { color: #334155; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #0d1117 inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
          caret-color: #f1f5f9;
        }
      `}</style>
    </div>
  )
}

// ─── Shared submit button ─────────────────────────────────────────────────────
function SubmitButton({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      style={{
        width: '100%',
        background: (loading || disabled)
          ? '#1e3a8a'
          : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        border: 'none', borderRadius: '10px', padding: '13px',
        color: '#fff', fontSize: '14px', fontWeight: 600,
        cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
        opacity: (loading || disabled) ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
        transition: 'opacity 0.15s',
      }}
    >
      {loading && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
      {loading ? 'Please wait…' : label}
    </button>
  )
}