'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function fmt(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function relTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts)
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function daysUntil(d) {
  return Math.ceil((new Date(d + 'T12:00:00') - new Date()) / 86400000)
}
function nights(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)
}
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function statusCfg(s) {
  if (s === 'confirmed') return { bg: 'rgba(52,211,153,0.1)', color: '#34D399', border: 'rgba(52,211,153,0.3)', label: '✓ Confirmed' }
  if (s === 'completed') return { bg: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'rgba(96,165,250,0.3)', label: '✓ Completed' }
  if (s === 'pending')   return { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.3)', label: '⏳ Pending' }
  if (s === 'cancelled') return { bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.3)', label: '✗ Cancelled' }
  return { bg: 'rgba(107,94,82,0.1)', color: 'var(--sr-muted)', border: 'rgba(107,94,82,0.2)', label: s }
}

function SuspensionBanner() {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [show, setShow] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (text.trim().length < 20) { setErr('Please write at least 20 characters.'); return }
    setSending(true); setErr('')
    const res = await fetch('/api/appeals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appeal_text: text }) })
    const j = await res.json()
    setSending(false)
    if (!res.ok) { setErr(j.error ?? 'Failed to submit.'); return }
    setSent(true)
  }
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🚫</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#dc2626', marginBottom: 3 }}>Account suspended</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', lineHeight: 1.6, marginBottom: 9 }}>
          Your account is temporarily disabled. Contact <a href="mailto:support@snapreserve.app" style={{ color: 'var(--sr-orange)' }}>support@snapreserve.app</a>.
        </div>
        {!sent ? (!show
          ? <button onClick={() => setShow(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>⚖️ Submit appeal</button>
          : <form onSubmit={submit} style={{ maxWidth: 460 }}>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Explain your situation (min 20 chars)…" style={{ width: '100%', background: 'var(--sr-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 11px', fontSize: '0.8rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: 7, color: 'var(--sr-text)' }} />
              {err && <div style={{ color: '#dc2626', fontSize: '0.76rem', marginBottom: 6 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 7 }}>
                <button type="submit" disabled={sending} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>{sending ? 'Submitting…' : 'Submit'}</button>
                <button type="button" onClick={() => setShow(false)} style={{ background: 'transparent', border: '1px solid var(--sr-border2)', color: 'var(--sr-muted)', padding: '7px 13px', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>)
          : <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 7, padding: '8px 12px', fontSize: '0.78rem', color: '#34D399', fontWeight: 600 }}>✅ Appeal submitted. We'll respond by email shortly.</div>
        }
      </div>
    </div>
  )
}

const STYLES = `
  @keyframes pgFade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  .db-page { animation: pgFade .25s ease; }
  .db-wb { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:18px; padding:28px 32px; margin-bottom:20px; display:flex; align-items:center; gap:20px; position:relative; overflow:hidden; }
  .db-wb::before { content:''; position:absolute; top:-40px; right:-40px; width:200px; height:200px; border-radius:50%; background:rgba(244,96,26,0.06); pointer-events:none; }
  .db-wb-txt { position:relative; z-index:1; flex:1; }
  .db-wb-greet { font-size:0.75rem; font-weight:600; color:var(--sr-muted); margin-bottom:4px; }
  .db-wb-name { font-size:1.6rem; font-weight:800; color:var(--sr-text); line-height:1; margin-bottom:5px; letter-spacing:-0.02em; }
  .db-wb-sub { font-size:0.84rem; color:var(--sr-sub); }
  .db-wb-right { position:relative; z-index:1; display:flex; flex-direction:column; gap:8px; align-items:flex-end; flex-shrink:0; }
  .db-wb-badge { background:rgba(244,96,26,0.1); border:1px solid rgba(244,96,26,0.25); border-radius:100px; padding:5px 13px; font-size:0.75rem; font-weight:700; color:var(--sr-orange); }
  .db-wb-btn { padding:9px 20px; background:var(--sr-orange); color:#fff; border:none; border-radius:100px; font-family:inherit; font-size:0.82rem; font-weight:700; cursor:pointer; transition:opacity .15s; }
  .db-wb-btn:hover { opacity:0.88; }
  .db-hb { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:11px; padding:12px 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; }
  .db-hb-text { font-size:0.82rem; color:var(--sr-muted); }
  .db-hb-text strong { color:var(--sr-text); }
  .db-hb-link { font-size:0.78rem; font-weight:700; color:var(--sr-orange); text-decoration:none; padding:6px 14px; border-radius:100px; border:1px solid rgba(244,96,26,0.3); transition:background .14s; flex-shrink:0; }
  .db-hb-link:hover { background:rgba(244,96,26,0.08); }
  .db-g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .db-sc { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:14px; padding:18px; }
  .db-sc-lbl { font-size:0.68rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--sr-muted); margin-bottom:8px; }
  .db-sc-val { font-size:1.75rem; font-weight:800; color:var(--sr-text); line-height:1; margin-bottom:3px; }
  .db-sc-sub { font-size:0.72rem; color:var(--sr-sub); }
  .db-sec-title { font-size:1rem; font-weight:800; color:var(--sr-text); margin-bottom:13px; }
  .db-nth { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:16px; overflow:hidden; margin-bottom:24px; display:flex; }
  .db-nth-photo { width:220px; flex-shrink:0; position:relative; overflow:hidden; background:var(--sr-bg); display:flex; align-items:center; justify-content:center; font-size:56px; }
  .db-nth-photo img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
  .db-nth-body { flex:1; padding:24px 28px; display:flex; flex-direction:column; justify-content:space-between; }
  .db-nth-eyebrow { font-size:0.65rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:var(--sr-orange); margin-bottom:6px; }
  .db-nth-name { font-size:1.2rem; font-weight:800; color:var(--sr-text); line-height:1.15; margin-bottom:4px; }
  .db-nth-loc { font-size:0.78rem; color:var(--sr-muted); margin-bottom:14px; }
  .db-nth-details { display:flex; gap:20px; margin-bottom:14px; flex-wrap:wrap; }
  .db-nth-dl { font-size:0.65rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--sr-sub); }
  .db-nth-dv { font-size:0.84rem; font-weight:700; color:var(--sr-text); margin-top:2px; }
  .db-cd { display:flex; gap:8px; margin-bottom:4px; }
  .db-cd-item { text-align:center; background:var(--sr-bg); border:1px solid var(--sr-border2); border-radius:9px; padding:7px 10px; min-width:46px; }
  .db-cd-num { font-size:1.1rem; font-weight:800; color:var(--sr-orange); line-height:1; }
  .db-cd-lbl { font-size:0.58rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--sr-sub); margin-top:2px; }
  .db-nth-foot { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  .db-nth-btns { display:flex; gap:8px; }
  .db-btn-ghost { padding:7px 14px; border-radius:8px; font-family:inherit; font-size:0.78rem; font-weight:600; cursor:pointer; background:transparent; color:var(--sr-muted); border:1px solid var(--sr-border2); transition:all .14s; text-decoration:none; display:inline-flex; align-items:center; }
  .db-btn-ghost:hover { border-color:var(--sr-orange); color:var(--sr-orange); }
  .db-btn-pri { padding:7px 16px; border-radius:8px; font-family:inherit; font-size:0.78rem; font-weight:700; cursor:pointer; background:var(--sr-orange); color:#fff; border:none; transition:opacity .14s; text-decoration:none; display:inline-flex; align-items:center; }
  .db-btn-pri:hover { opacity:0.88; }
  .db-ql { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .db-ql-card { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:13px; padding:18px; cursor:pointer; transition:all .18s; text-align:center; text-decoration:none; display:block; }
  .db-ql-card:hover { border-color:var(--sr-orange); transform:translateY(-2px); box-shadow:0 6px 20px rgba(244,96,26,0.1); }
  .db-ql-icon { font-size:1.6rem; margin-bottom:8px; display:block; }
  .db-ql-label { font-size:0.84rem; font-weight:700; color:var(--sr-text); margin-bottom:3px; }
  .db-ql-sub { font-size:0.72rem; color:var(--sr-sub); }
  .db-activity { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:14px; padding:20px; }
  .db-al-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid var(--sr-border2); }
  .db-al-item:last-child { border:none; padding-bottom:0; }
  .db-al-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0; background:var(--sr-bg); }
  .db-al-title { font-size:0.84rem; font-weight:600; color:var(--sr-text); margin-bottom:2px; }
  .db-al-sub { font-size:0.72rem; color:var(--sr-muted); line-height:1.4; }
  .db-al-time { font-size:0.7rem; color:var(--sr-sub); flex-shrink:0; margin-left:auto; }
  @media(max-width:900px) { .db-g4,.db-ql { grid-template-columns:repeat(2,1fr); } .db-nth { flex-direction:column; } .db-nth-photo { width:100%; height:160px; } }
  @media(max-width:560px) { .db-g4 { grid-template-columns:1fr 1fr; } .db-ql { grid-template-columns:1fr 1fr; } }
`

export default function DashboardPage() {
  const router = useRouter()
  const [profile,  setProfile]  = useState(null)
  const [bookings, setBookings] = useState([])
  const [saved,    setSaved]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [cd,       setCd]       = useState({ d: 0, h: 0, m: 0 })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?next=/dashboard'); return }
    const [{ data: prof }, { data: bks }, { data: svd }] = await Promise.all([
      supabase.from('users').select('full_name,email,avatar_url,user_role,is_host,suspended_at,is_active').eq('id', user.id).maybeSingle(),
      supabase.from('bookings').select('*,listings(id,title,city,state,property_type,images,price_per_night)').eq('guest_id', user.id).order('check_in', { ascending: true }),
      supabase.from('saved_listings').select('id,created_at,listing_id,listings(title,city,state)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])
    setProfile(prof)
    setBookings(bks || [])
    setSaved(svd || [])
    setLoading(false)
  }

  const now      = new Date()
  const upcoming = bookings.filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.check_out + 'T23:59:59') >= now)
  const past     = bookings.filter(b => b.status === 'completed')
  const nextTrip = upcoming[0]
  const totalSpent = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const firstName  = profile?.full_name?.split(' ')[0] || 'there'
  const isHost     = profile?.user_role === 'host' || profile?.is_host === true
  const isSuspended = !!profile?.suspended_at

  useEffect(() => {
    if (!nextTrip) return
    function tick() {
      const diff = new Date(nextTrip.check_in + 'T15:00:00') - new Date()
      if (diff > 0) setCd({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000) })
    }
    tick()
    const t = setInterval(tick, 30000)
    return () => clearInterval(t)
  }, [nextTrip?.check_in])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--sr-sub)' }}>
      Loading…
    </div>
  )

  return (
    <>
      <style>{STYLES}</style>
      <div className="db-page">
        {isSuspended && <SuspensionBanner />}

        {/* Welcome banner */}
        <div className="db-wb">
          <div className="db-wb-txt">
            <div className="db-wb-greet">{getGreeting()}</div>
            <div className="db-wb-name">Welcome back, {firstName}</div>
            <div className="db-wb-sub">
              {upcoming.length > 0
                ? `You have ${upcoming.length} upcoming trip${upcoming.length > 1 ? 's' : ''}.`
                : 'Ready to plan your next adventure?'}
            </div>
          </div>
          <div className="db-wb-right">
            <button
              className="db-wb-btn"
              onClick={() => router.push(upcoming.length > 0 ? '/account/trips' : '/listings')}
            >
              {upcoming.length > 0 ? 'View My Trips →' : 'Browse Stays →'}
            </button>
          </div>
        </div>

        {/* Host mode banner */}
        {isHost && (
          <div className="db-hb">
            <div className="db-hb-text"><strong>Explore mode</strong> — your host account is active in the background.</div>
            <a href="/host/dashboard" className="db-hb-link">Switch to Host →</a>
          </div>
        )}

        {/* Stats grid */}
        <div className="db-g4">
          <div className="db-sc">
            <div className="db-sc-lbl">🧳 Trips Taken</div>
            <div className="db-sc-val">{bookings.filter(b => b.status !== 'cancelled').length}</div>
            <div className="db-sc-sub">Across {[...new Set(bookings.map(b => b.listings?.city).filter(Boolean))].length} cities</div>
          </div>
          <div className="db-sc">
            <div className="db-sc-lbl">⭐ Past Stays</div>
            <div className="db-sc-val">{past.length}</div>
            <div className="db-sc-sub">Completed bookings</div>
          </div>
          <div className="db-sc">
            <div className="db-sc-lbl">❤️ Saved</div>
            <div className="db-sc-val">{saved.length}</div>
            <div className="db-sc-sub">{saved.length > 0 ? 'In your wishlist' : 'Start saving'}</div>
          </div>
          <div className="db-sc">
            <div className="db-sc-lbl">💰 Total Spent</div>
            <div className="db-sc-val">${totalSpent >= 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent}</div>
            <div className="db-sc-sub">Across all bookings</div>
          </div>
        </div>

        {/* Next trip card */}
        {nextTrip && (
          <>
            <div className="db-sec-title">Next trip</div>
            <div className="db-nth">
              <div className="db-nth-photo">
                {nextTrip.listings?.images?.[0] && <img src={nextTrip.listings.images[0]} alt="" />}
                <span style={{ position: 'relative', zIndex: 1 }}>{nextTrip.listings?.type === 'hotel' ? '🏨' : '🏠'}</span>
              </div>
              <div className="db-nth-body">
                <div>
                  <div className="db-nth-eyebrow">Upcoming Trip</div>
                  <div className="db-nth-name">{nextTrip.listings?.title || 'Property'}</div>
                  <div className="db-nth-loc">📍 {nextTrip.listings?.city}{nextTrip.listings?.state ? `, ${nextTrip.listings.state}` : ''}</div>
                  <div className="db-nth-details">
                    <div><div className="db-nth-dl">Check-in</div><div className="db-nth-dv">{fmt(nextTrip.check_in)}</div></div>
                    <div><div className="db-nth-dl">Check-out</div><div className="db-nth-dv">{fmt(nextTrip.check_out)}</div></div>
                    <div><div className="db-nth-dl">Nights</div><div className="db-nth-dv">{nights(nextTrip.check_in, nextTrip.check_out)}</div></div>
                    <div><div className="db-nth-dl">Guests</div><div className="db-nth-dv">{nextTrip.guests}</div></div>
                  </div>
                  {daysUntil(nextTrip.check_in) > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="db-nth-dl" style={{ marginBottom: 6 }}>Days Until Check-in</div>
                      <div className="db-cd">
                        <div className="db-cd-item"><div className="db-cd-num">{cd.d}</div><div className="db-cd-lbl">Days</div></div>
                        <div className="db-cd-item"><div className="db-cd-num">{cd.h}</div><div className="db-cd-lbl">Hours</div></div>
                        <div className="db-cd-item"><div className="db-cd-num">{cd.m}</div><div className="db-cd-lbl">Mins</div></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="db-nth-foot">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {(() => {
                      const cfg = statusCfg(nextTrip.status)
                      return (
                        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700 }}>
                          {cfg.label}
                        </span>
                      )
                    })()}
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--sr-text)' }}>
                      ${Number(nextTrip.total_amount).toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--sr-sub)' }}>total</span>
                    </span>
                  </div>
                  <div className="db-nth-btns">
                    <a href="/account/messages" className="db-btn-ghost">💬 Message</a>
                    <a href="/account/trips" className="db-btn-pri">Manage →</a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick actions */}
        <div className="db-sec-title">Quick actions</div>
        <div className="db-ql">
          <a href="/account/trips" className="db-ql-card">
            <span className="db-ql-icon">🧳</span>
            <div className="db-ql-label">My Trips</div>
            <div className="db-ql-sub">{upcoming.length > 0 ? `${upcoming.length} upcoming` : 'View all bookings'}</div>
          </a>
          <a href="/account/saved" className="db-ql-card">
            <span className="db-ql-icon">❤️</span>
            <div className="db-ql-label">Saved Stays</div>
            <div className="db-ql-sub">{saved.length > 0 ? `${saved.length} saved` : 'Start your wishlist'}</div>
          </a>
          <a href="/account/messages" className="db-ql-card">
            <span className="db-ql-icon">💬</span>
            <div className="db-ql-label">Messages</div>
            <div className="db-ql-sub">View conversations</div>
          </a>
          <a href="/listings" className="db-ql-card">
            <span className="db-ql-icon">🔍</span>
            <div className="db-ql-label">Browse Stays</div>
            <div className="db-ql-sub">Find your next trip</div>
          </a>
        </div>

        {/* Recent activity */}
        <div className="db-activity">
          <div className="db-sec-title" style={{ marginBottom: 4 }}>Recent activity</div>
          <div style={{ height: 1, background: 'var(--sr-border2)', margin: '12px 0' }} />
          {bookings.length === 0 && saved.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>No recent activity yet.</div>
          ) : (
            <>
              {bookings.slice(0, 3).map(b => (
                <div key={b.id} className="db-al-item">
                  <div className="db-al-icon">
                    {b.status === 'confirmed' ? '✅' : b.status === 'cancelled' ? '✗' : '🧳'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="db-al-title">Booking {statusCfg(b.status).label.replace('✓ ', '').replace('⏳ ', '').replace('✗ ', '')} — {b.listings?.title || 'Property'}</div>
                    <div className="db-al-sub">{fmtShort(b.check_in)} – {fmtShort(b.check_out)} · ${Number(b.total_amount).toLocaleString()} · #{b.reference}</div>
                  </div>
                  <div className="db-al-time">{relTime(b.created_at)}</div>
                </div>
              ))}
              {saved.slice(0, 2).map(s => (
                <div key={s.id} className="db-al-item">
                  <div className="db-al-icon">❤️</div>
                  <div style={{ flex: 1 }}>
                    <div className="db-al-title">Saved — {s.listings?.title || 'Property'}</div>
                    <div className="db-al-sub">Added to wishlist · {s.listings?.city}{s.listings?.state ? `, ${s.listings.state}` : ''}</div>
                  </div>
                  <div className="db-al-time">{relTime(s.created_at)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
