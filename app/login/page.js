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
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

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
        .google-btn { width: 100%; background: white; border: 1.5px solid #E8E2D9; border-radius: 12px; padding: 13px 16px; font-size: 0.9rem; font-weight: 600; color: #1A1410; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.18s; margin-bottom: 16px; }
        .google-btn:hover { border-color: #D4CEC5; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="page">
        <div className="card">
          <a href="/" className="logo">Snap<span>Reserve</span></a>
          <div className="tagline">Book in a snap. Stay anywhere.</div>

          <div className="title">Welcome back</div>
          <div className="subtitle">Sign in to your SnapReserve account</div>

          {!resetMode && (
            <>
              <button className="google-btn" onClick={handleGoogleSignIn} disabled={googleLoading} type="button">
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>
              <div className="divider"><span>or sign in with email</span></div>
            </>
          )}

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