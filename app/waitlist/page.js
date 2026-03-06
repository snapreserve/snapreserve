'use client'
import { useState, useEffect, useRef } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --orange:    #E8622A;
    --orange-lt: #F07D4A;
    --orange-dk: #C4501F;
    --bg:        #0D0D0D;
    --bg2:       #141414;
    --bg3:       #1C1C1C;
    --border:    rgba(255,255,255,0.08);
    --text:      #F0EDE8;
    --muted:     #888580;
    --card:      rgba(255,255,255,0.035);
    --radius:    14px;
    --tr:        0.22s cubic-bezier(.4,0,.2,1);
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-weight: 400;
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── NAV ── */
  .wl-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 40px;
    background: linear-gradient(to bottom, rgba(13,13,13,0.95), transparent);
    backdrop-filter: blur(12px);
  }
  .wl-logo {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600; font-size: 1.1rem; letter-spacing: -0.02em;
    color: var(--text); text-decoration: none;
  }
  .wl-logo span { color: var(--orange); }
  .wl-nav-link {
    font-size: 0.85rem; color: var(--muted); text-decoration: none;
    transition: color var(--tr); letter-spacing: 0.01em;
  }
  .wl-nav-link:hover { color: var(--text); }

  /* ── HERO ── */
  .wl-hero {
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: 120px 24px 80px;
    position: relative; overflow: hidden;
  }
  .wl-hero::before {
    content: '';
    position: absolute; top: -10%; left: 50%; transform: translateX(-50%);
    width: 800px; height: 600px;
    background: radial-gradient(ellipse at center, rgba(232,98,42,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .wl-hero::after {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    pointer-events: none;
  }
  .wl-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px;
    background: rgba(232,98,42,0.15); border: 1px solid rgba(232,98,42,0.3);
    border-radius: 100px;
    font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--orange-lt);
    margin-bottom: 32px; position: relative; z-index: 1;
    animation: wlFadeUp 0.6s ease both;
  }
  .wl-badge-dot {
    width: 6px; height: 6px; background: var(--orange); border-radius: 50%;
    animation: wlPulse 2s ease infinite;
  }
  @keyframes wlPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.4); }
  }
  .wl-hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2.8rem, 6vw, 5rem);
    font-weight: 700; line-height: 1.08; letter-spacing: -0.025em;
    margin-bottom: 8px; position: relative; z-index: 1;
    animation: wlFadeUp 0.7s 0.1s ease both;
  }
  .wl-hero h1 em { font-style: italic; color: var(--orange); }
  .wl-hero-sub {
    max-width: 560px; font-size: 1.05rem; color: var(--muted);
    line-height: 1.7; margin: 20px auto 36px;
    position: relative; z-index: 1;
    animation: wlFadeUp 0.7s 0.2s ease both;
  }
  .wl-hero-sub strong { color: var(--text); font-weight: 500; }

  .wl-spot-counter {
    display: inline-flex; align-items: center; gap: 16px;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 100px; padding: 10px 20px;
    margin-bottom: 40px; position: relative; z-index: 1;
    animation: wlFadeUp 0.7s 0.3s ease both;
  }
  .wl-counter-label { font-size: 0.8rem; color: var(--muted); letter-spacing: 0.03em; }
  .wl-counter-number {
    font-family: 'DM Mono', monospace;
    font-size: 1rem; font-weight: 500; color: var(--orange-lt);
  }
  .wl-counter-bar {
    width: 120px; height: 4px;
    background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden;
  }
  .wl-counter-fill {
    height: 100%; background: linear-gradient(90deg, var(--orange-dk), var(--orange));
    border-radius: 100px; transition: width 1.5s cubic-bezier(.4,0,.2,1);
  }

  .wl-hero-ctas {
    display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
    position: relative; z-index: 1;
    animation: wlFadeUp 0.7s 0.4s ease both;
  }
  .wl-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 28px; background: var(--orange); color: #fff;
    border: none; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
    cursor: pointer; text-decoration: none;
    transition: background var(--tr), transform var(--tr), box-shadow var(--tr);
    box-shadow: 0 4px 20px rgba(232,98,42,0.3);
  }
  .wl-btn-primary:hover {
    background: var(--orange-lt); transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(232,98,42,0.4);
  }
  .wl-btn-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 28px; background: transparent; color: var(--muted);
    border: 1px solid var(--border); border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500;
    cursor: pointer; text-decoration: none;
    transition: border-color var(--tr), color var(--tr), transform var(--tr);
  }
  .wl-btn-secondary:hover {
    border-color: rgba(255,255,255,0.2); color: var(--text); transform: translateY(-2px);
  }

  .wl-waiters {
    display: flex; align-items: center; gap: 10px;
    margin-top: 28px; font-size: 0.82rem; color: var(--muted);
    position: relative; z-index: 1;
    animation: wlFadeUp 0.7s 0.5s ease both;
  }
  .wl-avatar-stack { display: flex; }
  .wl-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--bg); margin-left: -8px;
    background: linear-gradient(135deg, var(--orange-dk), #7c3a1e);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700; color: #fff;
  }
  .wl-avatar:first-child { margin-left: 0; }

  @keyframes wlFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── SECTION ── */
  .wl-section {
    max-width: 700px; margin: 0 auto; padding: 80px 24px;
  }
  .wl-section-label {
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 16px;
  }
  .wl-section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.8rem, 3.5vw, 2.5rem);
    font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 12px;
  }
  .wl-section-sub {
    font-size: 0.95rem; color: var(--muted); line-height: 1.7; margin-bottom: 36px;
  }

  /* ── FORM CARD ── */
  .wl-form-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 20px; padding: 36px;
    position: relative; overflow: hidden;
  }
  .wl-form-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(232,98,42,0.4), transparent);
  }

  /* Interest toggle */
  .wl-interest-label {
    font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 14px;
  }
  .wl-interest-toggle {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 32px;
  }
  .wl-toggle-btn {
    padding: 12px 8px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: 10px; color: var(--muted);
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
    cursor: pointer; transition: all var(--tr); text-align: center;
  }
  .wl-toggle-btn:hover { border-color: rgba(232,98,42,0.35); color: var(--text); }
  .wl-toggle-btn.active {
    background: rgba(232,98,42,0.12); border-color: rgba(232,98,42,0.5);
    color: var(--orange-lt); font-weight: 600;
  }

  /* Form fields */
  .wl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .wl-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .wl-field label {
    font-size: 0.75rem; font-weight: 600; letter-spacing: 0.07em;
    text-transform: uppercase; color: var(--muted);
  }
  .wl-input, .wl-select {
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 16px;
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.92rem;
    outline: none; transition: border-color var(--tr), background var(--tr);
    width: 100%; appearance: none;
  }
  .wl-input::placeholder { color: rgba(255,255,255,0.2); }
  .wl-input:focus, .wl-select:focus {
    border-color: rgba(232,98,42,0.5); background: rgba(232,98,42,0.05);
  }
  .wl-select option { background: #1C1C1C; }

  .wl-host-badge-row {
    display: flex; align-items: center; gap: 10px;
    background: rgba(232,98,42,0.08); border: 1px solid rgba(232,98,42,0.2);
    border-radius: 10px; padding: 12px 16px;
    margin-bottom: 20px; font-size: 0.82rem; color: var(--orange-lt);
  }

  .wl-submit {
    width: 100%; padding: 16px; background: var(--orange); color: #fff;
    border: none; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700;
    cursor: pointer; letter-spacing: 0.01em;
    transition: background var(--tr), transform var(--tr), box-shadow var(--tr);
    box-shadow: 0 4px 20px rgba(232,98,42,0.25); margin-top: 8px;
  }
  .wl-submit:hover:not(:disabled) {
    background: var(--orange-lt); transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(232,98,42,0.35);
  }
  .wl-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .wl-submit-secondary {
    width: 100%; padding: 16px; background: transparent; color: var(--muted);
    border: 1px solid var(--border); border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 500;
    cursor: pointer; transition: all var(--tr); margin-top: 8px;
  }
  .wl-submit-secondary:hover:not(:disabled) {
    border-color: rgba(255,255,255,0.2); color: var(--text); transform: translateY(-1px);
  }
  .wl-submit-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

  .wl-legal {
    text-align: center; font-size: 0.75rem;
    color: rgba(255,255,255,0.25); margin-top: 14px; line-height: 1.5;
  }
  .wl-legal a { color: rgba(255,255,255,0.4); text-decoration: none; }

  .wl-error {
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 8px; padding: 10px 14px;
    font-size: 0.82rem; color: #FCA5A5; margin-bottom: 16px;
  }

  .wl-price-note {
    font-size: 0.72rem; color: rgba(255,255,255,0.3); line-height: 1.6;
    margin-bottom: 14px; padding: 10px 14px;
    background: rgba(255,255,255,0.03); border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.06);
  }

  /* Success */
  .wl-success-state { text-align: center; padding: 20px 0; }
  .wl-success-icon { font-size: 3rem; margin-bottom: 16px; display: block; }
  .wl-success-title {
    font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-bottom: 8px;
  }
  .wl-success-sub { font-size: 0.9rem; color: var(--muted); margin-bottom: 20px; }
  .wl-refcode-box {
    background: rgba(232,98,42,0.08); border: 1px solid rgba(232,98,42,0.2);
    border-radius: 12px; padding: 16px 20px; margin: 16px 0; text-align: center;
  }
  .wl-refcode-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .wl-refcode { font-family: 'DM Mono', monospace; font-size: 1.2rem; font-weight: 500; color: var(--orange-lt); margin-bottom: 10px; }
  .wl-copy-btn {
    background: var(--orange); color: #fff; border: none; border-radius: 6px;
    padding: 6px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: background var(--tr);
  }
  .wl-copy-btn:hover { background: var(--orange-lt); }
  .wl-position { font-size: 0.85rem; color: var(--muted); }
  .wl-position strong { color: var(--orange-lt); }

  /* Divider */
  .wl-divider { height: 1px; background: var(--border); max-width: 700px; margin: 0 auto; }

  /* ── FOUNDER SECTION ── */
  .wl-founder {
    max-width: 900px; margin: 0 auto; padding: 80px 24px; text-align: center;
  }
  .wl-perks-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px; margin: 40px 0; text-align: left;
  }
  .wl-perk-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 24px;
    transition: border-color var(--tr), transform var(--tr);
    position: relative; overflow: hidden;
  }
  .wl-perk-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--orange-dk), var(--orange));
    opacity: 0; transition: opacity var(--tr);
  }
  .wl-perk-card:hover { border-color: rgba(232,98,42,0.25); transform: translateY(-3px); }
  .wl-perk-card:hover::before { opacity: 1; }
  .wl-perk-icon { font-size: 1.4rem; margin-bottom: 14px; display: block; }
  .wl-perk-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; color: var(--text); }
  .wl-perk-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.5; }

  .wl-badge-visual {
    display: inline-flex; flex-direction: column; align-items: center; gap: 8px;
    background: linear-gradient(135deg, rgba(232,98,42,0.15), rgba(196,80,31,0.08));
    border: 1px solid rgba(232,98,42,0.3); border-radius: 20px;
    padding: 28px 40px; margin: 0 auto 40px; position: relative; overflow: hidden;
  }
  .wl-badge-visual::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, rgba(232,98,42,0.06), transparent 70%);
  }
  .wl-badge-icon { font-size: 2.8rem; }
  .wl-badge-text {
    font-family: 'DM Mono', monospace; font-size: 0.78rem; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--orange-lt);
  }
  .wl-badge-name {
    font-family: 'Playfair Display', serif; font-size: 1.1rem;
    font-weight: 700; color: var(--text);
  }

  .wl-fee-highlight {
    display: inline-flex; align-items: center; gap: 24px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: 14px; padding: 20px 32px; margin: 20px 0 0;
  }
  .wl-fee-item { text-align: center; }
  .wl-fee-number {
    font-family: 'DM Mono', monospace; font-size: 1.8rem; font-weight: 500;
    color: var(--orange); display: block; line-height: 1; margin-bottom: 4px;
  }
  .wl-fee-label { font-size: 0.72rem; color: var(--muted); letter-spacing: 0.05em; }
  .wl-fee-divider { width: 1px; height: 40px; background: var(--border); }

  /* ── GLOBAL SECTION ── */
  .wl-global { max-width: 700px; margin: 0 auto; padding: 80px 24px; }
  .wl-globe-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
  .wl-globe-icon {
    width: 44px; height: 44px; background: rgba(255,255,255,0.04);
    border: 1px solid var(--border); border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem; flex-shrink: 0;
  }

  /* ── FEATURES BAR ── */
  .wl-features-bar {
    max-width: 900px; margin: 0 auto; padding: 60px 24px 80px;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 32px; text-align: center;
    border-top: 1px solid var(--border);
  }
  .wl-feat-icon { font-size: 1.5rem; margin-bottom: 10px; display: block; }
  .wl-feat-title { font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; }
  .wl-feat-desc { font-size: 0.78rem; color: var(--muted); line-height: 1.5; }

  /* ── FOOTER ── */
  .wl-footer {
    text-align: center; padding: 32px 24px;
    font-size: 0.75rem; color: rgba(255,255,255,0.2);
    border-top: 1px solid var(--border);
  }
  .wl-footer span { color: var(--orange); opacity: 0.7; }
  .wl-footer a { color: inherit; text-decoration: none; }

  /* ── MOBILE ── */
  @media (max-width: 600px) {
    .wl-nav { padding: 16px 20px; }
    .wl-row { grid-template-columns: 1fr; }
    .wl-interest-toggle { grid-template-columns: 1fr; }
    .wl-form-card { padding: 24px 20px; }
    .wl-fee-highlight { flex-direction: column; gap: 12px; padding: 20px; }
    .wl-fee-divider { width: 40px; height: 1px; }
    .wl-perks-grid { grid-template-columns: 1fr 1fr; }
  }
