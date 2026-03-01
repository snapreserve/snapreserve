'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          is_host: isHost,
        }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Save to users table
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        is_host: isHost,
        is_verified: false,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; }
          .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .card { background: white; border: 1px solid #E8E2D9; border-radius: 24px; padding: 48px; width: 100%; max-width: 420px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.08); }
          .success-icon { font-size: 3rem; margin-bottom: 16px; }
          .title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; margin-bottom: 10px; }
          .sub { font-size: 0.86rem; color: #6B5F54; line-height: 1.7; margin-bottom: 24px; }
          .btn { display: inline-block; background: #F4601A; color: white; padding: 12px 28px; border-radius: 100px; font-weight: 700; font-size: 0.9rem; text-decoration: none; }
        `}</style>
        <div className="page">
          <div className="card">
            <div className="success-icon">✅</div>
            <div className="title">Check your email!</div>
            <div className="sub">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and start using SnapReserve.</div>
            <a href="/login" className="btn">Go to login →</a>
          </div>
        </div>
      </>
    )
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

        .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .role-card { border: 2px solid #E8E2D9; border-radius: 12px; padding: 14px; text-align: center; cursor: pointer; transition: all 0.18s; }
        .role-card.selected { border-color: #F4601A; background: #FFF9F6; }
        .role-icon { font-size: 1.4rem; margin-bottom: 4px; }
        .role-label { font-size: 0.8rem; font-weight: 700; }
        .role-sub { font-size: 0.7rem; color: #A89880; }

        .error { background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.15); border-radius: 10px; padding: 10px 14px; font-size: 0.8rem; color: #DC2626; margin-bottom: 16px; }

        .submit-btn { width: 100%; background: linear-gradient(135deg, #F4601A, #FF7A35); border: none; border-radius: 12px; padding: 14px; font-size: 0.94rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-bottom: 16px; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(244,96,26,0.3); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .terms { font-size: 0.72rem; color: #A89880; text-align: center; margin-bottom: 16px; line-height: 1.6; }
        .terms a { color: #F4601A; text-decoration: none; }

        .login-link { text-align: center; font-size: 0.84rem; color: #6B5F54; }
        .login-link a { color: #F4601A; font-weight: 700; text-decoration: none; }

        .back-link { display: block; text-align: center; font-size: 0.8rem; color: #A89880; text-decoration: none; margin-top: 20px; }
      `}</style>

      <div className="page">
        <div className="card">
          <a href="/" className="logo">Snap<span>Reserve</span></a>
          <div className="tagline">Book in a snap. Stay anywhere.</div>

          <div className="title">Create your account</div>
          <div className="subtitle">Join thousands of guests and hosts on SnapReserve</div>

          <form onSubmit={handleSignup}>
            {error && <div className="error">⚠️ {error}</div>}

            {/* ROLE SELECTION */}
            <div className="form-group">
              <label className="label">I want to</label>
              <div className="role-grid">
                <div
                  className={`role-card ${!isHost ? 'selected' : ''}`}
                  onClick={() => setIsHost(false)}
                >
                  <div className="role-icon">🏨</div>
                  <div className="role-label">Book stays</div>
                  <div className="role-sub">I'm a guest</div>
                </div>
                <div
                  className={`role-card ${isHost ? 'selected' : ''}`}
                  onClick={() => setIsHost(true)}
                >
                  <div className="role-icon">🏠</div>
                  <div className="role-label">List my property</div>
                  <div className="role-sub">I'm a host</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Full name</label>
              <input
                className="input"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

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
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="terms">
              By signing up you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <div className="login-link">
            Already have an account? <a href="/login">Sign in</a>
          </div>

          <a href="/" className="back-link">← Back to SnapReserve</a>
        </div>
      </div>
    </>
  )
}