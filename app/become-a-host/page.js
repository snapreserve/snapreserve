'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function BecomeAHostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?next=/become-a-host'); return }

    const res = await fetch('/api/become-host', { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/host/dashboard')
  }

  const perks = [
    { icon: '💰', title: 'Earn extra income', body: 'Set your own price and earn on your schedule. Hosts on SnapReserve earn an average of $1,200/month.' },
    { icon: '🛡️', title: 'You\'re protected', body: 'Every booking comes with SnapGuarantee — damage protection and secure payments handled for you.' },
    { icon: '⚡', title: 'Industry-lowest fees', body: 'We charge just 3.2% — far less than any competitor — so you keep more of what you earn.' },
    { icon: '🗓️', title: 'Full control', body: 'You decide when you\'re available, who can book, and what the rules are. Cancel any time.' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#FAF8F5; color:#1A1410; }

        .topbar { background:white; border-bottom:1px solid #E8E2D9; padding:0 40px; height:64px; display:flex; align-items:center; justify-content:space-between; }
        .logo { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:900; text-decoration:none; color:#1A1410; }
        .logo span { color:#F4601A; }
        .back-link { font-size:0.84rem; color:#6B5F54; text-decoration:none; }
        .back-link:hover { color:#1A1410; }

        .hero { text-align:center; padding:72px 24px 56px; max-width:700px; margin:0 auto; }
        .eyebrow { font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.14em; color:#F4601A; margin-bottom:20px; }
        .hero h1 { font-family:'Playfair Display',serif; font-size:clamp(2.4rem,5vw,3.6rem); font-weight:900; line-height:1.1; letter-spacing:-1.5px; margin-bottom:20px; }
        .hero h1 em { font-style:italic; color:#F4601A; }
        .hero p { font-size:1rem; color:#6B5F54; line-height:1.8; margin-bottom:36px; max-width:480px; margin-left:auto; margin-right:auto; }

        .start-btn { background:linear-gradient(135deg,#F4601A,#FF7A35); color:white; border:none; border-radius:14px; padding:17px 44px; font-size:1rem; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s; display:inline-flex; align-items:center; gap:10px; }
        .start-btn:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(244,96,26,0.35); }
        .start-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .no-commitment { font-size:0.76rem; color:#A89880; margin-top:14px; }

        .error-box { background:rgba(220,38,38,0.06); border:1px solid rgba(220,38,38,0.15); border-radius:10px; padding:10px 16px; font-size:0.82rem; color:#DC2626; margin-top:16px; display:inline-block; }

        .perks { max-width:900px; margin:0 auto; padding:0 24px 80px; display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
        .perk { background:white; border:1px solid #E8E2D9; border-radius:18px; padding:28px; }
        .perk-icon { font-size:1.8rem; margin-bottom:14px; }
        .perk-title { font-size:1rem; font-weight:700; margin-bottom:8px; }
        .perk-body { font-size:0.84rem; color:#6B5F54; line-height:1.7; }

        .steps { background:white; border-top:1px solid #E8E2D9; border-bottom:1px solid #E8E2D9; padding:48px 24px; margin-bottom:48px; }
        .steps-inner { max-width:700px; margin:0 auto; }
        .steps-title { font-family:'Playfair Display',serif; font-size:1.4rem; font-weight:700; text-align:center; margin-bottom:32px; }
        .steps-list { display:flex; gap:0; }
        .step { flex:1; text-align:center; position:relative; }
        .step:not(:last-child)::after { content:''; position:absolute; top:20px; left:50%; width:100%; height:2px; background:#E8E2D9; z-index:0; }
        .step-num { width:40px; height:40px; border-radius:50%; background:#F4601A; color:white; font-weight:800; font-size:0.9rem; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; position:relative; z-index:1; }
        .step-label { font-size:0.82rem; font-weight:600; color:#1A1410; }
        .step-sub { font-size:0.72rem; color:#A89880; margin-top:3px; }

        @media(max-width:640px) { .perks{grid-template-columns:1fr;} .steps-list{flex-direction:column;gap:24px;} .step::after{display:none;} }
      `}</style>

      <div className="topbar">
        <a href="/" className="logo">Snap<span>Reserve</span></a>
        <a href="/dashboard" className="back-link">← Back to dashboard</a>
      </div>

      <div className="hero">
        <div className="eyebrow">Become a Host</div>
        <h1>Earn money sharing your<br/><em>space</em> with the world.</h1>
        <p>Join thousands of hosts on SnapReserve. List in minutes, get bookings fast, and keep 96.8% of everything you earn.</p>
        <button className="start-btn" onClick={handleStart} disabled={loading}>
          {loading ? 'Setting up your account…' : 'Get started for free →'}
        </button>
        <div className="no-commitment">No commitment. You can stop hosting any time.</div>
        {error && <div className="error-box">⚠️ {error}</div>}
      </div>

      <div className="steps">
        <div className="steps-inner">
          <div className="steps-title">It takes about 10 minutes</div>
          <div className="steps-list">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-label">Tell us about your place</div>
              <div className="step-sub">Type, location, basics</div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-label">Add photos & details</div>
              <div className="step-sub">Amenities, rules, pricing</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-label">Publish & get booked</div>
              <div className="step-sub">Review takes ~24 hours</div>
            </div>
          </div>
        </div>
      </div>

      <div className="perks">
        {perks.map(p => (
          <div key={p.title} className="perk">
            <div className="perk-icon">{p.icon}</div>
            <div className="perk-title">{p.title}</div>
            <div className="perk-body">{p.body}</div>
          </div>
        ))}
      </div>
    </>
  )
}
