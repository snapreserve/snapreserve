'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; }

        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; overflow: hidden; }
        .page::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 20% 80%, rgba(244,96,26,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(26,110,244,0.06), transparent 60%); pointer-events: none; }

        .card { background: white; border: 1px solid #E8E2D9; border-radius: 24px; padding: 48px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); position: relative; z-index: 1; }

        .logo { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 900; text-decoration: none; color: #1A1410; display: block; text-align: center; margin-bottom: 8px; }
        .logo span { color: #F4601A; }
        .tagline { text-align: center; font-size: 0.78rem; color: #A89880; margin-bottom: 32px; }

        .title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; margin-bottom: 6px; }
        .subtitle { font-size: 0.84rem; color: #6B5F54; margin-bottom: 28px; }

        .form-group { margin-bottom: 16px; }
        .label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B5F54; margin-bottom: 6px; display: block; }
        .input { width: 100%; background: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 12px; padding: 13px 16px; font-size: 0.9rem; font-family: inherit; outline: none; color: #1A1410; transition: all 0.18s; }
        .input:focus { border-color: #F4601A; background: white; box-shadow: 0 0 0 3px rgba(244,96,26,0.08); }

        .error { background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.15); border-radius: 10px; padding: 10px 14px; font-size: 0.8rem; color: #DC2626; margin-bottom: 16px; }

        .submit-btn { width: 100%; background: linear-gradient(135deg, #F4601A, #FF7A35); border: none; border-radius: 12px; padding: 14px; font-size: 0.94rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-bottom: 16px; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(244,96,26,0.3); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .divider { text-align: center; font-size: 0.78rem; color: #A89880; margin-bottom: 16px; position: relative; }
        .divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #E8E2D9; }
        .divider span { background: white; padding: 0 12px; position: relative; }

        .signup-link { text-align: center; font-size: 0.84rem; color: #6B5F54; }
        .signup-link a { color: #F4601A; font-weight: 700; text-decoration: none; }
        .signup-link a:hover { text-decoration: underline; }

        .back-link { display: block; text-align: center; font-size: 0.8rem; color: #A89880; text-decoration: none; margin-top: 20px; }
        .back-link:hover { color: #6B5F54; }
        .forgot-link { font-size: 0.78rem; color: #A89880; text-decoration: none; float: right; margin-top: -2px; }
        .forgot-link:hover { color: #F4601A; }
        .reset-success { background: rgba(22,163,74,0.06); border: 1px solid rgba(22,163,74,0.15); border-radius: 10px; padding: 14px; font-size: 0.84rem; color: #16A34A; margin-bottom: 16px; }
      `}</style>

      <div className="page">
        <div className="card">
          <a href="/" className="logo">Snap<span>Reserve</span></a>
          <div className="tagline">Book in a snap. Stay anywhere.</div>

          <div className="title">Welcome back</div>
          <div className="subtitle">Sign in to your SnapReserve account</div>

          {!resetMode ? (
            <form onSubmit={handleLogin}>
              {error && <div className="error">⚠️ {error}</div>}

              <div className="form-group">
                <label className="label">Email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">
                  Password
                  <button type="button" className="forgot-link" onClick={() => { setResetMode(true); setError('') }}>
                    Forgot password?
                  </button>
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              {resetSent ? (
                <div className="reset-success">
                  ✓ Reset link sent — check your inbox. After resetting your password, you'll need to verify MFA to access the admin console.
                </div>
              ) : (
                <>
                  {error && <div className="error">⚠️ {error}</div>}
                  <div className="subtitle" style={{marginBottom:'16px'}}>Enter your email and we'll send a reset link.</div>
                  <div className="form-group">
                    <label className="label">Email address</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button className="submit-btn" type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send reset link →'}
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setResetMode(false); setResetSent(false); setError('') }} style={{width:'100%',background:'none',border:'none',color:'#A89880',fontSize:'0.82rem',cursor:'pointer',marginTop:'12px',fontFamily:'inherit'}}>
                ← Back to sign in
              </button>
            </form>
          )}

          {!resetMode && (
            <>
              <div className="divider"><span>or</span></div>
              <div className="signup-link">
                Don't have an account? <a href="/signup">Sign up free</a>
              </div>
            </>
          )}

          <a href="/" className="back-link">← Back to SnapReserve</a>
        </div>
      </div>
    </>
  )
}