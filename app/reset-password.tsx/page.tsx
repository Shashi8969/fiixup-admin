'use client'
// app/reset-password/page.tsx
// Supabase redirects here after user clicks the reset link in their email
// URL contains #access_token — Supabase client picks it up automatically

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { getBrowserClient }    from '@/lib/supabase'
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

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

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [hasSession,setHasSession]= useState(false)

  // Supabase processes the #access_token from the URL automatically on mount
  useEffect(() => {
    const sb = getBrowserClient()
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setHasSession(true)
    })
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const sb = getBrowserClient()
    const { error: updateError } = await sb.auth.updateUser({ password })

    if (updateError) { setError(updateError.message); setLoading(false); return }

    setSuccess(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c10',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: '16px', marginBottom: '18px',
            boxShadow: '0 8px 24px rgba(37,99,235,0.25)',
          }}>
            <KeyRound style={{ width: '26px', height: '26px', color: '#fff' }} />
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
            Set new password
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
            Choose a strong password for your admin account
          </p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1e2535', borderRadius: '16px', padding: '28px' }}>

          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle style={{ width: '40px', height: '40px', color: '#22c55e', margin: '0 auto 16px' }} />
              <p style={{ color: '#4ade80', fontWeight: 600, marginBottom: '8px' }}>Password updated!</p>
              <p style={{ color: '#475569', fontSize: '13px' }}>Redirecting you to login…</p>
            </div>
          ) : !hasSession ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: '#f87171', fontSize: '13px' }}>
                Invalid or expired reset link. Please request a new one.
              </p>
              <button
                onClick={() => router.push('/login')}
                style={{ marginTop: '16px', background: '#2563eb', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} noValidate>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
                  ⚠ {error}
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="new-pw" style={LABEL}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
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

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="confirm-pw" style={LABEL}>Confirm new password</label>
                <input
                  id="confirm-pw"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...INPUT, borderColor: confirm && confirm !== password ? '#ef4444' : '#1e2535' }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                  onBlur={(e)  => (e.target.style.borderColor = confirm && confirm !== password ? '#ef4444' : '#1e2535')}
                />
                {confirm && confirm !== password && (
                  <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm || password !== confirm}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  border: 'none', borderRadius: '10px', padding: '13px',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: (loading || !password || !confirm || password !== confirm) ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {loading && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Updating…' : 'Update Password →'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #334155; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #0d1117 inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  )
}
