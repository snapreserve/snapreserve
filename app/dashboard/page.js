'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function GuestDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
      // If already a host, send them to the host dashboard
      if (data?.is_host) { router.replace('/host/dashboard'); return }
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF8F5',fontFamily:'sans-serif'}}>
      <div style={{color:'#A89880',fontSize:'0.9rem'}}>Loading…</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#FAF8F5; color:#1A1410; }

        .topbar { background:white; border-bottom:1px solid #E8E2D9; padding:0 40px; height:64px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
        .logo { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:900; text-decoration:none; color:#1A1410; }
        .logo span { color:#F4601A; }
        .topbar-right { display:flex; align-items:center; gap:12px; }
        .avatar { width:36px; height:36px; border-radius:50%; background:#F4601A; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; color:white; }
        .logout-btn { background:none; border:1px solid #E8E2D9; border-radius:8px; padding:7px 14px; font-size:0.82rem; font-weight:600; color:#6B5F54; cursor:pointer; font-family:inherit; }
        .logout-btn:hover { border-color:#D4CEC5; color:#1A1410; }

        .page { max-width:960px; margin:0 auto; padding:48px 24px; }

        .greeting { margin-bottom:40px; }
        .greeting h1 { font-family:'Playfair Display',serif; font-size:2rem; font-weight:700; margin-bottom:6px; }
        .greeting p { font-size:0.92rem; color:#6B5F54; }

        /* HOST CTA */
        .host-cta { background:linear-gradient(135deg,#1A1410 0%,#2A1F18 100%); border-radius:20px; padding:40px 48px; display:flex; align-items:center; justify-content:space-between; gap:32px; margin-bottom:40px; overflow:hidden; position:relative; }
        .host-cta::before { content:''; position:absolute; top:-40px; right:-40px; width:200px; height:200px; background:radial-gradient(circle,rgba(244,96,26,0.25),transparent 70%); pointer-events:none; }
        .cta-text h2 { font-family:'Playfair Display',serif; font-size:1.6rem; font-weight:700; color:white; margin-bottom:10px; line-height:1.2; }
        .cta-text p { font-size:0.88rem; color:rgba(255,255,255,0.55); line-height:1.7; max-width:380px; }
        .cta-perks { display:flex; gap:20px; margin-top:16px; }
        .cta-perk { font-size:0.78rem; color:rgba(255,255,255,0.6); display:flex; align-items:center; gap:6px; }
        .cta-perk span { color:#F4601A; font-size:0.9rem; }
        .cta-btn { background:#F4601A; color:white; border:none; border-radius:14px; padding:15px 32px; font-size:0.94rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; flex-shrink:0; transition:all 0.2s; text-decoration:none; display:inline-block; }
        .cta-btn:hover { background:#FF7A35; transform:translateY(-1px); box-shadow:0 8px 24px rgba(244,96,26,0.35); }

        /* QUICK LINKS */
        .section-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#A89880; margin-bottom:16px; }
        .quick-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:40px; }
        .quick-card { background:white; border:1px solid #E8E2D9; border-radius:16px; padding:24px; text-decoration:none; color:inherit; transition:all 0.2s; }
        .quick-card:hover { border-color:#D4CEC5; transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.07); }
        .qc-icon { font-size:1.6rem; margin-bottom:12px; }
        .qc-title { font-size:0.92rem; font-weight:700; margin-bottom:4px; }
        .qc-sub { font-size:0.76rem; color:#A89880; }
        .qc-badge { display:inline-block; background:#F3F0EB; border-radius:100px; padding:2px 10px; font-size:0.68rem; font-weight:700; color:#A89880; margin-top:8px; }

        @media(max-width:768px) { .host-cta{flex-direction:column;padding:28px;} .quick-grid{grid-template-columns:1fr 1fr;} .cta-btn{width:100%;text-align:center;} .page{padding:28px 16px;} }
        @media(max-width:480px) { .quick-grid{grid-template-columns:1fr;} }
      `}</style>

      <div className="topbar">
        <a href="/" className="logo">Snap<span>Reserve</span></a>
        <div className="topbar-right">
          <div className="avatar">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?'}
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div className="page">
        <div className="greeting">
          <h1>Welcome, {firstName} 👋</h1>
          <p>You're all set to explore and book stays on SnapReserve.</p>
        </div>

        {/* BECOME A HOST CTA */}
        <div className="host-cta">
          <div className="cta-text">
            <h2>Turn your space into income.</h2>
            <p>List your property on SnapReserve and earn money hosting travellers. You set the price, the rules, and the schedule.</p>
            <div className="cta-perks">
              <div className="cta-perk"><span>✦</span> Industry-lowest 3.2% fee</div>
              <div className="cta-perk"><span>✦</span> Instant payouts</div>
              <div className="cta-perk"><span>✦</span> You're in control</div>
            </div>
          </div>
          <a href="/become-a-host" className="cta-btn">List your property →</a>
        </div>

        {/* QUICK LINKS */}
        <div className="section-title">Your account</div>
        <div className="quick-grid">
          <a href="/account/trips" className="quick-card">
            <div className="qc-icon">🧳</div>
            <div className="qc-title">My trips</div>
            <div className="qc-sub">View and manage your upcoming and past bookings</div>
          </a>
          <a href="/account/saved" className="quick-card">
            <div className="qc-icon">❤️</div>
            <div className="qc-title">Saved places</div>
            <div className="qc-sub">Properties you've liked and want to revisit</div>
          </a>
          <a href="/account/messages" className="quick-card">
            <div className="qc-icon">💬</div>
            <div className="qc-title">Messages</div>
            <div className="qc-sub">Chat with hosts about your stays</div>
          </a>
        </div>

        <div style={{textAlign:'center',paddingTop:'8px'}}>
          <a href="/" style={{fontSize:'0.82rem',color:'#A89880',textDecoration:'none'}}>← Browse properties</a>
        </div>
      </div>
    </>
  )
}