`

const COUNTRIES = [
  'Canada','United Kingdom','Australia','Germany','France','Netherlands','Spain','Italy',
  'Portugal','Sweden','Norway','Denmark','Switzerland','Austria','Belgium','Ireland',
  'New Zealand','Singapore','Japan','South Korea','UAE','Saudi Arabia','India','Brazil',
  'Mexico','Argentina','Colombia','Chile','South Africa','Nigeria','Kenya','Ghana',
  'Egypt','Israel','Turkey','Poland','Czech Republic','Hungary','Romania','Greece','Other',
]

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

export default function WaitlistPage() {
  const [count, setCount]                 = useState(null)
  const [intlEnabled, setIntlEnabled]     = useState(false)
  const [activeTab, setActiveTab]         = useState('host') // host | guest | both

  // Main form
  const [hostForm, setHostForm]           = useState({ first_name: '', last_name: '', email: '', city: '', state: '', property_type: '' })
  const [guestForm, setGuestForm]         = useState({ first_name: '', last_name: '', email: '', country: '' })
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(null)
  const [copied, setCopied]               = useState(false)

  // International form
  const [intlForm, setIntlForm]           = useState({ email: '', country: '', role: 'guest' })
  const [intlLoading, setIntlLoading]     = useState(false)
  const [intlError, setIntlError]         = useState('')
  const [intlSuccess, setIntlSuccess]     = useState(false)

  // Counter animation
  const [counterWidth, setCounterWidth]   = useState(0)
  const fillRef                           = useRef(null)

  useEffect(() => {
    fetch('/api/waitlist-v2/count')
      .then(r => r.json())
      .then(d => { if (d.count != null) setCount(d.count) })
      .catch(() => {})
    fetch('/api/waitlist-v2/config')
      .then(r => r.json())
      .then(d => { if (d.intl_leads_enabled) setIntlEnabled(true) })
      .catch(() => {})
    // Animate counter fill
    setTimeout(() => setCounterWidth(84.2), 400)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const isHost = activeTab === 'host' || activeTab === 'both'
      const payload = isHost
        ? {
            first_name: hostForm.first_name,
            last_name:  hostForm.last_name,
            email:      hostForm.email,
            city:       hostForm.city,
            role:       activeTab === 'both' ? 'Host & Guest traveler' : 'Property owner',
            interest:   hostForm.property_type ? `List my property (${hostForm.property_type})` : 'List my property',
          }
        : {
            first_name: guestForm.first_name,
            last_name:  guestForm.last_name,
            email:      guestForm.email,
            city:       guestForm.country,
            role:       'Guest traveler',
            interest:   'Book unique stays',
          }
      const res  = await fetch('/api/waitlist-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  async function handleIntlSubmit(e) {
    e.preventDefault()
    setIntlLoading(true)
    setIntlError('')
    try {
      const res  = await fetch('/api/waitlist-v2/international', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intlForm),
      })
      const data = await res.json()
      if (!res.ok && !data.already_registered) throw new Error(data.error ?? 'Something went wrong')
      setIntlSuccess(true)
    } catch (err) {
      setIntlError(err.message)
    } finally {
      setIntlLoading(false)
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

  const spotsUsed  = count ?? 158
  const spotsTotal = 1000
  const fillPct    = Math.min((spotsUsed / spotsTotal) * 100, 100)

  return (
    <>
      <style>{STYLES}</style>

      {/* NAV */}
      <nav className="wl-nav">
        <a href="/home" className="wl-logo">Snap<span>Reserve</span>™</a>
        <a href="/login" className="wl-nav-link">Already have an account? Sign in →</a>
      </nav>

      {/* HERO */}
      <div className="wl-hero">
        <div className="wl-hero-badge">
          <span className="wl-badge-dot" />
          Limited Founder Access — United States
        </div>

        <h1>Travel &amp; Hosting,<br /><em>Reimagined.</em></h1>

        <p className="wl-hero-sub">
          SnapReserve is launching in the United States first with a <strong>limited Founder Host program</strong> for early US hosts.
          As SnapReserve expands globally, additional Founder Host programs will open in new regions for early hosts in those markets.
        </p>

        <div className="wl-spot-counter">
          <div className="wl-counter-label">Founder spots claimed</div>
          <div className="wl-counter-number">{spotsUsed.toLocaleString()} / {spotsTotal.toLocaleString()}</div>
          <div className="wl-counter-bar">
            <div className="wl-counter-fill" style={{ width: `${counterWidth}%` }} />
          </div>
        </div>

        <div className="wl-hero-ctas">
          <a href="#waitlist" className="wl-btn-primary">⭐ Become a Founder Host</a>
          <a href="#waitlist" className="wl-btn-secondary" onClick={() => setActiveTab('guest')}>Join as Traveler →</a>
        </div>

        <div className="wl-waiters">
          <div className="wl-avatar-stack">
            {['JM','SA','TR','KL'].map((l, i) => (
              <div key={l} className="wl-avatar" style={{ background: ['#E8622A','#3B82F6','#8B5CF6','#10B981'][i] }}>{l}</div>
            ))}
          </div>
          <span>{spotsUsed.toLocaleString()} people already on the waitlist</span>
        </div>
      </div>

      {/* WAITLIST FORM */}
      <div className="wl-section" id="waitlist">
        <div className="wl-section-label">Step 1 of 2</div>
        <h2 className="wl-section-title">Claim your spot</h2>
        <p className="wl-section-sub">
          Select your role below. Hosts get priority access and founder perks. Travelers can join the general waitlist.
        </p>

        <div className="wl-form-card">
          {success ? (
            <div className="wl-success-state">
              <span className="wl-success-icon">🎉</span>
              <div className="wl-success-title">You're on the list!</div>
              <p className="wl-success-sub">
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
              <div className="wl-interest-label">What are you interested in?</div>
              <div className="wl-interest-toggle">
                {[
                  { key: 'host',  label: '🏠 Host my property' },
                  { key: 'guest', label: '🧳 Book stays' },
                  { key: 'both',  label: '✦ Both' },
                ].map(t => (
                  <button
                    key={t.key}
                    className={`wl-toggle-btn${activeTab === t.key ? ' active' : ''}`}
                    onClick={() => { setActiveTab(t.key); setError('') }}
                  >{t.label}</button>
                ))}
              </div>

              {error && <div className="wl-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                {/* HOST / BOTH form */}
                {(activeTab === 'host' || activeTab === 'both') && (
                  <>
                    <div className="wl-host-badge-row">
                      ⭐ <span>Eligible Founder Hosts receive the <strong>Founder Host Badge</strong> and founder platform pricing of 6.5% + $1 per booking.</span>
                    </div>
                    <div className="wl-row">
                      <div className="wl-field">
                        <label>First Name</label>
                        <input className="wl-input" type="text" placeholder="Jane" required
                          value={hostForm.first_name}
                          onChange={e => setHostForm(f => ({ ...f, first_name: e.target.value }))} />
                      </div>
                      <div className="wl-field">
                        <label>Last Name</label>
                        <input className="wl-input" type="text" placeholder="Smith" required
                          value={hostForm.last_name}
                          onChange={e => setHostForm(f => ({ ...f, last_name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="wl-field">
                      <label>Email Address</label>
                      <input className="wl-input" type="email" placeholder="jane@example.com" required
                        value={hostForm.email}
                        onChange={e => setHostForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="wl-row">
                      <div className="wl-field">
                        <label>City</label>
                        <input className="wl-input" type="text" placeholder="New York"
                          value={hostForm.city}
                          onChange={e => setHostForm(f => ({ ...f, city: e.target.value }))} />
                      </div>
                      <div className="wl-field">
                        <label>State</label>
                        <select className="wl-select"
                          value={hostForm.state}
                          onChange={e => setHostForm(f => ({ ...f, state: e.target.value }))}>
                          <option value="" disabled>Select state...</option>
                          {US_STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="wl-field">
                      <label>Property Type</label>
                      <select className="wl-select"
                        value={hostForm.property_type}
                        onChange={e => setHostForm(f => ({ ...f, property_type: e.target.value }))}>
                        <option value="" disabled>Select property type...</option>
                        <option>🏨 Hotel</option>
                        <option>🏠 House</option>
                        <option>🏢 Apartment</option>
                        <option>🛖 Cabin / Unique Stay</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <p className="wl-price-note">
                      Founder pricing currently includes a SnapReserve platform fee of 6.5% + $1 per booking. Payment processing fees may apply separately. Pricing, features, and terms may change over time.
                    </p>
                    <button type="submit" className="wl-submit" disabled={loading}>
                      {loading ? 'Joining...' : activeTab === 'both' ? '⭐ Join Waitlist →' : '⭐ Join Host Waitlist →'}
                    </button>
                  </>
                )}

                {/* GUEST form */}
                {activeTab === 'guest' && (
                  <>
                    <div className="wl-row">
                      <div className="wl-field">
                        <label>First Name</label>
                        <input className="wl-input" type="text" placeholder="Alex" required
                          value={guestForm.first_name}
                          onChange={e => setGuestForm(f => ({ ...f, first_name: e.target.value }))} />
                      </div>
                      <div className="wl-field">
                        <label>Last Name</label>
                        <input className="wl-input" type="text" placeholder="Johnson" required
                          value={guestForm.last_name}
                          onChange={e => setGuestForm(f => ({ ...f, last_name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="wl-field">
                      <label>Email Address</label>
                      <input className="wl-input" type="email" placeholder="alex@example.com" required
                        value={guestForm.email}
                        onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="wl-field">
                      <label>Country</label>
                      <select className="wl-select"
                        value={guestForm.country}
                        onChange={e => setGuestForm(f => ({ ...f, country: e.target.value }))}>
                        <option value="" disabled>Select country...</option>
                        <option>United States</option>
                        <option>Canada</option>
                        <option>United Kingdom</option>
                        <option>Australia</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <button type="submit" className="wl-submit-secondary" disabled={loading}>
                      {loading ? 'Joining...' : 'Join Traveler Waitlist →'}
                    </button>
                  </>
                )}

                <p className="wl-legal">
                  By submitting, you agree to SnapReserve's <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="wl-divider" />

      {/* FOUNDER PROGRAM */}
      <div className="wl-founder" id="founder">
        <div className="wl-section-label" style={{ textAlign: 'center' }}>Founder Program</div>
        <h2 className="wl-section-title">The SnapReserve<br />Founder Program</h2>
        <p className="wl-section-sub" style={{ maxWidth: 480, margin: '0 auto 40px' }}>
          The first 1,000 US hosts to join SnapReserve receive founding member status — with founder benefits available to early eligible hosts.
          As SnapReserve expands globally, additional Founder Host programs will open in new regions.
        </p>

        <div className="wl-badge-visual">
          <span className="wl-badge-icon">⭐</span>
          <span className="wl-badge-text">SnapReserve</span>
          <span className="wl-badge-name">Founder Host</span>
          <span className="wl-badge-text">#0001</span>
        </div>

        <div className="wl-fee-highlight">
          <div className="wl-fee-item">
            <span className="wl-fee-number">6.5%</span>
            <span className="wl-fee-label">Platform Fee<br />(Founder Pricing)</span>
          </div>
          <div className="wl-fee-divider" />
          <div className="wl-fee-item">
            <span className="wl-fee-number">$1</span>
            <span className="wl-fee-label">Per Booking<br />(Founder Pricing)</span>
          </div>
          <div className="wl-fee-divider" />
          <div className="wl-fee-item">
            <span className="wl-fee-number">1,000</span>
            <span className="wl-fee-label">Founder Spots<br />Total</span>
          </div>
        </div>

        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.6, marginTop: 16, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Founder pricing currently includes a SnapReserve platform fee of 6.5% + $1 per booking. Payment processing fees may apply separately. Pricing, features, and terms may change over time.
        </p>

        <div className="wl-perks-grid" style={{ marginTop: 40 }}>
          {[
            { icon: '⭐', title: 'Founder Badge', desc: 'A permanent verified badge on your host profile that signals trust and credibility to every traveler.' },
            { icon: '💰', title: 'Founder Pricing', desc: 'Eligible Founder Hosts may receive SnapReserve founder pricing of 6.5% + $1 per booking. Payment processing fees may apply separately.' },
            { icon: '🚀', title: 'Early Feature Access', desc: 'Be the first to test new host tools, analytics dashboards, and booking optimizations before public release.' },
            { icon: '🎯', title: 'Priority Support', desc: 'Skip the queue. Founder hosts get dedicated support channels with faster response times — always.' },
          ].map(p => (
            <div key={p.title} className="wl-perk-card">
              <span className="wl-perk-icon">{p.icon}</span>
              <div className="wl-perk-title">{p.title}</div>
              <div className="wl-perk-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wl-divider" />

      {/* GLOBAL WAITLIST */}
      {intlEnabled && (
        <div className="wl-global" id="global">
          <div className="wl-globe-header">
            <div className="wl-globe-icon">🌍</div>
            <div>
              <div className="wl-section-label" style={{ marginBottom: 4 }}>Global Waitlist</div>
              <h2 className="wl-section-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Outside the United States?</h2>
            </div>
          </div>

          <p className="wl-section-sub">
            SnapReserve will launch in the United States first. As new regions open, a limited number of Founder Host spots will become available for early hosts in those markets.
            Join the global waitlist and we'll notify you when SnapReserve becomes available in your country.
          </p>

          <div className="wl-form-card">
            {intlSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  You're on the international list!<br />We'll reach out when we launch in your country.
                </p>
              </div>
            ) : (
              <form onSubmit={handleIntlSubmit}>
                {intlError && <div className="wl-error">{intlError}</div>}
                <div className="wl-field">
                  <label>Email Address</label>
                  <input className="wl-input" type="email" placeholder="you@example.com" required
                    value={intlForm.email}
                    onChange={e => setIntlForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="wl-row">
                  <div className="wl-field" style={{ marginBottom: 0 }}>
                    <label>Country</label>
                    <select className="wl-select" required
                      value={intlForm.country}
                      onChange={e => setIntlForm(f => ({ ...f, country: e.target.value }))}>
                      <option value="">Select country…</option>
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="wl-field" style={{ marginBottom: 0 }}>
                    <label>I am a...</label>
                    <select className="wl-select"
                      value={intlForm.role}
                      onChange={e => setIntlForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="guest">🧳 Traveler</option>
                      <option value="host">🏠 Host</option>
                      <option value="both">✦ Both</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="wl-submit-secondary" style={{ marginTop: 16 }} disabled={intlLoading}>
                  {intlLoading ? 'Submitting…' : 'Join Global Waitlist →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FEATURES BAR */}
      <div className="wl-features-bar">
        {[
          { icon: '💎', title: 'Founding Member Rate', desc: 'Founder pricing: 6.5% + $1 per booking. Payment processing fees may apply separately.' },
          { icon: '🌐', title: '90+ Cities at Launch', desc: 'Launching across major US markets with global expansion to follow.' },
          { icon: '✅', title: 'Transparent Reviews', desc: 'Verified guest reviews you can actually trust — no manipulation.' },
          { icon: '⚡', title: 'Instant Confirmation', desc: 'Instant booking confirmation for hosts and travelers alike.' },
        ].map(f => (
          <div key={f.title}>
            <span className="wl-feat-icon">{f.icon}</span>
            <div className="wl-feat-title">{f.title}</div>
            <div className="wl-feat-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* DISCLAIMER */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.32)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28 }}>
          Founder pricing currently includes a SnapReserve platform fee of 6.5% + $1 per booking. Payment processing fees may apply separately. Pricing, features, and terms may change over time.
        </p>
      </div>

      {/* FOOTER */}
      <footer className="wl-footer">
        © {new Date().getFullYear()} <span>SnapReserve™</span>. All rights reserved. &nbsp;·&nbsp;
        <a href="/privacy">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="/terms">Terms of Service</a>
      </footer>
    </>
  )
}
