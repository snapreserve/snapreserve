'use client'
import { useState, useEffect } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'DM Sans', -apple-system, sans-serif;
    background: #0F0D0A;
    color: #F5F0EB;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── Layout ── */
  .wl-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .wl-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(15,13,10,0.88);
    backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(244,96,26,0.08);
    padding: 0 32px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .wl-logo {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: 1.2rem;
    color: #fff;
    text-decoration: none;
  }
  .wl-logo span { color: #F4601A; }
  .wl-signin {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(245,240,235,0.55);
    text-decoration: none;
    transition: color 0.18s;
  }
  .wl-signin:hover { color: #F4601A; }

  /* ── Hero ── */
  .wl-hero {
    position: relative;
    padding: 96px 32px 72px;
    text-align: center;
    overflow: hidden;
  }
  .wl-hero-glow-1 {
    position: absolute;
    width: 700px;
    height: 700px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(244,96,26,0.14) 0%, transparent 70%);
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .wl-hero-glow-2 {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(244,96,26,0.06) 0%, transparent 70%);
    bottom: -100px;
    right: -100px;
    pointer-events: none;
  }
  .wl-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(232,98,42,0.12);
    border: 1px solid rgba(244,96,26,0.3);
    border-radius: 100px;
    padding: 5px 14px;
    font-size: 0.72rem;
    font-weight: 800;
    color: #F4601A;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 28px;
  }
  .wl-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #F4601A;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  .wl-hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2.4rem, 6vw, 4.2rem);
    font-weight: 900;
    line-height: 1.1;
    color: #F5F0EB;
    margin-bottom: 20px;
    position: relative;
  }
  .wl-hero h1 em {
    font-style: italic;
    color: #F4601A;
  }
  .wl-hero p {
    font-size: 1.05rem;
    color: rgba(245,240,235,0.52);
    max-width: 520px;
    margin: 0 auto 40px;
    line-height: 1.7;
  }
  .wl-count {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    padding: 8px 20px;
    font-size: 0.85rem;
    color: rgba(245,240,235,0.6);
    margin-bottom: 60px;
    position: relative;
  }
  .wl-count strong {
    color: #F4601A;
    font-weight: 700;
  }
  .wl-avatars {
    display: flex;
  }
  .wl-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid #0F0D0A;
    margin-left: -6px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .wl-avatars .wl-avatar:first-child { margin-left: 0; }

  /* ── Form card ── */
  .wl-card {
    background: rgba(26,23,18,0.9);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    padding: 40px;
    max-width: 560px;
    margin: 0 auto;
    position: relative;
  }
  .wl-card-shine {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(244,96,26,0.3), transparent);
    border-radius: 20px 20px 0 0;
  }

  .wl-form-title {
    font-size: 1rem;
    font-weight: 700;
    color: #F5F0EB;
    margin-bottom: 4px;
  }
  .wl-form-sub {
    font-size: 0.8rem;
    color: rgba(245,240,235,0.4);
    margin-bottom: 24px;
  }

  .wl-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .wl-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  .wl-field label {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(245,240,235,0.55);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .wl-input, .wl-select {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 11px 14px;
    color: #F5F0EB;
    font-size: 0.88rem;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.18s, background 0.18s;
    width: 100%;
    -webkit-appearance: none;
  }
  .wl-input::placeholder { color: rgba(245,240,235,0.25); }
  .wl-input:focus, .wl-select:focus {
    border-color: rgba(244,96,26,0.6);
    background: rgba(244,96,26,0.04);
  }
  .wl-select option {
    background: #1A1712;
    color: #F5F0EB;
  }

  .wl-submit {
    width: 100%;
    background: linear-gradient(135deg, #F4601A, #d44e12);
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 14px;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.18s, transform 0.18s;
    letter-spacing: 0.01em;
  }
  .wl-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .wl-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .wl-legal {
    font-size: 0.72rem;
    color: rgba(245,240,235,0.28);
    text-align: center;
    margin-top: 14px;
    line-height: 1.6;
  }
  .wl-legal a { color: rgba(244,96,26,0.7); text-decoration: none; }

  /* ── Success state ── */
  .wl-success {
    text-align: center;
    padding: 8px 0;
  }
  .wl-success-icon {
    width: 56px;
    height: 56px;
    background: rgba(232,98,42,0.12);
    border: 2px solid rgba(244,96,26,0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin: 0 auto 20px;
  }
  .wl-success h3 {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #F5F0EB;
    margin-bottom: 8px;
  }
  .wl-success p {
    font-size: 0.85rem;
    color: rgba(245,240,235,0.5);
    margin-bottom: 24px;
    line-height: 1.65;
  }
  .wl-refcode-box {
    background: rgba(244,96,26,0.08);
    border: 1px solid rgba(244,96,26,0.25);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .wl-refcode-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(244,96,26,0.7);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .wl-refcode {
    font-size: 1.3rem;
    font-weight: 800;
    color: #F4601A;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
  }
  .wl-copy-btn {
    background: rgba(244,96,26,0.15);
    border: 1px solid rgba(244,96,26,0.3);
    border-radius: 8px;
    padding: 6px 16px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #F4601A;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.18s;
  }
  .wl-copy-btn:hover { background: rgba(244,96,26,0.25); }

  .wl-position {
    font-size: 0.82rem;
    color: rgba(245,240,235,0.4);
    margin-top: 8px;
  }
  .wl-position strong { color: #F5F0EB; }

  /* ── Error banner ── */
  .wl-error {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 0.83rem;
    color: #F87171;
    margin-bottom: 16px;
  }

  /* ── Features row ── */
  .wl-features {
    display: flex;
    justify-content: center;
    gap: 40px;
    padding: 48px 32px;
    flex-wrap: wrap;
  }
  .wl-feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }
  .wl-feature-icon {
    width: 44px;
    height: 44px;
    background: rgba(244,96,26,0.1);
    border: 1px solid rgba(244,96,26,0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }
  .wl-feature-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #F5F0EB;
  }
  .wl-feature-desc {
    font-size: 0.75rem;
    color: rgba(245,240,235,0.4);
    max-width: 160px;
  }

  /* ── Footer ── */
  .wl-footer {
    margin-top: auto;
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 24px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: rgba(245,240,235,0.25);
    flex-wrap: wrap;
    gap: 12px;
  }
  .wl-footer a { color: rgba(245,240,235,0.35); text-decoration: none; }
  .wl-footer a:hover { color: #F4601A; }

  @media (max-width: 600px) {
    .wl-hero { padding: 64px 20px 48px; }
    .wl-card { padding: 28px 20px; margin: 0 16px; }
    .wl-row { grid-template-columns: 1fr; }
    .wl-features { gap: 24px; }
    .wl-header { padding: 0 20px; }
  }
`

const ROLE_OPTIONS = ['Guest traveler', 'Property owner', 'Hotel manager', 'Travel agent', 'Corporate travel', 'Other']
const INTEREST_OPTIONS = ['Book unique stays', 'List my property', 'Team / corporate travel', 'Short-term rentals', 'All of the above']

export default function WaitlistPage() {
  const [count, setCount] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', city: '', role: '', interest: '', referred_by: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null) // { referral_code, position }
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/waitlist-v2/count')
      .then(r => r.json())
      .then(d => { if (d.count != null) setCount(d.count) })
      .catch(() => {})
  }, [])

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setSuccess(data)
      setCount(prev => prev != null ? prev + 1 : prev)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyCode(e) {
    e.preventDefault()
    if (!success?.referral_code) return
    navigator.clipboard.writeText(success.referral_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const displayCount = count != null ? count.toLocaleString() : '...'

  const avatarColors = ['#F4601A', '#3B82F6', '#8B5CF6', '#10B981']
  const avatarLetters = ['A', 'M', 'S', 'J']

  return (
    <>
      <style>{STYLES}</style>
      <div className="wl-root">

        {/* Header */}
        <header className="wl-header">
          <a href="/home" className="wl-logo">Snap<span>Reserve™</span></a>
          <a href="/login" className="wl-signin">Already have an account? Sign in →</a>
        </header>

        {/* Hero */}
        <section className="wl-hero">
          <div className="wl-hero-glow-1" />
          <div className="wl-hero-glow-2" />

          <div className="wl-badge">
            <span className="wl-badge-dot" />
            Limited early access
          </div>

          <h1>
            Travel &amp; hosting,<br />
            <em>reimagined.</em>
          </h1>

          <p>
            SnapReserve is building the most transparent booking platform ever made.
            Join the waitlist to get early access and founding-member perks. First 1,000 members lock in 6.5% platform fee + $1 per booking — for life.
          </p>

          <div className="wl-count">
            <div className="wl-avatars">
              {avatarLetters.map((l, i) => (
                <div key={l} className="wl-avatar" style={{ background: avatarColors[i] }}>{l}</div>
              ))}
            </div>
            <span><strong>{displayCount}</strong> people already waiting</span>
          </div>

          {/* Form card */}
          <div className="wl-card">
            <div className="wl-card-shine" />

            {success ? (
              <div className="wl-success">
                <div className="wl-success-icon">🎉</div>
                <h3>You're on the list!</h3>
                <p>
                  Welcome, {success.first_name}. We'll reach out as soon as your spot opens up.
                  Share your referral code to move up the queue.
                </p>
                <div className="wl-refcode-box">
                  <div className="wl-refcode-label">Your referral code</div>
                  <div className="wl-refcode">{success.referral_code}</div>
                  <button className="wl-copy-btn" onClick={copyCode}>
                    {copied ? '✓ Copied!' : 'Copy code'}
                  </button>
                </div>
                <div className="wl-position">
                  You're <strong>#{success.position}</strong> in line
                </div>
              </div>
            ) : (
              <>
                <div className="wl-form-title">Claim your spot</div>
                <div className="wl-form-sub">Takes 30 seconds. No credit card required.</div>

                {error && <div className="wl-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="wl-row">
                    <div className="wl-field">
                      <label>First name</label>
                      <input
                        className="wl-input"
                        type="text"
                        placeholder="Sarah"
                        required
                        value={form.first_name}
                        onChange={e => set('first_name', e.target.value)}
                      />
                    </div>
                    <div className="wl-field">
                      <label>Last name</label>
                      <input
                        className="wl-input"
                        type="text"
                        placeholder="Mitchell"
                        required
                        value={form.last_name}
                        onChange={e => set('last_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="wl-field">
                    <label>Email address</label>
                    <input
                      className="wl-input"
                      type="email"
                      placeholder="sarah@example.com"
                      required
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                    />
                  </div>

                  <div className="wl-row">
                    <div className="wl-field">
                      <label>City</label>
                      <input
                        className="wl-input"
                        type="text"
                        placeholder="Miami, FL"
                        value={form.city}
                        onChange={e => set('city', e.target.value)}
                      />
                    </div>
                    <div className="wl-field">
                      <label>I am a...</label>
                      <select
                        className="wl-select"
                        value={form.role}
                        onChange={e => set('role', e.target.value)}
                      >
                        <option value="">Select...</option>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="wl-field">
                    <label>I'm most interested in...</label>
                    <select
                      className="wl-select"
                      value={form.interest}
                      onChange={e => set('interest', e.target.value)}
                    >
                      <option value="">Select...</option>
                      {INTEREST_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>

                  <div className="wl-field">
                    <label>Referral code <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
                    <input
                      className="wl-input"
                      type="text"
                      placeholder="SNAP-AB-1234"
                      value={form.referred_by}
                      onChange={e => set('referred_by', e.target.value.toUpperCase())}
                    />
                  </div>

                  <button type="submit" className="wl-submit" disabled={loading}>
                    {loading ? 'Joining...' : 'Join the waitlist →'}
                  </button>
                </form>

                <div className="wl-legal">
                  By joining you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
                  We'll only email you about SnapReserve — no spam, ever.
                </div>
              </>
            )}
          </div>
        </section>

        {/* Features */}
        <div className="wl-features">
          {[
            { icon: '🏡', title: 'Founding member rate', desc: 'First 1,000 members lock in 6.5% + $1/booking' },
            { icon: '🌍', title: '90+ cities at launch', desc: 'Hotels, stays & experiences worldwide' },
            { icon: '⭐', title: 'Transparent reviews', desc: 'Honest, un-gamed ratings on every stay' },
            { icon: '⚡', title: 'Instant confirmation', desc: 'No waiting — book and go in minutes' },
          ].map(f => (
            <div key={f.title} className="wl-feature">
              <div className="wl-feature-icon">{f.icon}</div>
              <div className="wl-feature-title">{f.title}</div>
              <div className="wl-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="wl-footer">
          <div>© {new Date().getFullYear()} SnapReserve. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="/login">Sign in</a>
          </div>
        </footer>

      </div>
    </>
  )
}
