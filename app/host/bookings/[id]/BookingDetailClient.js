'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_CFG = {
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,.13)',  border: 'rgba(245,158,11,.28)' },
  confirmed:  { label: 'Confirmed',  color: '#22c55e', bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.28)' },
  checked_in: { label: 'Checked In', color: '#e8622a', bg: 'rgba(232,98,42,.13)',   border: 'rgba(232,98,42,.3)' },
  completed:  { label: 'Completed',  color: '#a8a29e', bg: 'rgba(168,162,158,.1)',  border: 'rgba(168,162,158,.2)' },
  cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.28)' },
  refunded:   { label: 'Refunded',   color: '#ef4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.28)' },
}

function fmtDate(d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return d ? new Date(d).toLocaleDateString('en-US', opts) : '—'
}
function fmtTime(d) {
  return d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
}
function initials(name) {
  return (name || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'G'
}

function Countdown({ checkIn }) {
  const [parts, setParts] = useState({ days: 0, hrs: 0, mins: 0, past: false })
  useEffect(() => {
    const calc = () => {
      const diff = new Date(checkIn) - Date.now()
      if (diff <= 0) { setParts({ days: 0, hrs: 0, mins: 0, past: true }); return }
      setParts({
        days: Math.floor(diff / 86400000),
        hrs:  Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        past: false,
      })
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [checkIn])

  if (parts.past) return null
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(232,98,42,.15),rgba(232,98,42,.05))', border: '1px solid rgba(232,98,42,.3)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e8622a', marginBottom: 8 }}>Check-in Countdown</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
        {[['days', parts.days], ['hrs', parts.hrs], ['mins', parts.mins]].map(([lbl, val], i) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ fontSize: 20, fontWeight: 700, color: '#4a4845' }}>:</span>}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: '#e8e3dc', display: 'block', lineHeight: 1 }}>{String(val).padStart(2, '0')}</span>
              <span style={{ fontSize: 8, color: '#7a7670', marginTop: 2, display: 'block' }}>{lbl}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#7a7670' }}>{fmtDate(checkIn, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  )
}

