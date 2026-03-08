'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const STATUS_CONFIG = {
  confirmed:  { label: 'Confirmed',  color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   icon: '✓' },
  pending:    { label: 'Pending',    color: '#B45309', bg: 'rgba(234,179,8,0.1)',    icon: '⏳' },
  completed:  { label: 'Completed', color: '#6B5F54', bg: 'rgba(107,95,84,0.1)',    icon: '✓' },
  cancelled:  { label: 'Cancelled', color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   icon: '✕' },
}

const CITY_IMAGES = {
  'New York':    'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=400&q=70',
  'Miami':       'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=400&q=70',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&q=70',
  'Chicago':     'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&q=70',
  'New Orleans': 'https://images.unsplash.com/photo-1568869893270-a8d9f08dc84c?w=400&q=70',
}

export default function TripsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming') // upcoming | past | cancelled
  const [user, setUser] = useState(null)

  useEffect(() => {
    const sb = getSupabase()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login?next=/trips'); return }
      setUser(user)

      sb.from('bookings')
        .select('*, listings(id, title, city, state, property_type)')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setBookings(data)
          setLoading(false)
        })
    })
  }, [])

  const now = new Date()

  const upcoming = bookings.filter(b =>
    ['confirmed', 'pending'].includes(b.status) && new Date(b.check_out) >= now
  )
  const past = bookings.filter(b =>
    b.status === 'completed' || (b.status === 'confirmed' && new Date(b.check_out) < now)
  )
  const cancelled = bookings.filter(b => b.status === 'cancelled')

  const tabs = [
    { key: 'upcoming',  label: 'Upcoming',  count: upcoming.length },
    { key: 'past',      label: 'Past',      count: past.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelled.length },
  ]

  const displayed = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: var(--sr-card); border-bottom: 1px solid var(--sr-border-solid,#E8E2D9); position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: var(--sr-text); }
        .logo span { color: #F4601A; }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 0.84rem; font-weight: 600; text-decoration: none; color: var(--sr-muted); transition: all 0.15s; }
        .nav-link:hover { background: var(--sr-surface); color: var(--sr-text); }
        .nav-link.active { background: var(--sr-surface); color: #F4601A; font-weight: 700; }

        .page { max-width: 860px; margin: 40px auto; padding: 0 24px 80px; }
        .page-header { margin-bottom: 28px; }
        .page-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; margin-bottom: 4px; }
        .page-sub { font-size: 0.88rem; color: var(--sr-muted); }

        .tabs { display: flex; gap: 4px; background: var(--sr-surface); border-radius: 12px; padding: 4px; margin-bottom: 28px; width: fit-content; }
        .tab-btn { padding: 8px 20px; border-radius: 9px; border: none; background: transparent; font-size: 0.85rem; font-weight: 600; color: var(--sr-muted); cursor: pointer; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .tab-btn.active { background: var(--sr-card); color: var(--sr-text); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .tab-count { font-size: 0.72rem; background: var(--sr-border-solid,#E8E2D9); color: var(--sr-muted); padding: 1px 7px; border-radius: 100px; font-weight: 700; }
        .tab-btn.active .tab-count { background: #F4601A; color: white; }

        .bookings-list { display: flex; flex-direction: column; gap: 16px; }

        .booking-card { background: var(--sr-card); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 16px; overflow: hidden; display: flex; transition: box-shadow 0.2s; }
        .booking-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .booking-img { width: 140px; flex-shrink: 0; object-fit: cover; background: var(--sr-surface); }
        .booking-img img { width: 100%; height: 100%; object-fit: cover; }
        .booking-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
        .booking-body { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; justify-content: space-between; }
        .booking-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .booking-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; margin-bottom: 3px; }
        .booking-location { font-size: 0.78rem; color: var(--sr-muted); }
        .status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 100px; font-size: 0.74rem; font-weight: 700; flex-shrink: 0; }
        .booking-dates { display: flex; gap: 20px; margin-bottom: 12px; }
        .date-item { }
        .date-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); margin-bottom: 2px; }
        .date-value { font-size: 0.84rem; font-weight: 600; }
        .booking-footer { display: flex; align-items: center; justify-content: space-between; }
        .booking-ref { font-size: 0.72rem; color: var(--sr-sub); font-family: monospace; }
        .booking-total { font-weight: 700; font-size: 0.96rem; }
        .booking-nights { font-size: 0.72rem; color: var(--sr-muted); font-weight: 400; margin-left: 4px; }

        .empty-state { text-align: center; padding: 60px 20px; }
        .empty-icon { font-size: 3rem; margin-bottom: 16px; }
        .empty-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; }
        .empty-sub { font-size: 0.88rem; color: var(--sr-muted); margin-bottom: 24px; }
        .browse-btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg,#F4601A,#FF7A35); color: white; border-radius: 100px; font-weight: 700; font-size: 0.88rem; text-decoration: none; }

        .spinner { width: 36px; height: 36px; border: 3px solid var(--sr-border-solid,#E8E2D9); border-top-color: #F4601A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 60px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .nav { padding: 0 20px; }
          .page { padding: 0 16px 60px; }
          .booking-card { flex-direction: column; }
          .booking-img { width: 100%; height: 160px; }
          .booking-top { flex-direction: column; gap: 8px; }
          .tabs { width: 100%; }
          .tab-btn { flex: 1; justify-content: center; }
        }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve</span></a>
        <div className="nav-links">
          <a href="/trips" className="nav-link active">✈ Trips</a>
          <a href="/account" className="nav-link">👤 Account</a>
        </div>
      </nav>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">My Trips</h1>
          <p className="page-sub">All your SnapReserve™ bookings in one place</p>
        </div>

        <div className="tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner" />
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {tab === 'upcoming' ? '🗓️' : tab === 'past' ? '🏁' : '✕'}
            </div>
            <div className="empty-title">
              {tab === 'upcoming' ? 'No upcoming trips' : tab === 'past' ? 'No past trips' : 'No cancelled bookings'}
            </div>
            <p className="empty-sub">
              {tab === 'upcoming'
                ? "You don't have any upcoming reservations."
                : tab === 'past'
                ? "Your completed trips will appear here."
                : "Any cancelled bookings will appear here."}
            </p>
            {tab === 'upcoming' && (
              <a href="/listings" className="browse-btn">Browse listings →</a>
            )}
          </div>
        ) : (
          <div className="bookings-list">
            {displayed.map(b => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
              const city = b.listings?.city
              const img = city ? CITY_IMAGES[city] : null

              return (
                <div key={b.id} className="booking-card">
                  <div className="booking-img">
                    {img
                      ? <img src={img} alt={city} />
                      : <div className="booking-img-placeholder">🏠</div>
                    }
                  </div>
                  <div className="booking-body">
                    <div>
                      <div className="booking-top">
                        <div>
                          <div className="booking-title">{b.listings?.title || 'Property'}</div>
                          <div className="booking-location">📍 {b.listings?.city}{b.listings?.state ? `, ${b.listings.state}` : ''}</div>
                        </div>
                        <span className="status-pill" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>

                      <div className="booking-dates">
                        <div className="date-item">
                          <div className="date-label">Check-in</div>
                          <div className="date-value">{fmt(b.check_in)}</div>
                        </div>
                        <div className="date-item">
                          <div className="date-label">Checkout</div>
                          <div className="date-value">{fmt(b.check_out)}</div>
                        </div>
                        <div className="date-item">
                          <div className="date-label">Guests</div>
                          <div className="date-value">{b.guests}</div>
                        </div>
                      </div>
                    </div>

                    <div className="booking-footer">
                      <div className="booking-ref">Ref: {b.reference}</div>
                      <div className="booking-total">
                        ${Number(b.total_amount).toLocaleString()}
                        <span className="booking-nights">· {b.nights} night{b.nights !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
