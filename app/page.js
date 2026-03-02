'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { checkPreviewPassword } from './actions/preview'

export default function ComingSoonHome() {
  const router = useRouter()
  const [clickCount, setClickCount] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [notifyError, setNotifyError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleLogoClick() {
    const next = clickCount + 1
    setClickCount(next)
    if (next >= 5) {
      setShowLogin(true)
      setClickCount(0)
    }
  }

  function handleAdminLogin(e) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await checkPreviewPassword(password)
      if (result.success) {
        router.push('/home')
      } else if (result.locked) {
        setError(`Too many failed attempts. Try again in ${result.minutesLeft} minute${result.minutesLeft !== 1 ? 's' : ''}.`)
      } else {
        const left = result.attemptsLeft
        setError(left > 0
          ? `Incorrect password. ${left} attempt${left !== 1 ? 's' : ''} remaining.`
          : 'Incorrect password.')
      }
    })
  }

  async function handleNotify(e) {
    e.preventDefault()
    setNotifyLoading(true)
    setNotifyError('')

    const { error } = await supabase
      .from('waitlist')
      .insert({ email })

    if (error) {
      if (error.code === '23505') {
        // Already on the list — still show success, no need to alarm them
        setSubmitted(true)
      } else {
        setNotifyError('Something went wrong. Please try again.')
      }
    } else {
      setSubmitted(true)
    }
    setNotifyLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #0F0C09; color: white; min-height: 100vh; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; position: relative; overflow: hidden; }
        .bg-glow { position: absolute; inset: 0; pointer-events: none; }
        .bg-glow::before { content: ''; position: absolute; top: -20%; left: -10%; width: 60%; height: 60%; background: radial-gradient(ellipse, rgba(244,96,26,0.12) 0%, transparent 70%); }
        .bg-glow::after { content: ''; position: absolute; bottom: -20%; right: -10%; width: 60%; height: 60%; background: radial-gradient(ellipse, rgba(26,110,244,0.1) 0%, transparent 70%); }
        .content { position: relative; z-index: 1; text-align: center; max-width: 560px; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 900; color: white; cursor: pointer; display: inline-block; margin-bottom: 48px; user-select: none; transition: opacity 0.2s; }
        .logo span { color: #F4601A; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(244,96,26,0.1); border: 1px solid rgba(244,96,26,0.25); border-radius: 100px; padding: 7px 18px; font-size: 0.72rem; font-weight: 700; color: #F4601A; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 28px; }
        h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.4rem, 6vw, 3.8rem); font-weight: 700; line-height: 1.1; letter-spacing: -1px; margin-bottom: 20px; }
        h1 em { font-style: italic; color: #F4601A; }
        .sub { font-size: 1rem; color: rgba(255,255,255,0.5); line-height: 1.8; margin-bottom: 40px; max-width: 420px; margin-left: auto; margin-right: auto; }
        .notify-form { display: flex; gap: 8px; max-width: 400px; margin: 0 auto 48px; }
        .notify-input { flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 13px 18px; font-size: 0.88rem; font-family: inherit; outline: none; color: white; transition: border 0.2s; }
        .notify-input::placeholder { color: rgba(255,255,255,0.3); }
        .notify-input:focus { border-color: rgba(244,96,26,0.5); }
        .notify-btn { background: #F4601A; border: none; border-radius: 12px; padding: 13px 24px; font-size: 0.88rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; white-space: nowrap; transition: background 0.18s; }
        .notify-btn:hover { background: #FF7A35; }
        .notify-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .success-msg { color: #4ade80; font-size: 0.9rem; margin-bottom: 40px; padding: 14px 20px; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2); border-radius: 12px; max-width: 400px; margin-left: auto; margin-right: auto; }
        .error-msg { color: #F87171; font-size: 0.82rem; margin-top: -36px; margin-bottom: 36px; }
        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 48px; }
        .feature { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; text-align: left; }
        .feature-icon { font-size: 1.4rem; margin-bottom: 10px; }
        .feature-title { font-size: 0.86rem; font-weight: 700; margin-bottom: 4px; }
        .feature-sub { font-size: 0.76rem; color: rgba(255,255,255,0.4); line-height: 1.6; }
        .social-links { display: flex; justify-content: center; gap: 16px; }
        .social-link { font-size: 0.78rem; color: rgba(255,255,255,0.35); text-decoration: none; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #1A1410; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; width: 100%; max-width: 380px; position: relative; }
        .modal-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.5); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1rem; }
        .modal-title { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: white; margin-bottom: 6px; }
        .modal-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-bottom: 24px; }
        .modal-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 13px 16px; font-size: 0.9rem; font-family: inherit; outline: none; color: white; margin-bottom: 12px; }
        .modal-input:focus { border-color: rgba(244,96,26,0.5); }
        .modal-btn { width: 100%; background: #F4601A; border: none; border-radius: 12px; padding: 13px; font-size: 0.9rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; }
        .modal-error { color: #F87171; font-size: 0.78rem; margin-bottom: 12px; }
        @media (max-width: 600px) { .features { grid-template-columns: 1fr; } .notify-form { flex-direction: column; } }
      `}</style>

      <div className="page">
        <div className="bg-glow" />
        <div className="content">
          <div className="logo" onClick={handleLogoClick}>
            Snap<span>Reserve™</span>
          </div>

          <div className="badge">🚀 Launching soon</div>

          <h1>Something <em>extraordinary</em><br/>is coming.</h1>

          <p className="sub">
            SnapReserve™ is building the future of travel booking — hotels, private stays, cars and experiences. All in one place. Industry-lowest fees. Launching in the US.
          </p>

          {!submitted ? (
            <>
              <form className="notify-form" onSubmit={handleNotify}>
                <input
                  className="notify-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button className="notify-btn" type="submit" disabled={notifyLoading}>
                  {notifyLoading ? '...' : 'Notify me'}
                </button>
              </form>
              {notifyError && <div className="error-msg">⚠️ {notifyError}</div>}
            </>
          ) : (
            <div className="success-msg">
              ✅ You're on the list! We'll notify you at launch.
            </div>
          )}

          <div className="features">
            <div className="feature">
              <div className="feature-icon">🏨</div>
              <div className="feature-title">Hotels & Private Stays</div>
              <div className="feature-sub">Curated properties across the US with verified hosts</div>
            </div>
            <div className="feature">
              <div className="feature-icon">💰</div>
              <div className="feature-title">3.2% Platform Fee</div>
              <div className="feature-sub">Industry-lowest fee so hosts keep more of what they earn</div>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Instant Booking</div>
              <div className="feature-sub">Book in seconds with no waiting for approval</div>
            </div>
          </div>

          <div className="social-links">
            <a href="https://x.com/snapreserve" className="social-link">X / Twitter</a>
            <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
            <a href="https://instagram.com/snapreserve" className="social-link">Instagram</a>
            <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
            <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.2)'}}>© 2026 SnapReserve™</span>
          </div>
        </div>
      </div>

      {showLogin && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowLogin(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowLogin(false)}>×</button>
            <div className="modal-title">Admin Access</div>
            <div className="modal-sub">Enter your password to preview the site</div>
            <form onSubmit={handleAdminLogin}>
              {error && <div className="modal-error">⚠️ {error}</div>}
              <input
                className="modal-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button className="modal-btn" type="submit" disabled={isPending}>
                {isPending ? 'Checking…' : 'Enter site →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}