export default function BookingDetailClient({ booking, guest, pastStaysHere, hostName }) {
  const router = useRouter()
  const [tab, setTab] = useState('details')
  const [status, setStatus] = useState(booking.status)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleCheckIn() {
    setCheckinLoading(true)
    const res = await fetch(`/api/host/bookings/${booking.id}/checkin`, { method: 'POST' })
    if (res.ok) {
      setStatus('checked_in')
      showToast('Guest checked in successfully!')
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed to check in', false)
    }
    setCheckinLoading(false)
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return
    setCancelling(true)
    const res = await fetch(`/api/host/bookings/${booking.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    })
    if (res.ok) {
      setStatus('cancelled')
      setCancelModal(false)
      showToast('Booking cancelled.')
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed to cancel', false)
    }
    setCancelling(false)
  }

  const sc = STATUS_CFG[status] || STATUS_CFG.pending
  const listing = booking.listings || {}
  const isConfirmed  = status === 'confirmed'
  const isCheckedIn  = status === 'checked_in'
  const isCompleted  = status === 'completed'
  const isCancelled  = ['cancelled', 'refunded'].includes(status)
  const canCheckIn   = isConfirmed
  const canCancel    = ['pending', 'confirmed'].includes(status)

  const guestAvColor = ['#7c3aed','#1d4ed8','#065f46','#92400e','#9f1239'][Math.abs(guest.full_name.charCodeAt(0) || 0) % 5]

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        body{background:#0f0e0c;color:#e8e3dc;font-family:'DM Sans',system-ui,sans-serif;font-size:13px}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#383533;border-radius:100px}

        .bd-wrap{display:flex;height:100vh;overflow:hidden}
        .bd-sidebar{width:200px;background:#151412;border-right:1px solid #2a2825;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
        .bd-sb-brand{padding:16px;border-bottom:1px solid #2a2825;font-size:14px;font-weight:700;color:#e8622a}
        .bd-sb-nav{flex:1;padding:10px 8px}
        .bd-sb-section{font-size:8px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#4a4845;padding:12px 8px 5px}
        .bd-sbi{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;cursor:pointer;color:#7a7670;margin-bottom:1px;border:1px solid transparent;font-size:12px;font-weight:500;text-decoration:none}
        .bd-sbi:hover{background:#1a1916;color:#e8e3dc}
        .bd-sbi.active{background:rgba(232,98,42,.13);border-color:rgba(232,98,42,.3);color:#e8622a}
        .bd-sbi-icon{font-size:14px;width:16px;text-align:center;flex-shrink:0}

        .bd-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .bd-topbar{height:48px;padding:0 20px;background:#151412;border-bottom:1px solid #2a2825;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .bd-back{display:flex;align-items:center;gap:8px;color:#7a7670;font-size:12px;font-weight:500;padding:6px 10px;border-radius:7px;border:1px solid #2a2825;text-decoration:none;transition:all .14s}
        .bd-back:hover{border-color:#383533;color:#e8e3dc}
        .bd-path{display:flex;align-items:center;gap:6px;font-size:11px;color:#4a4845;margin-left:12px;overflow:hidden}
        .bd-path b{color:#e8e3dc;white-space:nowrap}
        .bd-path .ref{color:#e8622a;font-family:monospace;font-weight:700}
        .bd-tb-actions{display:flex;gap:6px;flex-shrink:0}
        .bd-tb-btn{padding:6px 12px;border-radius:7px;border:1px solid #2a2825;background:transparent;cursor:pointer;font-size:11px;font-weight:600;color:#7a7670;transition:all .14s;display:flex;align-items:center;gap:5px;font-family:inherit}
        .bd-tb-btn:hover{border-color:#383533;color:#e8e3dc}
        .bd-tb-btn.danger{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28);color:#ef4444}
        .bd-tb-btn.danger:disabled{opacity:.4;cursor:not-allowed}

        .bd-content{flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 320px;gap:0}
        .bd-left{padding:20px;overflow-y:auto;border-right:1px solid #2a2825;display:flex;flex-direction:column;gap:14px}
        .bd-right{padding:18px;background:#0f0e0c;overflow-y:auto;display:flex;flex-direction:column;gap:12px}

        .hero{background:#151412;border:1px solid #2a2825;border-radius:12px;overflow:hidden}
        .hero-banner{height:100px;display:flex;align-items:center;justify-content:center;font-size:48px;position:relative;background:linear-gradient(135deg,#1a2a6c,#2563eb)}
        .hero-overlay{position:absolute;inset:0;background:linear-gradient(0deg,rgba(21,20,18,.9) 0%,transparent 60%)}
        .hero-status{padding:13px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2a2825}
        .hero-prop{padding:14px 18px;border-bottom:1px solid #2a2825;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .hero-dates{display:grid;grid-template-columns:repeat(4,1fr)}
        .hd-cell{padding:12px 18px;border-right:1px solid #2a2825;text-align:center}
        .hd-cell:last-child{border:none}
        .hd-label{font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#4a4845;margin-bottom:5px}
        .hd-val{font-size:14px;font-weight:700;color:#e8e3dc;font-family:monospace}
        .hd-sub{font-size:9px;color:#7a7670;margin-top:2px}

        .badge{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:100px;font-size:10px;font-weight:700;white-space:nowrap}
        .sec{background:#151412;border:1px solid #2a2825;border-radius:12px;overflow:hidden}
        .sec-head{padding:13px 16px;border-bottom:1px solid #2a2825;display:flex;align-items:center;justify-content:space-between}
        .sec-title{font-size:11px;font-weight:700;color:#e8e3dc;display:flex;align-items:center;gap:7px}
        .sec-body{padding:14px 16px}

        .tabs{display:flex;border-bottom:1px solid #2a2825;padding:0 16px}
        .tab{padding:10px 11px;font-size:11px;font-weight:600;color:#7a7670;cursor:pointer;border-bottom:2px solid transparent;transition:all .13s;margin-bottom:-1px;white-space:nowrap}
        .tab:hover{color:#e8e3dc}
        .tab.on{color:#e8622a;border-bottom-color:#e8622a}
        .tab-pane{display:none;padding:14px 16px}
        .tab-pane.on{display:block}

        .pay-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #2a2825}
        .pay-row:last-child{border:none}
        .pay-lbl{font-size:11px;color:#7a7670}
        .pay-val{font-size:11px;font-weight:600;color:#e8e3dc;font-family:monospace}

        .ac-card{background:#151412;border:1px solid #2a2825;border-radius:12px;padding:14px}
        .ac-title{font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#4a4845;margin-bottom:10px}
        .ac-btn{width:100%;padding:9px 12px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .14s;border:1px solid #2a2825;background:transparent;color:#e8e3dc;text-align:left;display:flex;align-items:center;gap:8px;margin-bottom:6px}
        .ac-btn:last-child{margin:0}
        .ac-btn:hover:not(:disabled){border-color:#383533;background:#1a1916}
        .ac-btn:disabled{opacity:.4;cursor:not-allowed}
        .ac-btn.primary{background:#e8622a;border-color:#e8622a;color:#fff}
        .ac-btn.primary:hover:not(:disabled){background:#d4561f}
        .ac-btn.danger{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28);color:#ef4444}
        .ac-btn.success{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.28);color:#22c55e}
        .ac-btn-desc{font-size:9px;opacity:.7;margin-top:1px}

        .ic-card{background:#151412;border:1px solid #2a2825;border-radius:12px;overflow:hidden}
        .ic-head{padding:11px 14px;border-bottom:1px solid #2a2825;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#4a4845}
        .ic-body{padding:0 14px}
        .ic-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #2a2825;gap:8px}
        .ic-row:last-child{border:none}
        .ic-lbl{font-size:10px;color:#7a7670}
        .ic-val{font-size:10px;font-weight:600;color:#e8e3dc;font-family:monospace;text-align:right}

        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal-box{background:#1a1916;border:1px solid #2a2825;border-radius:18px;padding:24px;width:100%;max-width:440px}
        .toast{position:fixed;bottom:24px;right:24px;z-index:2000;padding:11px 18px;border-radius:10px;font-size:12px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.5)}
      `}</style>

      {toast && (
        <div className="toast" style={{ background: toast.ok ? '#052e16' : '#450a0a', color: toast.ok ? '#4ade80' : '#f87171', border: `1px solid ${toast.ok ? '#166534' : '#991b1b'}` }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="bd-wrap">
        {/* ── Sidebar ── */}
        <aside className="bd-sidebar">
          <div className="bd-sb-brand">SnapReserve™</div>
          <nav className="bd-sb-nav">
            <div className="bd-sb-section">Main</div>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">📊</span>Overview</Link>
            <Link href="/host/dashboard" className="bd-sbi active"><span className="bd-sbi-icon">📅</span>Bookings</Link>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">🏨</span>Properties</Link>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">💬</span>Messages</Link>
            <div className="bd-sb-section">Finance</div>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">💰</span>Earnings</Link>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">💸</span>Payouts</Link>
            <div className="bd-sb-section">Account</div>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">⭐</span>Reviews</Link>
            <Link href="/host/dashboard" className="bd-sbi"><span className="bd-sbi-icon">👥</span>Team</Link>
          </nav>
          <div style={{ padding: '12px 8px', borderTop: '1px solid #2a2825' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(hostName)}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e3dc' }}>{hostName || 'Host'}</div>
                <div style={{ fontSize: 9, color: '#4a4845' }}>Host Portal</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="bd-main">
          {/* Topbar */}
          <div className="bd-topbar">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link href="/host/dashboard" className="bd-back">← Bookings</Link>
              <div className="bd-path">
                <span>/</span>
                <span className="ref">{booking.reference || booking.id.slice(0, 8).toUpperCase()}</span>
                <span>·</span>
                <b>{listing.title || '—'}</b>
                <span>·</span>
                <b>{guest.full_name}</b>
              </div>
            </div>
            <div className="bd-tb-actions">
              <button className="bd-tb-btn">📩 Contact Guest</button>
              <button className="bd-tb-btn danger" disabled={!canCancel} onClick={() => setCancelModal(true)}>✕ Cancel</button>
            </div>
          </div>

          {/* Content */}
          <div className="bd-content">
            {/* ── Left ── */}
            <div className="bd-left">

              {/* Hero */}
              <div className="hero">
                <div className="hero-banner">
                  {listing.type === 'hotel' ? '🏨' : listing.type === 'private_stay' ? '🏠' : '🏡'}
                  <div className="hero-overlay" />
                </div>
                <div className="hero-status">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e8622a' }}>
                      {booking.reference || booking.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                    {isCheckedIn && (
                      <span className="badge" style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,.28)' }}>
                        🟢 In House
                      </span>
                    )}
                    {isConfirmed && new Date(booking.check_in) > new Date() && (
                      <span className="badge" style={{ background: 'rgba(59,130,246,.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,.28)' }}>
                        📅 Upcoming
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#4a4845', fontFamily: 'monospace' }}>
                    Booked {fmtDate(booking.created_at)}
                  </div>
                </div>
                <div className="hero-prop">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e3dc', marginBottom: 3 }}>{listing.title || '—'}</div>
                    <div style={{ fontSize: 11, color: '#7a7670' }}>
                      📍 {[listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
                      {listing.bedrooms ? ` · ${listing.bedrooms} Bed` : ''}
                      {listing.bathrooms ? ` / ${listing.bathrooms} Bath` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="badge" style={{ background: '#212019', border: '1px solid #2a2825', color: '#7a7670', fontSize: 9 }}>
                      {listing.type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}
                    </span>
                  </div>
                </div>
                <div className="hero-dates">
                  <div className="hd-cell">
                    <div className="hd-label">Check-in</div>
                    <div className="hd-val">{fmtDate(booking.check_in, { month: 'short', day: 'numeric' })}</div>
                    <div className="hd-sub">{fmtDate(booking.check_in, { weekday: 'short' })}</div>
                  </div>
                  <div className="hd-cell">
                    <div className="hd-label">Check-out</div>
                    <div className="hd-val">{fmtDate(booking.check_out, { month: 'short', day: 'numeric' })}</div>
                    <div className="hd-sub">{fmtDate(booking.check_out, { weekday: 'short' })}</div>
                  </div>
                  <div className="hd-cell">
                    <div className="hd-label">Duration</div>
                    <div className="hd-val">{booking.nights ?? '—'}</div>
                    <div className="hd-sub">{booking.nights === 1 ? 'night' : 'nights'}</div>
                  </div>
                  <div className="hd-cell">
                    <div className="hd-label">Guests</div>
                    <div className="hd-val">{booking.guests ?? '—'}</div>
                    <div className="hd-sub">{booking.guests === 1 ? 'guest' : 'guests'}</div>
                  </div>
                </div>
              </div>

              {/* Guest profile */}
              <div className="sec">
                <div className="sec-head">
                  <div className="sec-title">👤 Guest Profile</div>
                </div>
                <div className="sec-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: guestAvColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0, border: '2px solid #2a2825' }}>
                      {initials(guest.full_name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e3dc', marginBottom: 3 }}>{guest.full_name}</div>
                      <div style={{ fontSize: 11, color: '#7a7670', marginBottom: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {guest.email && <span>✉ {guest.email}</span>}
                        {guest.created_at && <span>🗓 Member since {fmtDate(guest.created_at, { month: 'short', year: 'numeric' })}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {guest.total_stays > 0 && (
                          <span className="badge" style={{ background: '#212019', border: '1px solid #2a2825', color: '#7a7670' }}>
                            {guest.total_stays} total stay{guest.total_stays !== 1 ? 's' : ''}
                          </span>
                        )}
                        {guest.stays_here > 0 && (
                          <span className="badge" style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.28)', color: '#3b82f6' }}>
                            🔁 {guest.stays_here}× stayed here
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs: Stay details / Past stays */}
              <div className="sec">
                <div className="tabs">
                  {['details', 'past'].map(t => (
                    <div key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                      {t === 'details' ? 'Stay Details' : 'Past Stays Here'}
                    </div>
                  ))}
                </div>

                <div className={`tab-pane${tab === 'details' ? ' on' : ''}`}>
                  {booking.special_requests ? (
                    <div style={{ background: '#1a1916', border: '1px solid #2a2825', borderRadius: 9, padding: 13, marginBottom: 14 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#4a4845', marginBottom: 6 }}>Guest Note</div>
                      <div style={{ fontSize: 12, color: '#e8e3dc', lineHeight: 1.7 }}>{booking.special_requests}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#4a4845', fontStyle: 'italic', marginBottom: 10 }}>No special requests from guest.</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      ['📍', 'Property', listing.title || '—', null],
                      ['🛏', 'Bedrooms', listing.bedrooms ? `${listing.bedrooms} bed${listing.bedrooms !== 1 ? 's' : ''}` : '—', null],
                      ['🚿', 'Bathrooms', listing.bathrooms ? `${listing.bathrooms} bath${listing.bathrooms !== 1 ? 's' : ''}` : '—', null],
                      ['📋', 'Cancellation Policy', listing.cancellation_policy || 'Moderate', null],
                      ['💳', 'Payment', booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status || '—', booking.payment_status === 'paid' ? '#22c55e' : null],
                    ].map(([icon, lbl, val, color]) => (
                      <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2a2825' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1a1916', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e3dc' }}>{lbl}</div>
                        </div>
                        <div style={{ fontSize: 11, color: color || '#7a7670', fontWeight: color ? 700 : 500 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`tab-pane${tab === 'past' ? ' on' : ''}`}>
                  {pastStaysHere.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#4a4845', fontStyle: 'italic' }}>No previous stays at this property.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, color: '#7a7670', marginBottom: 12 }}>
                        {guest.full_name} has stayed here <strong style={{ color: '#e8622a' }}>{pastStaysHere.length}×</strong> before.
                      </div>
                      {pastStaysHere.map(b => (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2a2825' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🏠</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e3dc' }}>{b.listings?.title || listing.title || '—'}</div>
                            <div style={{ fontSize: 9, color: '#7a7670' }}>
                              {fmtDate(b.check_in, { month: 'short', day: 'numeric' })}–{fmtDate(b.check_out, { month: 'short', day: 'numeric', year: 'numeric' })} · {b.nights} night{b.nights !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#e8e3dc' }}>${Number(b.total_amount || 0).toFixed(2)}</div>
                            <span className="badge" style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.28)', color: '#22c55e', fontSize: 8 }}>✓ Completed</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="sec">
                <div className="sec-head">
                  <div className="sec-title">💳 Payment Breakdown</div>
                  <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
                    {booking.payment_status === 'paid' ? '✓ Payment Received' : booking.payment_status}
                  </span>
                </div>
                <div className="sec-body">
                  <div className="pay-row">
                    <span className="pay-lbl">Room rate ({booking.nights} night{booking.nights !== 1 ? 's' : ''} × ${Number(listing.price_per_night || 0).toFixed(0)})</span>
                    <span className="pay-val">${Number((booking.price_per_night || listing.price_per_night || 0) * (booking.nights || 1)).toFixed(2)}</span>
                  </div>
                  {Number(booking.cleaning_fee) > 0 && (
                    <div className="pay-row">
                      <span className="pay-lbl">Cleaning fee</span>
                      <span className="pay-val">${Number(booking.cleaning_fee).toFixed(2)}</span>
                    </div>
                  )}
                  {/* Guest total box */}
                  <div style={{ background: '#1a1916', border: '1px solid #2a2825', borderRadius: 9, padding: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e3dc' }}>Guest Total Paid</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: '#22c55e' }}>${Number(booking.total_amount || 0).toFixed(2)}</div>
                  </div>

                  {/* Platform fee deduction */}
                  <div style={{ height: 1, background: '#2a2825', margin: '10px 0' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b6560', marginBottom: 8 }}>SnapReserve Platform Fee</div>
                  <div className="pay-row">
                    <span className="pay-lbl" style={{ color: '#ef4444' }}>Platform fee (7%)</span>
                    <span className="pay-val" style={{ color: '#ef4444' }}>−${Number(booking.platform_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="pay-row">
                    <span className="pay-lbl" style={{ color: '#ef4444' }}>Fixed fee per booking</span>
                    <span className="pay-val" style={{ color: '#ef4444' }}>−${Number(booking.platform_fixed_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="pay-row" style={{ borderTop: '1px dashed #2a2825', paddingTop: 8, marginTop: 4 }}>
                    <span className="pay-lbl" style={{ color: '#ef4444', fontWeight: 700 }}>Total platform fee</span>
                    <span className="pay-val" style={{ color: '#ef4444', fontWeight: 700 }}>−${Number(booking.total_platform_fee || 0).toFixed(2)}</span>
                  </div>

                  {/* Host payout */}
                  <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.28)', borderRadius: 9, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>Your Payout</div>
                      <div style={{ fontSize: 9, color: '#7a7670', marginTop: 2 }}>
                        {isCompleted ? 'Released after checkout' : isCheckedIn ? 'Releasing after checkout' : 'Released after completion'}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: '#22c55e' }}>${Number(booking.host_earnings || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#7a7670', marginTop: 8, padding: '8px 12px', background: '#1a1916', borderRadius: 7, border: '1px solid #2a2825', lineHeight: 1.6 }}>
                    💡 Payout is released automatically after guest checkout. Funds arrive in 2–5 business days.
                  </div>
                </div>
              </div>

            </div>{/* /left */}

            {/* ── Right ── */}
            <div className="bd-right">

              {/* Countdown (only for upcoming/confirmed) */}
              {isConfirmed && new Date(booking.check_in) > new Date() && (
                <Countdown checkIn={booking.check_in} />
              )}

              {/* Checked-in banner */}
              {isCheckedIn && (
                <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.28)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🟢</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 3 }}>Guest is In House</div>
                  <div style={{ fontSize: 10, color: '#7a7670' }}>
                    Checked in {booking.checked_in_at ? fmtDate(booking.checked_in_at, { month: 'short', day: 'numeric' }) + ' at ' + fmtTime(booking.checked_in_at) : ''}
                  </div>
                  <div style={{ fontSize: 9, color: '#7a7670', marginTop: 4 }}>
                    Checkout: {fmtDate(booking.check_out, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}

              {/* Completed banner */}
              {isCompleted && (
                <div style={{ background: 'rgba(168,162,158,.08)', border: '1px solid rgba(168,162,158,.18)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a8a29e', marginBottom: 2 }}>Stay Completed</div>
                  <div style={{ fontSize: 10, color: '#7a7670' }}>Checked out {fmtDate(booking.check_out, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="ac-card">
                <div className="ac-title">Quick Actions</div>

                {canCheckIn && (
                  <button className="ac-btn primary" onClick={handleCheckIn} disabled={checkinLoading}>
                    <span style={{ fontSize: 15 }}>✅</span>
                    <div>
                      <div>{checkinLoading ? 'Checking in…' : 'Confirm Check-in'}</div>
                      <div className="ac-btn-desc">Mark guest as arrived</div>
                    </div>
                  </button>
                )}

                {isCheckedIn && (
                  <button className="ac-btn success" disabled>
                    <span style={{ fontSize: 15 }}>🟢</span>
                    <div>
                      <div>Guest Checked In</div>
                      <div className="ac-btn-desc">Completes automatically after checkout</div>
                    </div>
                  </button>
                )}

                <button className="ac-btn">
                  <span style={{ fontSize: 15 }}>📩</span>
                  <div>
                    <div>Message {guest.full_name.split(' ')[0]}</div>
                    <div className="ac-btn-desc">Send a direct message</div>
                  </div>
                </button>

                {canCancel && (
                  <button className="ac-btn danger" onClick={() => setCancelModal(true)}>
                    <span style={{ fontSize: 15 }}>✕</span>
                    <div>
                      <div>Cancel Booking</div>
                      <div className="ac-btn-desc">Full refund issued to guest</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Booking summary */}
              <div className="ic-card">
                <div className="ic-head">Booking Summary</div>
                <div className="ic-body">
                  <div className="ic-row">
                    <span className="ic-lbl">Booking ID</span>
                    <span className="ic-val">{booking.reference || booking.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Status</span>
                    <span className="ic-val" style={{ color: sc.color, fontFamily: 'inherit' }}>{sc.label}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Check-in</span>
                    <span className="ic-val">{fmtDate(booking.check_in, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Check-out</span>
                    <span className="ic-val">{fmtDate(booking.check_out, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Duration</span>
                    <span className="ic-val">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Guests</span>
                    <span className="ic-val">{booking.guests ?? '—'}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Policy</span>
                    <span className="ic-val" style={{ fontFamily: 'inherit', textTransform: 'capitalize' }}>{listing.cancellation_policy || 'Moderate'}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Your Payout</span>
                    <span className="ic-val" style={{ color: '#22c55e' }}>${Number(booking.host_earnings || 0).toFixed(2)}</span>
                  </div>
                  {booking.checked_in_at && (
                    <div className="ic-row">
                      <span className="ic-lbl">Checked In</span>
                      <span className="ic-val">{fmtDate(booking.checked_in_at, { month: 'short', day: 'numeric' })} {fmtTime(booking.checked_in_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Guest trust */}
              <div className="ic-card">
                <div className="ic-head">Guest Info</div>
                <div className="ic-body">
                  <div className="ic-row">
                    <span className="ic-lbl">Name</span>
                    <span className="ic-val" style={{ fontFamily: 'inherit' }}>{guest.full_name}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Total Stays</span>
                    <span className="ic-val">{guest.total_stays}</span>
                  </div>
                  <div className="ic-row">
                    <span className="ic-lbl">Stays Here</span>
                    <span className="ic-val" style={{ color: guest.stays_here > 0 ? '#3b82f6' : undefined }}>{guest.stays_here > 0 ? `${guest.stays_here}× repeat` : 'First time'}</span>
                  </div>
                  {guest.created_at && (
                    <div className="ic-row">
                      <span className="ic-lbl">Member Since</span>
                      <span className="ic-val">{fmtDate(guest.created_at, { month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>{/* /right */}
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {cancelModal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setCancelModal(false)}>
          <div className="modal-box">
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#e8e3dc', marginBottom: 6 }}>Cancel Booking</div>
            <div style={{ fontSize: '0.8rem', color: '#7a7670', marginBottom: 16, lineHeight: 1.6 }}>
              This will cancel <strong style={{ color: '#e8622a' }}>{booking.reference || booking.id.slice(0,8).toUpperCase()}</strong> and issue a full refund to {guest.full_name}.
              This action cannot be undone.
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#a8a29e', marginBottom: 6 }}>Cancellation reason (required)</div>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Property unavailable due to maintenance…"
              rows={3}
              style={{ width: '100%', background: '#0f0e0c', border: '1px solid #2a2825', borderRadius: 10, padding: '9px 12px', fontSize: '0.84rem', color: '#e8e3dc', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setCancelModal(false)}
                style={{ flex: 1, background: '#1a1916', border: '1px solid #2a2825', borderRadius: 10, padding: 10, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: '#7a7670', fontFamily: 'inherit' }}>
                Keep booking
              </button>
              <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontSize: '0.86rem', fontWeight: 700, cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: (cancelling || !cancelReason.trim()) ? 0.6 : 1 }}>
                {cancelling ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
