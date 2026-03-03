'use client'
import { useState, useEffect, useRef } from 'react'
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

function daysUntil(dateStr) {
  const diff = Math.ceil((new Date(dateStr + 'T12:00:00') - new Date()) / 86400000)
  return diff
}

const CITY_IMAGES = {
  'New York':    'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&q=75',
  'Miami':       'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600&q=75',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=600&q=75',
  'Chicago':     'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600&q=75',
  'New Orleans': 'https://images.unsplash.com/photo-1568869893270-a8d9f08dc84c?w=600&q=75',
  'Paris':       'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=75',
  'London':      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=75',
  'Tokyo':       'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=75',
  'Dubai':       'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=75',
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=75'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ExploreDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?next=/dashboard'); return }

      const [{ data: prof }, { data: bks }, { data: svd }] = await Promise.all([
        supabase.from('users').select('full_name, email, avatar_url, user_role').eq('id', user.id).maybeSingle(),
        supabase.from('bookings').select('*, listings(id, title, city, state, type, images, price_per_night)').eq('guest_id', user.id).order('check_in', { ascending: true }),
        supabase.from('saved_listings').select('*, listings(id, title, city, state, type, images, price_per_night)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      setBookings(bks || [])
      setSaved(svd || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!dropdownOpen) return
    function onClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [dropdownOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/home')
  }

  const now = new Date()
  const upcoming = bookings.filter(b =>
    ['confirmed', 'pending'].includes(b.status) && new Date(b.check_out + 'T23:59:59') >= now
  )
  const past = bookings.filter(b =>
    b.status === 'completed' || (['confirmed', 'pending'].includes(b.status) && new Date(b.check_out + 'T23:59:59') < now)
  ).slice(0, 3)

  const nextTrip = upcoming[0]
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const isHost = profile?.user_role === 'host'
  const isPending = profile?.user_role === 'pending_host'
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E8E2D9', borderTopColor: '#F4601A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; color: #1A1410; }

        /* ── NAV ── */
        .nav { background: rgba(250,248,245,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.07); position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1000px; margin: 0 auto; padding: 0 32px; height: 62px; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .nav-title { font-size: 0.8rem; font-weight: 700; color: #A89880; text-transform: uppercase; letter-spacing: 0.1em; }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .browse-link { font-size: 0.83rem; font-weight: 600; color: #6B5F54; text-decoration: none; padding: 7px 14px; border-radius: 100px; transition: background 0.15s; }
        .browse-link:hover { background: rgba(0,0,0,0.06); }

        /* Avatar dropdown */
        .avatar-wrap { position: relative; }
        .avatar { width: 34px; height: 34px; border-radius: 50%; background: #F4601A; display: flex; align-items: center; justify-content: center; font-size: 0.74rem; font-weight: 800; color: white; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s; overflow: hidden; flex-shrink: 0; }
        .avatar:hover { border-color: rgba(244,96,26,0.4); }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: white; border: 1px solid #E8E2D9; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); min-width: 192px; padding: 6px; z-index: 200; animation: dropIn 0.15s ease; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .dd-hdr { padding: 9px 10px 8px; border-bottom: 1px solid #F3F0EB; margin-bottom: 3px; }
        .dd-name { font-size: 0.82rem; font-weight: 700; color: #1A1410; }
        .dd-role { font-size: 0.7rem; color: #A89880; margin-top: 1px; }
        .dd-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; font-size: 0.82rem; font-weight: 600; color: #1A1410; text-decoration: none; cursor: pointer; transition: background 0.12s; border: none; background: none; width: 100%; font-family: inherit; }
        .dd-item:hover { background: #FAF8F5; }
        .dd-icon { font-size: 0.95rem; width: 18px; text-align: center; flex-shrink: 0; }
        .dd-div { border: none; border-top: 1px solid #F3F0EB; margin: 3px 0; }
        .dd-item.red { color: #DC2626; }
        .dd-item.red:hover { background: #FEF2F2; }

        /* ── PAGE ── */
        .page { max-width: 1000px; margin: 0 auto; padding: 48px 32px 100px; }

        /* ── WELCOME ── */
        .welcome { margin-bottom: 44px; }
        .welcome-greeting { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #A89880; margin-bottom: 8px; }
        .welcome-headline { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.5px; margin-bottom: 10px; }
        .welcome-sub { font-size: 0.9rem; color: #6B5F54; line-height: 1.65; }
        .welcome-meta { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .meta-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 100px; font-size: 0.74rem; font-weight: 700; }
        .meta-chip.orange { background: rgba(244,96,26,0.1); color: #C2410C; }
        .meta-chip.green  { background: rgba(22,163,74,0.1); color: #15803D; }
        .meta-chip.amber  { background: rgba(217,119,6,0.1); color: #92400E; }
        .meta-chip.blue   { background: rgba(37,99,235,0.1); color: #1D4ED8; }

        /* ── HOST MODE BANNER ── */
        .host-banner { background: #1A1410; border-radius: 14px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 40px; }
        .host-banner-left { display: flex; align-items: center; gap: 10px; }
        .hb-dot { width: 8px; height: 8px; border-radius: 50%; background: #F4601A; flex-shrink: 0; }
        .hb-text { font-size: 0.83rem; color: rgba(255,255,255,0.55); }
        .hb-text strong { color: rgba(255,255,255,0.9); font-weight: 700; }
        .hb-btn { font-size: 0.8rem; font-weight: 700; color: #F4601A; text-decoration: none; padding: 7px 16px; border-radius: 100px; border: 1px solid rgba(244,96,26,0.35); transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
        .hb-btn:hover { background: rgba(244,96,26,0.1); }

        /* ── SECTIONS ── */
        .section { margin-bottom: 52px; }
        .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; }
        .section-label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #A89880; margin-bottom: 4px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 1.45rem; font-weight: 700; }
        .view-all { font-size: 0.82rem; font-weight: 700; color: #F4601A; text-decoration: none; }
        .view-all:hover { text-decoration: underline; }

        /* ── UPCOMING TRIP CARDS ── */
        .upcoming-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .trip-card { background: white; border: 1px solid #E8E2D9; border-radius: 20px; overflow: hidden; text-decoration: none; color: inherit; display: flex; flex-direction: column; transition: all 0.22s; }
        .trip-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); border-color: #D4CEC5; }
        .trip-card-img { height: 180px; position: relative; overflow: hidden; background: #F3F0EB; }
        .trip-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .trip-card:hover .trip-card-img img { transform: scale(1.04); }
        .trip-countdown { position: absolute; top: 12px; left: 12px; background: #1A1410; color: white; padding: 5px 12px; border-radius: 100px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.02em; }
        .trip-status { position: absolute; top: 12px; right: 12px; padding: 4px 11px; border-radius: 100px; font-size: 0.68rem; font-weight: 800; }
        .trip-body { padding: 18px 20px 20px; flex: 1; display: flex; flex-direction: column; }
        .trip-location { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: #A89880; margin-bottom: 4px; }
        .trip-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; margin-bottom: 14px; line-height: 1.25; }
        .trip-dates { display: flex; gap: 20px; margin-bottom: 14px; }
        .trip-date-lbl { font-size: 0.58rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #A89880; margin-bottom: 2px; }
        .trip-date-val { font-size: 0.86rem; font-weight: 700; }
        .trip-foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 14px; border-top: 1px solid #F3F0EB; }
        .trip-nights { font-size: 0.76rem; color: #A89880; }
        .trip-total { font-size: 0.94rem; font-weight: 800; }

        /* ── PAST TRIPS ── */
        .past-list { display: flex; flex-direction: column; gap: 12px; }
        .past-card { background: white; border: 1px solid #E8E2D9; border-radius: 14px; display: flex; align-items: center; gap: 16px; padding: 14px 18px; transition: box-shadow 0.18s; }
        .past-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .past-thumb { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: #F3F0EB; }
        .past-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .past-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .past-body { flex: 1; min-width: 0; }
        .past-name { font-size: 0.9rem; font-weight: 700; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .past-loc { font-size: 0.74rem; color: #A89880; }
        .past-right { text-align: right; flex-shrink: 0; }
        .past-dates { font-size: 0.74rem; color: #6B5F54; margin-bottom: 3px; }
        .past-amount { font-size: 0.88rem; font-weight: 700; }

        /* ── SAVED STAYS ── */
        .saved-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .saved-card { background: white; border: 1px solid #E8E2D9; border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: all 0.2s; }
        .saved-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(0,0,0,0.09); border-color: #D4CEC5; }
        .saved-img { height: 130px; overflow: hidden; background: #F3F0EB; position: relative; }
        .saved-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .saved-card:hover .saved-img img { transform: scale(1.05); }
        .saved-heart { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 1px 6px rgba(0,0,0,0.1); }
        .saved-body { padding: 12px 14px; }
        .saved-name { font-size: 0.84rem; font-weight: 700; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .saved-loc { font-size: 0.72rem; color: #A89880; margin-bottom: 6px; }
        .saved-price { font-size: 0.82rem; font-weight: 800; }
        .saved-price span { font-weight: 400; color: #A89880; font-size: 0.72rem; }

        /* ── ACCOUNT SHORTCUTS ── */
        .account-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .account-card { background: white; border: 1px solid #E8E2D9; border-radius: 16px; padding: 22px 20px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 10px; transition: all 0.2s; }
        .account-card:hover { border-color: #D4CEC5; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
        .ac-icon { font-size: 1.5rem; }
        .ac-title { font-size: 0.88rem; font-weight: 700; }
        .ac-sub { font-size: 0.74rem; color: #A89880; line-height: 1.5; }

        /* ── HOST CTA ── */
        .host-cta { background: linear-gradient(135deg, #1A1410 0%, #2A1F18 100%); border-radius: 20px; padding: 40px 44px; display: flex; align-items: center; justify-content: space-between; gap: 32px; position: relative; overflow: hidden; }
        .host-cta::before { content: ''; position: absolute; top: -40px; right: -40px; width: 220px; height: 220px; background: radial-gradient(circle, rgba(244,96,26,0.2), transparent 70%); pointer-events: none; }
        .hcta-text h3 { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 8px; line-height: 1.2; }
        .hcta-text p { font-size: 0.84rem; color: rgba(255,255,255,0.5); line-height: 1.7; max-width: 380px; }
        .hcta-perks { display: flex; gap: 18px; margin-top: 14px; flex-wrap: wrap; }
        .hcta-perk { font-size: 0.76rem; color: rgba(255,255,255,0.55); display: flex; align-items: center; gap: 6px; }
        .hcta-perk em { color: #F4601A; font-style: normal; }
        .hcta-btn { background: #F4601A; color: white; border: none; border-radius: 14px; padding: 14px 30px; font-size: 0.92rem; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; flex-shrink: 0; transition: all 0.2s; text-decoration: none; display: inline-block; }
        .hcta-btn:hover { background: #FF7A35; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(244,96,26,0.35); }

        /* ── EMPTY STATES ── */
        .empty { text-align: center; padding: 44px 20px; background: white; border: 1px solid #E8E2D9; border-radius: 16px; }
        .empty-icon { font-size: 2.4rem; margin-bottom: 12px; }
        .empty-title { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
        .empty-sub { font-size: 0.84rem; color: #A89880; margin-bottom: 20px; line-height: 1.6; }
        .empty-btn { display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #F4601A, #FF7A35); color: white; border-radius: 100px; font-weight: 700; font-size: 0.84rem; text-decoration: none; }

        @media(max-width:900px) { .upcoming-grid{grid-template-columns:1fr;} .saved-grid{grid-template-columns:repeat(2,1fr);} .account-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:600px) { .page{padding:28px 16px 80px;} .nav-inner{padding:0 20px;} .host-cta{flex-direction:column;padding:28px;} .saved-grid{grid-template-columns:repeat(2,1fr);} .account-grid{grid-template-columns:repeat(2,1fr);} .hcta-btn{width:100%;text-align:center;} }
        @media(max-width:400px) { .saved-grid{grid-template-columns:1fr;} .account-grid{grid-template-columns:1fr;} }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <a href="/home" className="logo">Snap<span>Reserve™</span></a>
            <span style={{ color: '#D4CEC5', fontSize: '1.1rem', fontWeight: 300 }}>|</span>
            <span className="nav-title">Explore</span>
          </div>
          <div className="nav-right">
            <a href="/listings" className="browse-link">Browse stays</a>
            <div className="avatar-wrap" ref={dropdownRef}>
              <div className="avatar" onClick={() => setDropdownOpen(o => !o)}>
                {profile?.avatar_url?.startsWith('http')
                  ? <img src={profile.avatar_url} alt="avatar" />
                  : profile?.avatar_url
                    ? <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{profile.avatar_url}</span>
                    : initials
                }
              </div>
              {dropdownOpen && (
                <div className="dropdown">
                  {profile?.full_name && (
                    <div className="dd-hdr">
                      <div className="dd-name">{profile.full_name}</div>
                      <div className="dd-role">{isHost ? 'Approved Host' : isPending ? 'Application Pending' : 'Member'}</div>
                    </div>
                  )}
                  <a href="/trips" className="dd-item" onClick={() => setDropdownOpen(false)}>
                    <span className="dd-icon">🧳</span> My Trips
                  </a>
                  {isHost && (
                    <a href="/host/dashboard" className="dd-item" onClick={() => setDropdownOpen(false)}>
                      <span className="dd-icon">🏠</span> Host Dashboard
                    </a>
                  )}
                  <a href="/account/profile" className="dd-item" onClick={() => setDropdownOpen(false)}>
                    <span className="dd-icon">⚙️</span> Settings
                  </a>
                  <hr className="dd-div" />
                  <button className="dd-item red" onClick={handleLogout}>
                    <span className="dd-icon">↪</span> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="page">

        {/* ── WELCOME ── */}
        <div className="welcome">
          <div className="welcome-greeting">{getGreeting()}</div>
          <h1 className="welcome-headline">{firstName}'s Travel Hub</h1>
          <p className="welcome-sub">Your trips, saved stays, and account — all in one place.</p>
          <div className="welcome-meta">
            {upcoming.length > 0 ? (
              <span className="meta-chip orange">✈ {upcoming.length} upcoming {upcoming.length === 1 ? 'trip' : 'trips'}</span>
            ) : (
              <span className="meta-chip blue">🔍 No upcoming trips</span>
            )}
            {nextTrip && daysUntil(nextTrip.check_in) > 0 && (
              <span className="meta-chip green">🗓 Next trip in {daysUntil(nextTrip.check_in)} day{daysUntil(nextTrip.check_in) !== 1 ? 's' : ''}</span>
            )}
            {saved.length > 0 && (
              <span className="meta-chip amber">❤ {saved.length} saved {saved.length === 1 ? 'stay' : 'stays'}</span>
            )}
          </div>
        </div>

        {/* ── HOST EXPLORE BANNER ── */}
        {isHost && (
          <div className="host-banner">
            <div className="host-banner-left">
              <div className="hb-dot" />
              <p className="hb-text"><strong>Explore mode</strong> — your host account is active in the background.</p>
            </div>
            <a href="/host/dashboard" className="hb-btn">Switch to Host →</a>
          </div>
        )}

        {/* ── UPCOMING TRIPS ── */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Priority</div>
              <h2 className="section-title">Upcoming Trips</h2>
            </div>
            {upcoming.length > 0 && <a href="/trips" className="view-all">View all →</a>}
          </div>

          {upcoming.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🗓️</div>
              <div className="empty-title">No upcoming trips</div>
              <p className="empty-sub">Your confirmed and pending reservations will appear here.<br />Ready to explore something new?</p>
              <a href="/listings" className="empty-btn">Browse stays →</a>
            </div>
          ) : (
            <div className="upcoming-grid">
              {upcoming.slice(0, 4).map(b => {
                const img = (b.listings?.images?.[0]) || CITY_IMAGES[b.listings?.city] || FALLBACK_IMG
                const days = daysUntil(b.check_in)
                const isConfirmed = b.status === 'confirmed'
                return (
                  <a href={`/listings/${b.listing_id}`} key={b.id} className="trip-card">
                    <div className="trip-card-img">
                      <img src={img} alt={b.listings?.title} />
                      {days > 0 && (
                        <div className="trip-countdown">
                          {days === 1 ? 'Tomorrow' : `In ${days} days`}
                        </div>
                      )}
                      {days <= 0 && (
                        <div className="trip-countdown" style={{ background: '#16A34A' }}>Staying now</div>
                      )}
                      <div
                        className="trip-status"
                        style={isConfirmed
                          ? { background: 'rgba(22,163,74,0.9)', color: 'white' }
                          : { background: 'rgba(234,179,8,0.9)', color: '#1A1410' }
                        }
                      >
                        {isConfirmed ? '✓ Confirmed' : '⏳ Pending'}
                      </div>
                    </div>
                    <div className="trip-body">
                      <div className="trip-location">📍 {b.listings?.city}{b.listings?.state ? `, ${b.listings.state}` : ''}</div>
                      <div className="trip-name">{b.listings?.title || 'Property'}</div>
                      <div className="trip-dates">
                        <div>
                          <div className="trip-date-lbl">Check-in</div>
                          <div className="trip-date-val">{fmtShort(b.check_in)}</div>
                        </div>
                        <div>
                          <div className="trip-date-lbl">Checkout</div>
                          <div className="trip-date-val">{fmtShort(b.check_out)}</div>
                        </div>
                        <div>
                          <div className="trip-date-lbl">Guests</div>
                          <div className="trip-date-val">{b.guests}</div>
                        </div>
                      </div>
                      <div className="trip-foot">
                        <span className="trip-nights">{b.nights} night{b.nights !== 1 ? 's' : ''} · Ref {b.reference}</span>
                        <span className="trip-total">${Number(b.total_amount).toLocaleString()}</span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* ── PAST TRIPS ── */}
        {past.length > 0 && (
          <div className="section">
            <div className="section-header">
              <div>
                <div className="section-label">History</div>
                <h2 className="section-title">Past Trips</h2>
              </div>
              <a href="/trips" className="view-all">View all →</a>
            </div>
            <div className="past-list">
              {past.map(b => {
                const img = (b.listings?.images?.[0]) || CITY_IMAGES[b.listings?.city] || null
                return (
                  <div key={b.id} className="past-card">
                    <div className="past-thumb">
                      {img
                        ? <img src={img} alt={b.listings?.city} />
                        : <div className="past-thumb-placeholder">{b.listings?.type === 'hotel' ? '🏨' : '🏠'}</div>
                      }
                    </div>
                    <div className="past-body">
                      <div className="past-name">{b.listings?.title || 'Property'}</div>
                      <div className="past-loc">📍 {b.listings?.city}{b.listings?.state ? `, ${b.listings.state}` : ''}</div>
                    </div>
                    <div className="past-right">
                      <div className="past-dates">{fmtShort(b.check_in)} – {fmtShort(b.check_out)}</div>
                      <div className="past-amount">${Number(b.total_amount).toLocaleString()}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SAVED STAYS ── */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Wishlist</div>
              <h2 className="section-title">Saved Stays</h2>
            </div>
            {saved.length > 4 && <a href="/account/saved" className="view-all">View all →</a>}
          </div>

          {saved.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">❤️</div>
              <div className="empty-title">Nothing saved yet</div>
              <p className="empty-sub">Tap the heart on any listing to save it here.<br />Build your dream travel wishlist.</p>
              <a href="/listings" className="empty-btn">Explore stays →</a>
            </div>
          ) : (
            <div className="saved-grid">
              {saved.slice(0, 4).map(s => {
                const img = (s.listings?.images?.[0]) || CITY_IMAGES[s.listings?.city] || FALLBACK_IMG
                return (
                  <a href={`/listings/${s.listing_id}`} key={s.id} className="saved-card">
                    <div className="saved-img">
                      <img src={img} alt={s.listings?.title} />
                      <div className="saved-heart">❤️</div>
                    </div>
                    <div className="saved-body">
                      <div className="saved-name">{s.listings?.title || 'Property'}</div>
                      <div className="saved-loc">📍 {s.listings?.city}{s.listings?.state ? `, ${s.listings.state}` : ''}</div>
                      {s.listings?.price_per_night && (
                        <div className="saved-price">${s.listings.price_per_night}<span>/night</span></div>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* ── ACCOUNT SHORTCUTS ── */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-label">Account</div>
              <h2 className="section-title">Settings</h2>
            </div>
          </div>
          <div className="account-grid">
            <a href="/account/profile" className="account-card">
              <div className="ac-icon">👤</div>
              <div className="ac-title">Profile</div>
              <div className="ac-sub">Name, photo and personal info</div>
            </a>
            <a href="/account/payments" className="account-card">
              <div className="ac-icon">💳</div>
              <div className="ac-title">Payment Methods</div>
              <div className="ac-sub">Manage cards and billing</div>
            </a>
            <a href="/account/notifications" className="account-card">
              <div className="ac-icon">🔔</div>
              <div className="ac-title">Notifications</div>
              <div className="ac-sub">Email and push preferences</div>
            </a>
            <a href="/account/security" className="account-card">
              <div className="ac-icon">🔒</div>
              <div className="ac-title">Security</div>
              <div className="ac-sub">Password and login settings</div>
            </a>
          </div>
        </div>

        {/* ── BECOME A HOST CTA (non-hosts only) ── */}
        {!isHost && !isPending && (
          <div className="host-cta">
            <div className="hcta-text">
              <h3>Your space could be earning.</h3>
              <p>Join thousands of hosts on SnapReserve™ and turn your property into a source of income — on your schedule.</p>
              <div className="hcta-perks">
                <span className="hcta-perk"><em>✦</em> Industry-lowest 3.2% fee</span>
                <span className="hcta-perk"><em>✦</em> You set the price</span>
              </div>
            </div>
            <a href="/become-a-host" className="hcta-btn">Start hosting →</a>
          </div>
        )}

        {isPending && (
          <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: '16px', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '1.8rem' }}>⏳</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Host application under review</div>
              <p style={{ fontSize: '0.84rem', color: '#92400E', lineHeight: 1.6 }}>Our team is reviewing your application. We'll notify you by email within 1–3 business days.</p>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
