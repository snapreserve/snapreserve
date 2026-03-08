'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import HostSidebar from '@/app/host/_components/HostSidebar'

/* ─── constants ─────────────────────────────────────────────────── */

const STATUS_CFG = {
  pending:    { label: 'Pending',    color: 'var(--sr-yellow)', bg: 'var(--sr-yellowl)', border: 'var(--sr-yellow)' },
  confirmed:  { label: 'Confirmed',  color: 'var(--sr-green)',  bg: 'var(--sr-greenl)',  border: 'var(--sr-green)'  },
  checked_in: { label: 'Checked In', color: 'var(--sr-orange)', bg: 'var(--sr-ol)',      border: 'var(--sr-orange)' },
  completed:  { label: 'Completed',  color: 'var(--sr-muted)',  bg: 'var(--sr-overlay-sm)', border: 'var(--sr-border)' },
  cancelled:  { label: 'Cancelled',  color: 'var(--sr-red)',    bg: 'var(--sr-redl)',    border: 'var(--sr-red)'    },
  refunded:   { label: 'Refunded',   color: 'var(--sr-red)',    bg: 'var(--sr-redl)',    border: 'var(--sr-red)'    },
}

const CHECKLIST = [
  'ID verified at arrival',
  'Keys / access codes handed over',
  'Property walkthrough completed',
  'House rules reviewed with guest',
]

const AV_COLORS = ['#7B5EA7', '#1E40AF', '#065F46', '#92400E', '#9F1239', '#1D4ED8', '#047857']

/* ─── helpers ───────────────────────────────────────────────────── */

function fmtDate(d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return d ? new Date(d).toLocaleDateString('en-US', opts) : '—'
}
function fmtTime(d) {
  return d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
}
function fmt12hr(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function inits(name) {
  return (name || '').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'G'
}
function avColor(name) {
  return AV_COLORS[Math.abs((name || '').charCodeAt(0)) % AV_COLORS.length]
}

/* ─── sub-components ────────────────────────────────────────────── */

function GuestAvatar({ avatarUrl, name, size = 52 }) {
  const [err, setErr] = useState(false)
  if (avatarUrl && !err) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--sr-border)' }}
      />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.31, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: '-0.5px' }}>
      {inits(name)}
    </div>
  )
}

function PropertyHero({ listing }) {
  const [err, setErr] = useState(false)
  const img = Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : null
  const typeIcon = listing.property_type === 'hotel' ? '🏨' : '🏡'
  const typeLabel = listing.property_type === 'hotel' ? 'Hotel' : 'Private Stay'

  if (img && !err) {
    return (
      <div className="bdc-hero" style={{ background: 'var(--sr-card2)' }}>
        <img src={img} alt={listing.title} onError={() => setErr(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div className="bdc-hero-overlay" />
        <div style={{ position: 'absolute', bottom: 14, left: 20, zIndex: 1 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.35)', borderRadius: 6, padding: '3px 8px', backdropFilter: 'blur(6px)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {typeIcon} {typeLabel}
          </span>
        </div>
      </div>
    )
  }

  // Fallback gradient
  return (
    <div className="bdc-hero" style={{ background: 'linear-gradient(135deg, #1a2a5e, #2d4a9e 40%, #3d6ac4 70%, #4d88e8)' }}>
      <div className="bdc-hero-overlay" />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 48, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.3))' }}>{typeIcon}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 8, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{typeLabel}</div>
      </div>
    </div>
  )
}

function PayoutStatus({ bookingStatus, paymentStatus }) {
  if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') {
    return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sr-red)', background: 'var(--sr-redl)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--sr-red)' }}>Refunded</span>
  }
  if (bookingStatus === 'completed') {
    return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sr-green)', background: 'var(--sr-greenl)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--sr-green)' }}>Released</span>
  }
  if (bookingStatus === 'checked_in') {
    return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sr-orange)', background: 'var(--sr-ol)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--sr-orange)' }}>Releasing on checkout</span>
  }
  return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sr-yellow)', background: 'var(--sr-yellowl)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--sr-yellow)' }}>Pending</span>
}

function Timeline({ booking, total, ref: bookingRef }) {
  const events = []

  events.push({
    id: 'created', time: booking.created_at, icon: '📋',
    label: 'Booking received', sub: `Ref ${bookingRef}`, color: 'blue', done: true,
  })

  if (booking.payment_status === 'paid') {
    events.push({
      id: 'paid', time: booking.created_at, icon: '💳',
      label: 'Payment received', sub: `$${total.toFixed(2)} collected`, color: 'green', done: true,
    })
  }

  if (['confirmed', 'checked_in', 'completed'].includes(booking.status)) {
    events.push({
      id: 'confirmed', time: booking.created_at, icon: '✓',
      label: 'Booking confirmed', sub: 'Confirmation sent to guest', color: 'green', done: true,
    })
  }

  if (booking.checked_in_at) {
    events.push({
      id: 'checkin', time: booking.checked_in_at, icon: '🏠',
      label: 'Guest checked in',
      sub: fmtDate(booking.checked_in_at, { month: 'short', day: 'numeric' }) + ' · ' + fmtTime(booking.checked_in_at),
      color: 'orange', done: true,
    })
  } else if (booking.status === 'confirmed') {
    events.push({
      id: 'upcoming_ci', time: booking.check_in, icon: '🗓',
      label: 'Check-in', sub: fmtDate(booking.check_in, { month: 'short', day: 'numeric', year: 'numeric' }),
      color: 'sub', done: false, upcoming: true,
    })
  }

  if (booking.status === 'completed') {
    events.push({
      id: 'completed', time: booking.check_out, icon: '✅',
      label: 'Stay completed', sub: `Checked out ${fmtDate(booking.check_out, { month: 'short', day: 'numeric' })}`,
      color: 'green', done: true,
    })
  } else if (booking.status === 'checked_in') {
    events.push({
      id: 'upcoming_co', time: booking.check_out, icon: '🚪',
      label: 'Checkout', sub: fmtDate(booking.check_out, { month: 'short', day: 'numeric', year: 'numeric' }),
      color: 'sub', done: false, upcoming: true,
    })
  }

  if (booking.cancelled_at || booking.status === 'cancelled') {
    events.push({
      id: 'cancelled', time: booking.cancelled_at, icon: '✕',
      label: 'Booking cancelled',
      sub: booking.cancellation_reason
        ? booking.cancellation_reason.slice(0, 72)
        : `Cancelled by ${booking.cancelled_by_role || 'host'}`,
      color: 'red', done: true,
    })
    // When host cancelled, show refund to guest — pending admin approval, or approved
    const refundAmt = Number(booking.refund_amount) || 0
    if (booking.cancelled_by_role === 'host' && refundAmt > 0) {
      const approved = booking.payment_status === 'refund_pending' || booking.payment_status === 'refunded'
      events.push({
        id: 'refund_to_guest',
        time: booking.cancelled_at,
        icon: '↩',
        label: 'Refund to guest',
        sub: approved
          ? `$${refundAmt.toFixed(2)} — approved; guest will receive refund`
          : `$${refundAmt.toFixed(2)} — pending admin approval (Refunds → Pending)`,
        color: approved ? 'green' : 'yellow',
        done: approved,
      })
    }
  }

  const colorMap = {
    blue:   { dot: 'var(--sr-blue)',   bg: 'var(--sr-bluel)'   },
    green:  { dot: 'var(--sr-green)',  bg: 'var(--sr-greenl)'  },
    orange: { dot: 'var(--sr-orange)', bg: 'var(--sr-ol)'      },
    yellow: { dot: 'var(--sr-yellow)', bg: 'var(--sr-yellowl)' },
    red:    { dot: 'var(--sr-red)',    bg: 'var(--sr-redl)'    },
    sub:    { dot: 'var(--sr-sub)',    bg: 'var(--sr-overlay-sm)' },
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {events.map((ev, i) => {
        const c = colorMap[ev.color] || colorMap.sub
        return (
          <div key={ev.id} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: i < events.length - 1 ? 18 : 0 }}>
            {/* connector line */}
            {i < events.length - 1 && (
              <div style={{ position: 'absolute', left: 15, top: 28, bottom: 0, width: 1, background: ev.done ? 'var(--sr-border2)' : 'var(--sr-border)', borderLeft: ev.upcoming ? '1px dashed var(--sr-border)' : undefined }} />
            )}
            {/* dot */}
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: ev.done ? c.bg : 'var(--sr-overlay-xs)', border: `1.5px solid ${ev.done ? c.dot : 'var(--sr-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, zIndex: 1, color: ev.done ? c.dot : 'var(--sr-sub)' }}>
              {ev.icon}
            </div>
            {/* text */}
            <div style={{ paddingTop: 4, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: ev.done ? 600 : 500, color: ev.done ? 'var(--sr-text)' : 'var(--sr-sub)' }}>{ev.label}</div>
              <div style={{ fontSize: 11, color: 'var(--sr-sub)', marginTop: 1 }}>{ev.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Countdown({ checkIn }) {
  const [p, setP] = useState({ days: 0, hrs: 0, mins: 0, past: false })
  useEffect(() => {
    const calc = () => {
      const diff = new Date(checkIn) - Date.now()
      if (diff <= 0) { setP({ days: 0, hrs: 0, mins: 0, past: true }); return }
      setP({ days: Math.floor(diff / 86400000), hrs: Math.floor((diff % 86400000) / 3600000), mins: Math.floor((diff % 3600000) / 60000), past: false })
    }
    calc(); const t = setInterval(calc, 30000); return () => clearInterval(t)
  }, [checkIn])

  if (p.past) return null
  return (
    <div style={{ background: 'linear-gradient(135deg, var(--sr-orange), var(--sr-orange2))', borderRadius: 14, padding: 20, color: '#fff', marginBottom: 16 }}>
      <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', opacity: .7, marginBottom: 14, fontWeight: 600 }}>Check-In Countdown</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
        {[['days', p.days], ['hrs', p.hrs], ['min', p.mins]].map(([lbl, val], i) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ fontSize: 24, opacity: .5, fontWeight: 300, paddingBottom: 14 }}>:</span>}
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontFamily: 'var(--sr-font-display)', fontSize: 36, fontWeight: 600, lineHeight: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', minWidth: 56, textAlign: 'center' }}>{String(val).padStart(2, '0')}</span>
              <div style={{ fontSize: 9, opacity: .65, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{lbl}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12.5, opacity: .75, fontWeight: 500 }}>{fmtDate(checkIn, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  )
}

/* ─── main component ────────────────────────────────────────────── */

export default function BookingDetailClient({ booking, guest, room, pastStaysHere, hostName, hostAvatar, isFounder, feeRate, myRole = 'owner' }) {
  const [tab, setTab]                   = useState('details')
  const [status, setStatus]             = useState(booking.status)
  const [checkedInAt, setCheckedInAt]   = useState(booking.checked_in_at)
  const [cancelModal, setCancelModal]   = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling]     = useState(false)
  const [toast, setToast]               = useState(null)
  const [checkinModal, setCheckinModal]   = useState(false)
  const [checkinChecks, setCheckinChecks] = useState([true, true, false, false])
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [successModal, setSuccessModal]   = useState(false)
  const [hostNotes, setHostNotes]         = useState(booking.host_notes || '')
  const [notesSaving, setNotesSaving]     = useState(false)
  const [notesSaved, setNotesSaved]       = useState(false)

  function showToast(msg, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  async function handleCheckIn() {
    setCheckinLoading(true)
    const res = await fetch(`/api/host/bookings/${booking.id}/checkin`, { method: 'POST' })
    const data = await res.json()
    setCheckinLoading(false)
    if (res.ok) {
      setCheckinModal(false); setStatus('checked_in'); setCheckedInAt(data.checked_in_at); setSuccessModal(true)
    } else { showToast(data.error || 'Failed to check in', false) }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return
    setCancelling(true)
    const res = await fetch(`/api/host/bookings/${booking.id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    })
    if (res.ok) { setStatus('cancelled'); setCancelModal(false); showToast('Booking cancelled.') }
    else { const d = await res.json(); showToast(d.error || 'Failed to cancel', false) }
    setCancelling(false)
  }

  async function saveNotes() {
    setNotesSaving(true)
    const res = await fetch(`/api/host/bookings/${booking.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_notes: hostNotes }),
    })
    setNotesSaving(false)
    if (res.ok) { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000) }
    else showToast('Failed to save notes', false)
  }

  const sc          = STATUS_CFG[status] || STATUS_CFG.pending
  const listing     = booking.listings || {}
  const isConfirmed = status === 'confirmed'
  const isCheckedIn = status === 'checked_in'
  const isCompleted = status === 'completed'
  const isCancelled = status === 'cancelled' || status === 'refunded'
  const canCheckIn  = isConfirmed
  const canCancel   = ['pending', 'confirmed'].includes(status)
  const ref         = booking.reference || booking.id.slice(0, 8).toUpperCase()

  const total          = Number(booking.total_amount || 0)
  const platFee        = Number(booking.total_platform_fee || booking.platform_fee || 0)
  const hostEarnings   = Number(booking.host_earnings || 0)
  const pricePerNight  = Number(booking.price_per_night || listing.price_per_night || 0)
  const nights         = Number(booking.nights || 1)
  const cleaningFee    = Number(booking.cleaning_fee || 0)
  const serviceFee     = Number(booking.service_fee || 0)
  const discountAmt    = Number(booking.discount_amount || 0)
  const roomSubtotal   = Math.round(pricePerNight * nights * 100) / 100
  const standardFee    = Math.round(total * 0.08 * 100) / 100
  const founderSaving  = isFounder ? Math.round((standardFee - platFee) * 100) / 100 : 0

  // Check-in/out display times from listing
  const checkinStartFmt  = fmt12hr(listing.checkin_start_time) || '3:00 PM'
  const checkinEndFmt    = fmt12hr(listing.checkin_end_time)
  const checkinTimeDisplay = checkinEndFmt ? `${checkinStartFmt} – ${checkinEndFmt}` : `After ${checkinStartFmt}`
  const checkoutDisplay  = listing.checkout_time ? `Before ${fmt12hr(listing.checkout_time)}` : 'Before 11:00 AM'

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .bdc-wrap  { display: flex; min-height: 100vh; background: var(--sr-bg); }
        .bdc-main  { margin-left: 240px; flex: 1; min-height: 100vh; background: var(--sr-bg); }

        /* topbar */
        .bdc-topbar { background: var(--sr-surface); padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--sr-border); position: sticky; top: 0; z-index: 50; gap: 16px; }
        .bdc-bc { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--sr-sub); min-width: 0; flex: 1; }
        .bdc-bc a { color: var(--sr-sub); text-decoration: none; white-space: nowrap; transition: color .12s; }
        .bdc-bc a:hover { color: var(--sr-orange); }
        .bdc-bc-sep { opacity: .4; flex-shrink: 0; }
        .bdc-bc-cur { color: var(--sr-text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bdc-tb-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .bdc-btn-ghost { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--sr-border); background: transparent; color: var(--sr-sub); font-size: 12.5px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .12s; font-family: var(--sr-font-sans); }
        .bdc-btn-ghost:hover { background: var(--sr-overlay-sm); color: var(--sr-text); }
        .bdc-btn-danger { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--sr-redl); background: transparent; color: var(--sr-red); font-size: 12.5px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .12s; font-family: var(--sr-font-sans); }
        .bdc-btn-danger:hover { background: var(--sr-redl); }
        .bdc-btn-danger:disabled { opacity: .4; cursor: not-allowed; }

        /* layout */
        .bdc-layout { display: grid; grid-template-columns: 1fr 308px; gap: 22px; padding: 26px 32px; align-items: start; }

        /* hero */
        .bdc-hero { height: 200px; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; position: relative; }
        .bdc-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.45)); }

        /* booking meta */
        .bdc-booking-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .bdc-meta-left { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .bdc-bid { font-size: 13px; font-weight: 700; color: var(--sr-orange); background: var(--sr-ol); padding: 3px 10px; border-radius: 6px; }
        .bdc-sbadge { padding: 3px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600; letter-spacing: .2px; border: 1px solid; }
        .bdc-booked { font-size: 11.5px; color: var(--sr-sub); white-space: nowrap; }
        .bdc-prop-title { font-family: var(--sr-font-display); font-size: 22px; font-weight: 600; letter-spacing: -.3px; margin-bottom: 18px; color: var(--sr-text); line-height: 1.25; }

        /* cards */
        .bdc-card { background: var(--sr-card); border-radius: 14px; border: 1px solid var(--sr-border); margin-bottom: 16px; overflow: hidden; }
        .bdc-card-hd { padding: 14px 20px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--sr-border); }
        .bdc-card-title { font-size: 13px; font-weight: 600; color: var(--sr-text); display: flex; align-items: center; gap: 7px; }
        .bdc-card-body { padding: 18px 20px; }

        /* guest profile */
        .bdc-guest-header { display: flex; align-items: center; gap: 14px; padding: 18px 20px 14px; border-bottom: 1px solid var(--sr-border); }
        .bdc-g-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--sr-text); }
        .bdc-g-contact { font-size: 12px; color: var(--sr-sub); display: flex; flex-direction: column; gap: 3px; }
        .bdc-g-contact span { display: flex; align-items: center; gap: 5px; }
        .bdc-verif-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 12px 20px; border-bottom: 1px solid var(--sr-border); }
        .bdc-verif-badge { font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 5px; border: 1px solid; display: flex; align-items: center; gap: 4px; }
        .bdc-guest-stats { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid var(--sr-border); }
        .bdc-gstat { padding: 12px 14px; text-align: center; border-right: 1px solid var(--sr-border); }
        .bdc-gstat:last-child { border-right: none; }
        .bdc-gstat-val { font-family: var(--sr-font-display); font-size: 22px; font-weight: 700; color: var(--sr-text); line-height: 1; }
        .bdc-gstat-lbl { font-size: 10px; color: var(--sr-sub); margin-top: 3px; text-transform: uppercase; letter-spacing: .8px; font-weight: 600; }

        /* tabs */
        .bdc-tabs { display: flex; border-bottom: 1px solid var(--sr-border); padding: 0 20px; }
        .bdc-tab { padding: 10px 14px; font-size: 12.5px; font-weight: 500; color: var(--sr-sub); cursor: pointer; border: none; background: transparent; font-family: var(--sr-font-sans); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .12s; }
        .bdc-tab:hover { color: var(--sr-text); }
        .bdc-tab.on { color: var(--sr-orange); border-bottom-color: var(--sr-orange); font-weight: 600; }
        .bdc-tab-pane { display: none; padding: 18px 20px; }
        .bdc-tab-pane.on { display: block; }

        /* detail rows */
        .bdc-dl { display: flex; flex-direction: column; gap: 0; }
        .bdc-dl-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--sr-border); }
        .bdc-dl-row:last-child { border-bottom: none; }
        .bdc-dl-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; margin-top: 1px; }
        .bdc-dl-lbl { font-size: 11px; color: var(--sr-sub); margin-bottom: 2px; text-transform: uppercase; letter-spacing: .6px; font-weight: 600; }
        .bdc-dl-val { font-size: 13.5px; font-weight: 500; color: var(--sr-text); }
        .bdc-dl-sub { font-size: 11px; color: var(--sr-sub); margin-top: 2px; }

        /* special requests */
        .bdc-sreq { padding: 14px 16px; background: var(--sr-overlay-xs); border-radius: 10px; border: 1px solid var(--sr-border); margin-bottom: 14px; }
        .bdc-sreq-text { font-size: 13px; color: var(--sr-text); line-height: 1.6; font-style: italic; }
        .bdc-empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; }
        .bdc-empty-icon { font-size: 28px; margin-bottom: 8px; opacity: .5; }
        .bdc-empty-title { font-size: 13px; font-weight: 600; color: var(--sr-muted); margin-bottom: 4px; }
        .bdc-empty-sub { font-size: 11.5px; color: var(--sr-sub); line-height: 1.5; }

        /* past stays */
        .bdc-stay-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--sr-border); }
        .bdc-stay-row:last-child { border-bottom: none; }

        /* payment */
        .bdc-pay-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--sr-border); font-size: 13px; }
        .bdc-pay-row:last-child { border-bottom: none; }
        .bdc-pay-lbl { color: var(--sr-muted); }
        .bdc-pay-val { font-weight: 500; color: var(--sr-text); }
        .bdc-pay-divider { border-top: 1.5px solid var(--sr-border2); margin: 6px 0; padding-top: 10px; }
        .bdc-platform-box { background: var(--sr-overlay-xs); border-radius: 10px; padding: 14px 16px; margin-top: 14px; border: 1px solid var(--sr-border); }
        .bdc-plat-lbl { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--sr-sub); margin-bottom: 10px; font-weight: 700; }
        .bdc-payout-highlight { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; margin-top: 10px; border-top: 1px solid var(--sr-border); }

        /* payment / payout status pills */
        .bdc-pay-status-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--sr-border); }

        /* host notes */
        .bdc-notes-ta { width: 100%; background: var(--sr-overlay-xs); border: 1px solid var(--sr-border); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: var(--sr-text); font-family: var(--sr-font-sans); line-height: 1.6; resize: vertical; outline: none; min-height: 90px; transition: border-color .15s; }
        .bdc-notes-ta:focus { border-color: var(--sr-orange); }
        .bdc-notes-ta::placeholder { color: var(--sr-sub); }
        .bdc-notes-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .bdc-notes-hint { font-size: 11px; color: var(--sr-sub); }
        .bdc-notes-btn { padding: 7px 16px; border-radius: 8px; border: none; background: var(--sr-orange); color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: var(--sr-font-sans); transition: opacity .15s; }
        .bdc-notes-btn:disabled { opacity: .5; cursor: not-allowed; }
        .bdc-notes-btn:not(:disabled):hover { opacity: .85; }

        /* right column cards */
        .bdc-rc-card { background: var(--sr-card); border-radius: 14px; border: 1px solid var(--sr-border); margin-bottom: 14px; overflow: hidden; }
        .bdc-rc-hd { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--sr-sub); font-weight: 700; padding: 14px 18px 10px; border-bottom: 1px solid var(--sr-border); }
        .bdc-rc-body { padding: 14px 18px; }
        .bdc-sum-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--sr-border); font-size: 12.5px; }
        .bdc-sum-row:last-child { border-bottom: none; }
        .bdc-s-lbl { color: var(--sr-sub); }
        .bdc-s-val { font-weight: 500; color: var(--sr-text); }
        .bdc-qa-btn { display: flex; align-items: center; gap: 12px; padding: 12px 18px; cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; font-family: var(--sr-font-sans); transition: background .12s; border-top: 1px solid var(--sr-border); }
        .bdc-qa-btn:first-of-type { border-top: none; }
        .bdc-qa-btn:hover:not(:disabled) { background: var(--sr-overlay-xs); }
        .bdc-qa-btn:disabled { opacity: .4; cursor: not-allowed; }
        .bdc-qa-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .bdc-qa-btn-title { font-size: 13px; font-weight: 600; color: var(--sr-text); }
        .bdc-qa-btn-sub { font-size: 11px; color: var(--sr-sub); margin-top: 1px; }

        /* modals */
        .bdc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; animation: bdc-fadein .2s ease; }
        @keyframes bdc-fadein  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bdc-slideup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .bdc-modal { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 20px; padding: 36px; width: 480px; max-width: 90vw; box-shadow: 0 24px 64px rgba(0,0,0,.35); animation: bdc-slideup .25s ease; }
        .bdc-modal-icon { width: 64px; height: 64px; border-radius: 18px; background: var(--sr-greenl); display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px; }
        .bdc-modal-title { font-family: var(--sr-font-display); font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 6px; color: var(--sr-text); }
        .bdc-modal-sub { font-size: 13px; color: var(--sr-sub); text-align: center; margin-bottom: 24px; line-height: 1.5; }
        .bdc-modal-info { background: var(--sr-overlay-xs); border-radius: 12px; border: 1px solid var(--sr-border); padding: 16px 18px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 10px; }
        .bdc-mi-lbl { font-size: 10.5px; color: var(--sr-sub); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
        .bdc-mi-val { font-size: 13.5px; font-weight: 600; color: var(--sr-text); }
        .bdc-cl-title { font-size: 12px; font-weight: 600; color: var(--sr-sub); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px; }
        .bdc-check { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; margin-bottom: 6px; background: var(--sr-overlay-xs); border: 1px solid var(--sr-border); cursor: pointer; transition: all .12s; user-select: none; }
        .bdc-check:hover { border-color: var(--sr-green); background: var(--sr-greenl); }
        .bdc-check.on { background: var(--sr-greenl); border-color: var(--sr-green); }
        .bdc-check-box { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--sr-border); background: var(--sr-card); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; transition: all .12s; color: var(--sr-green); }
        .bdc-check.on .bdc-check-box { background: var(--sr-green); border-color: var(--sr-green); color: #fff; }
        .bdc-check-text { font-size: 13px; font-weight: 500; color: var(--sr-text); }
        .bdc-modal-actions { display: flex; gap: 10px; margin-top: 24px; }
        .bdc-btn-cancel { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--sr-border); background: transparent; font-family: var(--sr-font-sans); font-size: 13.5px; font-weight: 500; color: var(--sr-sub); cursor: pointer; transition: all .12s; }
        .bdc-btn-cancel:hover { background: var(--sr-overlay-sm); }
        .bdc-btn-ci { flex: 2; padding: 12px; border-radius: 10px; border: none; background: var(--sr-green); font-family: var(--sr-font-sans); font-size: 13.5px; font-weight: 600; color: #fff; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .bdc-btn-ci:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
        .bdc-btn-ci:disabled { opacity: .5; cursor: not-allowed; transform: none; }
        .bdc-success-modal { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 20px; padding: 44px 36px; width: 420px; max-width: 90vw; text-align: center; box-shadow: 0 24px 64px rgba(0,0,0,.35); animation: bdc-slideup .3s ease; }
        .bdc-success-ring { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--sr-green), #3aad75); display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; box-shadow: 0 8px 24px var(--sr-greenl); }
        .bdc-success-title { font-family: var(--sr-font-display); font-size: 26px; font-weight: 600; margin-bottom: 8px; color: var(--sr-text); }
        .bdc-success-sub { font-size: 14px; color: var(--sr-sub); margin-bottom: 28px; line-height: 1.5; }
        .bdc-success-details { background: var(--sr-greenl); border-radius: 12px; border: 1px solid var(--sr-green); padding: 16px 20px; margin-bottom: 28px; display: flex; gap: 20px; justify-content: center; text-align: center; }
        .bdc-sd-val { font-size: 16px; font-weight: 700; color: var(--sr-green); }
        .bdc-sd-lbl { font-size: 11px; color: var(--sr-sub); margin-top: 2px; }
        .bdc-btn-done { width: 100%; padding: 13px; border-radius: 10px; border: none; background: var(--sr-text); font-family: var(--sr-font-sans); font-size: 14px; font-weight: 600; color: var(--sr-bg); cursor: pointer; transition: all .15s; }
        .bdc-btn-done:hover { opacity: .85; }
        .bdc-cancel-modal { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 20px; padding: 28px; width: 460px; max-width: 90vw; box-shadow: 0 24px 64px rgba(0,0,0,.35); animation: bdc-slideup .22s ease; }

        .bdc-toast { position: fixed; bottom: 24px; right: 24px; z-index: 500; padding: 11px 18px; border-radius: 10px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,.25); }

        @media (max-width: 900px)  { .bdc-layout { grid-template-columns: 1fr; padding: 16px; } }
        @media (max-width: 768px)  { .bdc-main { margin-left: 0; } }
      `}</style>

      {toast && (
        <div className="bdc-toast" style={{ background: toast.ok ? 'var(--sr-greenl)' : 'var(--sr-redl)', color: toast.ok ? 'var(--sr-green)' : 'var(--sr-red)', border: `1px solid ${toast.ok ? 'var(--sr-green)' : 'var(--sr-red)'}` }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="bdc-wrap">
        <HostSidebar myRole={myRole} userName={hostName} userAvatar={hostAvatar} isFounder={isFounder} />

        <div className="bdc-main">
          {/* Topbar */}
          <div className="bdc-topbar">
            <div className="bdc-bc">
              <Link href="/host/dashboard">← Bookings</Link>
              <span className="bdc-bc-sep">/</span>
              <span style={{ color: 'var(--sr-orange)', fontWeight: 700 }}>{ref}</span>
              <span className="bdc-bc-sep">/</span>
              <span className="bdc-bc-cur">{guest.full_name}</span>
            </div>
            <div className="bdc-tb-actions">
              <button className="bdc-btn-ghost">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Contact Guest
              </button>
              <button className="bdc-btn-danger" disabled={!canCancel} onClick={() => setCancelModal(true)}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                Cancel
              </button>
            </div>
          </div>

          <div className="bdc-layout">
            {/* ── Left column ── */}
            <div>
              {/* Hero */}
              <PropertyHero listing={listing} />

              {/* Booking meta */}
              <div className="bdc-booking-meta">
                <div className="bdc-meta-left">
                  <span className="bdc-bid">{ref}</span>
                  <span className="bdc-sbadge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>● {sc.label}</span>
                  {isConfirmed && new Date(booking.check_in) > new Date() && (
                    <span className="bdc-sbadge" style={{ background: 'var(--sr-bluel)', color: 'var(--sr-blue)', borderColor: 'var(--sr-blue)' }}>📅 Upcoming</span>
                  )}
                  {isCheckedIn && (
                    <span className="bdc-sbadge" style={{ background: 'var(--sr-greenl)', color: 'var(--sr-green)', borderColor: 'var(--sr-green)' }}>🟢 In House</span>
                  )}
                  {isFounder && (
                    <span className="bdc-sbadge" style={{ background: 'var(--sr-yellowl)', color: 'var(--sr-yellow)', borderColor: 'var(--sr-yellow)' }}>🏅 Founder</span>
                  )}
                </div>
                <span className="bdc-booked">Booked {fmtDate(booking.created_at)}</span>
              </div>

              <div className="bdc-prop-title">{listing.title || '—'}</div>

              {/* ── Guest Profile Card ── */}
              <div className="bdc-card">
                <div className="bdc-card-hd">
                  <span className="bdc-card-title">👤 Guest Profile</span>
                  {guest.stays_here > 0 && (
                    <span style={{ fontSize: 11.5, color: 'var(--sr-blue)', fontWeight: 600, background: 'var(--sr-bluel)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--sr-blue)' }}>
                      {guest.stays_here}× repeat guest
                    </span>
                  )}
                </div>

                {/* Avatar + name + contact */}
                <div className="bdc-guest-header">
                  <GuestAvatar avatarUrl={guest.avatar_url} name={guest.full_name} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bdc-g-name">{guest.full_name}</div>
                    <div className="bdc-g-contact">
                      {guest.email && <span>✉ {guest.email}</span>}
                      {guest.phone && <span>📱 {guest.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Verification badges */}
                <div className="bdc-verif-row">
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '.8px', marginRight: 4 }}>Verified:</span>
                  <span className="bdc-verif-badge" style={guest.email_verified
                    ? { color: 'var(--sr-green)', background: 'var(--sr-greenl)', borderColor: 'var(--sr-green)' }
                    : { color: 'var(--sr-sub)', background: 'var(--sr-overlay-xs)', borderColor: 'var(--sr-border)' }}>
                    {guest.email_verified ? '✓' : '○'} Email
                  </span>
                  <span className="bdc-verif-badge" style={guest.phone_verified
                    ? { color: 'var(--sr-green)', background: 'var(--sr-greenl)', borderColor: 'var(--sr-green)' }
                    : { color: 'var(--sr-sub)', background: 'var(--sr-overlay-xs)', borderColor: 'var(--sr-border)' }}>
                    {guest.phone_verified ? '✓' : '○'} Phone
                  </span>
                  <span className="bdc-verif-badge" style={guest.id_verified
                    ? { color: 'var(--sr-orange)', background: 'var(--sr-ol)', borderColor: 'var(--sr-orange)' }
                    : { color: 'var(--sr-sub)', background: 'var(--sr-overlay-xs)', borderColor: 'var(--sr-border)' }}>
                    {guest.id_verified ? '✓' : '○'} ID
                  </span>
                </div>

                {/* Stats */}
                <div className="bdc-guest-stats">
                  <div className="bdc-gstat">
                    <div className="bdc-gstat-val">{guest.total_stays}</div>
                    <div className="bdc-gstat-lbl">Total Stays</div>
                  </div>
                  <div className="bdc-gstat">
                    <div className="bdc-gstat-val" style={{ color: guest.stays_here > 0 ? 'var(--sr-blue)' : undefined }}>{guest.stays_here}</div>
                    <div className="bdc-gstat-lbl">Stays Here</div>
                  </div>
                  <div className="bdc-gstat">
                    <div className="bdc-gstat-val" style={{ fontSize: 13, paddingTop: 5 }}>{guest.created_at ? fmtDate(guest.created_at, { month: 'short', year: 'numeric' }) : '—'}</div>
                    <div className="bdc-gstat-lbl">Member Since</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bdc-tabs">
                  {['details', 'past'].map(t => (
                    <button key={t} className={`bdc-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                      {t === 'details' ? 'Stay Details' : `Past Stays${pastStaysHere.length > 0 ? ` (${pastStaysHere.length})` : ''}`}
                    </button>
                  ))}
                </div>

                {/* Stay Details tab */}
                <div className={`bdc-tab-pane${tab === 'details' ? ' on' : ''}`}>
                  {/* Special requests */}
                  {booking.special_requests ? (
                    <div className="bdc-sreq" style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Special Requests</div>
                      <div className="bdc-sreq-text">"{booking.special_requests}"</div>
                    </div>
                  ) : (
                    <div className="bdc-empty-state" style={{ paddingBottom: 8, paddingTop: 8, marginBottom: 10, background: 'var(--sr-overlay-xs)', borderRadius: 10, border: '1px solid var(--sr-border)' }}>
                      <div className="bdc-empty-icon">💬</div>
                      <div className="bdc-empty-title">No special requests</div>
                      <div className="bdc-empty-sub">This guest didn't add any notes or requests at booking.</div>
                    </div>
                  )}

                  <div className="bdc-dl">
                    <div className="bdc-dl-row">
                      <span className="bdc-dl-icon">📅</span>
                      <div>
                        <div className="bdc-dl-lbl">Check-In</div>
                        <div className="bdc-dl-val">{fmtDate(booking.check_in, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        <div className="bdc-dl-sub">{checkinTimeDisplay}</div>
                      </div>
                    </div>
                    <div className="bdc-dl-row">
                      <span className="bdc-dl-icon">🚪</span>
                      <div>
                        <div className="bdc-dl-lbl">Check-Out</div>
                        <div className="bdc-dl-val">{fmtDate(booking.check_out, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        <div className="bdc-dl-sub">{checkoutDisplay}</div>
                      </div>
                    </div>
                    <div className="bdc-dl-row">
                      <span className="bdc-dl-icon">🌙</span>
                      <div>
                        <div className="bdc-dl-lbl">Duration</div>
                        <div className="bdc-dl-val">{nights} night{nights !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="bdc-dl-row">
                      <span className="bdc-dl-icon">👥</span>
                      <div>
                        <div className="bdc-dl-lbl">Guests</div>
                        <div className="bdc-dl-val">{booking.guests ?? '—'} guest{booking.guests !== 1 ? 's' : ''}</div>
                        {listing.max_guests && <div className="bdc-dl-sub">Max {listing.max_guests} allowed</div>}
                      </div>
                    </div>
                    <div className="bdc-dl-row">
                      <span className="bdc-dl-icon">🏡</span>
                      <div>
                        <div className="bdc-dl-lbl">Property</div>
                        <div className="bdc-dl-val">{listing.title || '—'}</div>
                        {(listing.bedrooms || listing.bathrooms) && (
                          <div className="bdc-dl-sub">
                            {[listing.bedrooms && `${listing.bedrooms} bed`, listing.bathrooms && `${listing.bathrooms} bath`].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    {room && (
                      <div className="bdc-dl-row">
                        <span className="bdc-dl-icon">🛏️</span>
                        <div>
                          <div className="bdc-dl-lbl">Room</div>
                          <div className="bdc-dl-val">{room.name}</div>
                          <div className="bdc-dl-sub">
                            {[room.tier, room.bed_type, room.view_type, `$${room.price_per_night}/night`].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bdc-dl-row">
                      <span className="bdc-dl-icon">📋</span>
                      <div>
                        <div className="bdc-dl-lbl">Cancellation Policy</div>
                        <div className="bdc-dl-val" style={{ textTransform: 'capitalize' }}>{listing.cancellation_policy || 'Moderate'}</div>
                      </div>
                    </div>
                    {booking.promo_code && (
                      <div className="bdc-dl-row">
                        <span className="bdc-dl-icon">🏷️</span>
                        <div>
                          <div className="bdc-dl-lbl">Promo Code</div>
                          <div className="bdc-dl-val">{booking.promo_code}</div>
                          {discountAmt > 0 && <div className="bdc-dl-sub" style={{ color: 'var(--sr-green)' }}>−${discountAmt.toFixed(2)} saved</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Past Stays tab */}
                <div className={`bdc-tab-pane${tab === 'past' ? ' on' : ''}`}>
                  {pastStaysHere.length === 0 ? (
                    <div className="bdc-empty-state">
                      <div className="bdc-empty-icon">🏠</div>
                      <div className="bdc-empty-title">First stay at this property</div>
                      <div className="bdc-empty-sub">
                        {guest.total_stays > 0
                          ? `${guest.full_name.split(' ')[0]} has completed ${guest.total_stays} stay${guest.total_stays !== 1 ? 's' : ''} elsewhere on SnapReserve.`
                          : `${guest.full_name.split(' ')[0]} hasn't stayed at this property before.`}
                      </div>
                    </div>
                  ) : pastStaysHere.map(b => (
                    <div key={b.id} className="bdc-stay-row">
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--sr-bluel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🏠</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.listings?.title || listing.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--sr-sub)', marginTop: 2 }}>
                          {fmtDate(b.check_in, { month: 'short', day: 'numeric' })} – {fmtDate(b.check_out, { month: 'short', day: 'numeric', year: 'numeric' })} · {b.nights}n
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sr-text)' }}>${Number(b.total_amount || 0).toFixed(2)}</div>
                        <span style={{ fontSize: 10.5, color: 'var(--sr-green)', fontWeight: 600 }}>✓ Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Payment Breakdown Card ── */}
              <div className="bdc-card">
                <div className="bdc-card-hd">
                  <span className="bdc-card-title">💳 Payment Breakdown</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: booking.payment_status === 'paid' ? 'var(--sr-green)' : 'var(--sr-yellow)' }}>
                    {booking.payment_status === 'paid' ? '✓ Payment Received' : booking.payment_status || 'Pending'}
                  </span>
                </div>
                <div className="bdc-card-body">
                  {/* Guest charge breakdown */}
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8 }}>Guest Charges</div>
                    <div className="bdc-pay-row">
                      <span className="bdc-pay-lbl">${pricePerNight.toFixed(0)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                      <span className="bdc-pay-val">${roomSubtotal.toFixed(2)}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="bdc-pay-row">
                        <span className="bdc-pay-lbl">Cleaning fee</span>
                        <span className="bdc-pay-val">${cleaningFee.toFixed(2)}</span>
                      </div>
                    )}
                    {serviceFee > 0 && (
                      <div className="bdc-pay-row">
                        <span className="bdc-pay-lbl">Taxes &amp; service fee</span>
                        <span className="bdc-pay-val">${serviceFee.toFixed(2)}</span>
                      </div>
                    )}
                    {discountAmt > 0 && (
                      <div className="bdc-pay-row">
                        <span style={{ color: 'var(--sr-green)', fontWeight: 500 }}>🏷 Promo discount ({booking.promo_code})</span>
                        <span style={{ color: 'var(--sr-green)', fontWeight: 600 }}>−${discountAmt.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="bdc-pay-row bdc-pay-divider" style={{ borderBottom: 'none' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sr-text)' }}>Total Paid by Guest</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--sr-text)' }}>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Host earnings */}
                  <div className="bdc-platform-box">
                    <div className="bdc-plat-lbl">Platform Fee Breakdown</div>
                    {isFounder ? (
                      <>
                        <div className="bdc-pay-row" style={{ padding: '5px 0' }}>
                          <span className="bdc-pay-lbl">Standard rate (7.0%)</span>
                          <span style={{ fontSize: 13, color: 'var(--sr-sub)', textDecoration: 'line-through' }}>${standardFee.toFixed(2)}</span>
                        </div>
                        <div className="bdc-pay-row" style={{ padding: '5px 0' }}>
                          <span style={{ fontSize: 13, color: 'var(--sr-orange)', fontWeight: 600 }}>🏅 Founder discount</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sr-green)' }}>−${founderSaving.toFixed(2)}</span>
                        </div>
                        <div className="bdc-pay-row" style={{ padding: '5px 0', borderBottom: 'none' }}>
                          <span className="bdc-pay-lbl">Your fee ({(feeRate * 100).toFixed(1)}%)</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sr-red)' }}>−${platFee.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="bdc-pay-row" style={{ padding: '5px 0', borderBottom: 'none' }}>
                        <span className="bdc-pay-lbl">Platform fee ({total > 0 ? ((platFee / total) * 100).toFixed(1) : '7.0'}%)</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sr-red)' }}>−${platFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="bdc-payout-highlight">
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--sr-text)' }}>Your Payout</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--sr-orange)' }}>${hostEarnings.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Status row */}
                  <div className="bdc-pay-status-row">
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Payment Status</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: booking.payment_status === 'paid' ? 'var(--sr-green)' : 'var(--sr-yellow)', background: booking.payment_status === 'paid' ? 'var(--sr-greenl)' : 'var(--sr-yellowl)', padding: '2px 8px', borderRadius: 5, border: `1px solid ${booking.payment_status === 'paid' ? 'var(--sr-green)' : 'var(--sr-yellow)'}` }}>
                        {booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status || 'Pending'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Payout Status</div>
                      <PayoutStatus bookingStatus={status} paymentStatus={booking.payment_status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Host Notes Card ── */}
              <div className="bdc-card" style={{ marginBottom: 0 }}>
                <div className="bdc-card-hd">
                  <span className="bdc-card-title">🔒 Private Host Notes</span>
                  <span style={{ fontSize: 11, color: 'var(--sr-sub)' }}>Not visible to guests</span>
                </div>
                <div className="bdc-card-body">
                  <textarea
                    className="bdc-notes-ta"
                    placeholder="Add internal notes about this booking — e.g. early check-in arranged, left spare key in lockbox, pet allowed…"
                    value={hostNotes}
                    onChange={e => setHostNotes(e.target.value)}
                    rows={4}
                  />
                  <div className="bdc-notes-footer">
                    <span className="bdc-notes-hint">🔒 Visible to your team only</span>
                    <button
                      className="bdc-notes-btn"
                      onClick={saveNotes}
                      disabled={notesSaving}
                    >
                      {notesSaving ? 'Saving…' : notesSaved ? '✓ Saved' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div>
              {/* Countdown */}
              {isConfirmed && new Date(booking.check_in) > new Date() && <Countdown checkIn={booking.check_in} />}

              {/* In-house banner */}
              {isCheckedIn && (
                <div style={{ background: 'var(--sr-greenl)', border: '1px solid var(--sr-green)', borderRadius: 14, padding: '18px 20px', marginBottom: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🟢</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sr-green)', marginBottom: 3 }}>Guest is In House</div>
                  <div style={{ fontSize: 11.5, color: 'var(--sr-sub)' }}>
                    {checkedInAt ? `Checked in ${fmtDate(checkedInAt, { month: 'short', day: 'numeric' })} at ${fmtTime(checkedInAt)}` : 'Currently staying'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--sr-sub)', marginTop: 3 }}>Checkout: {fmtDate(booking.check_out, { month: 'short', day: 'numeric' })}</div>
                </div>
              )}

              {/* Completed banner */}
              {isCompleted && (
                <div style={{ background: 'var(--sr-overlay-sm)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sr-muted)', marginBottom: 3 }}>Stay Completed</div>
                  <div style={{ fontSize: 11.5, color: 'var(--sr-sub)' }}>Checked out {fmtDate(booking.check_out, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              )}

              {/* Cancelled banner */}
              {isCancelled && (
                <div style={{ background: 'var(--sr-redl)', border: '1px solid var(--sr-red)', borderRadius: 14, padding: '18px 20px', marginBottom: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✕</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sr-red)', marginBottom: 3 }}>Booking Cancelled</div>
                  {booking.cancellation_reason && (
                    <div style={{ fontSize: 11.5, color: 'var(--sr-sub)', marginTop: 4, lineHeight: 1.5 }}>{booking.cancellation_reason}</div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="bdc-rc-card">
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--sr-sub)', fontWeight: 700, padding: '14px 18px 10px' }}>Quick Actions</div>
                {canCheckIn && (
                  <button className="bdc-qa-btn" onClick={() => setCheckinModal(true)}>
                    <div className="bdc-qa-icon" style={{ background: 'var(--sr-greenl)' }}>✅</div>
                    <div><div className="bdc-qa-btn-title">Confirm Check-in</div><div className="bdc-qa-btn-sub">Mark guest as arrived</div></div>
                  </button>
                )}
                {isCheckedIn && (
                  <button className="bdc-qa-btn" disabled>
                    <div className="bdc-qa-icon" style={{ background: 'var(--sr-greenl)' }}>🟢</div>
                    <div><div className="bdc-qa-btn-title">Guest Checked In</div><div className="bdc-qa-btn-sub">Auto-completes after checkout</div></div>
                  </button>
                )}
                <button className="bdc-qa-btn">
                  <div className="bdc-qa-icon" style={{ background: 'var(--sr-bluel)' }}>💬</div>
                  <div><div className="bdc-qa-btn-title">Message {guest.full_name.split(' ')[0]}</div><div className="bdc-qa-btn-sub">Send a direct message</div></div>
                </button>
                {canCancel && (
                  <button className="bdc-qa-btn" onClick={() => setCancelModal(true)}>
                    <div className="bdc-qa-icon" style={{ background: 'var(--sr-redl)' }}>✕</div>
                    <div><div className="bdc-qa-btn-title">Cancel Booking</div><div className="bdc-qa-btn-sub">Full refund issued to guest</div></div>
                  </button>
                )}
              </div>

              {/* Booking Summary */}
              <div className="bdc-rc-card">
                <div className="bdc-rc-hd">Booking Summary</div>
                <div className="bdc-rc-body">
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Reference</span><span className="bdc-s-val" style={{ color: 'var(--sr-orange)', fontWeight: 700 }}>{ref}</span></div>
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Status</span><span className="bdc-s-val" style={{ color: sc.color }}>● {sc.label}</span></div>
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Check-in</span><span className="bdc-s-val">{fmtDate(booking.check_in, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Check-out</span><span className="bdc-s-val">{fmtDate(booking.check_out, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Duration</span><span className="bdc-s-val">{nights} night{nights !== 1 ? 's' : ''}</span></div>
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Guests</span><span className="bdc-s-val">{booking.guests ?? '—'}</span></div>
                  <div className="bdc-sum-row"><span className="bdc-s-lbl">Your Payout</span><span className="bdc-s-val" style={{ color: 'var(--sr-orange)', fontWeight: 700 }}>${hostEarnings.toFixed(2)}</span></div>
                  {checkedInAt && <div className="bdc-sum-row"><span className="bdc-s-lbl">Checked In</span><span className="bdc-s-val">{fmtDate(checkedInAt, { month: 'short', day: 'numeric' })} {fmtTime(checkedInAt)}</span></div>}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bdc-rc-card">
                <div className="bdc-rc-hd">Activity Timeline</div>
                <div className="bdc-rc-body">
                  <Timeline booking={{ ...booking, status }} total={total} ref={ref} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Check-In Modal ── */}
      {checkinModal && (
        <div className="bdc-overlay" onClick={e => e.target === e.currentTarget && !checkinLoading && setCheckinModal(false)}>
          <div className="bdc-modal">
            <div className="bdc-modal-icon">✅</div>
            <div className="bdc-modal-title">Confirm Check-In</div>
            <div className="bdc-modal-sub">
              Mark <strong>{guest.full_name}</strong> as checked in to<br />
              <strong>{listing.title || '—'}</strong>
            </div>
            <div className="bdc-modal-info">
              {[['Guest', guest.full_name], ['Booking', ref], ['Check-In', fmtDate(booking.check_in)], ['Duration', `${nights} night${nights !== 1 ? 's' : ''}`]].map(([lbl, val]) => (
                <div key={lbl}>
                  <div className="bdc-mi-lbl">{lbl}</div>
                  <div className="bdc-mi-val">{val}</div>
                </div>
              ))}
            </div>
            <div className="bdc-cl-title">Pre-Check-In Checklist</div>
            {CHECKLIST.map((item, i) => (
              <div key={i} className={`bdc-check${checkinChecks[i] ? ' on' : ''}`} onClick={() => setCheckinChecks(p => p.map((v, j) => j === i ? !v : v))}>
                <div className="bdc-check-box">{checkinChecks[i] ? '✓' : ''}</div>
                <span className="bdc-check-text">{item}</span>
              </div>
            ))}
            <div className="bdc-modal-actions">
              <button className="bdc-btn-cancel" onClick={() => setCheckinModal(false)} disabled={checkinLoading}>Not Yet</button>
              <button className="bdc-btn-ci" onClick={handleCheckIn} disabled={checkinLoading}>
                {checkinLoading ? 'Checking in…' : '✓  Check In Guest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {successModal && (
        <div className="bdc-overlay" onClick={e => e.target === e.currentTarget && setSuccessModal(false)}>
          <div className="bdc-success-modal">
            <div className="bdc-success-ring">✓</div>
            <div className="bdc-success-title">Guest Checked In!</div>
            <div className="bdc-success-sub">
              <strong>{guest.full_name}</strong> has been successfully checked in to<br />
              <strong>{listing.title || '—'}</strong>
            </div>
            <div className="bdc-success-details">
              {[['Check-In', fmtDate(booking.check_in, { month: 'short', day: 'numeric' })], ['Nights', String(nights)], ['Check-Out', fmtDate(booking.check_out, { month: 'short', day: 'numeric' })]].map(([lbl, val]) => (
                <div key={lbl}>
                  <div className="bdc-sd-val">{val}</div>
                  <div className="bdc-sd-lbl">{lbl}</div>
                </div>
              ))}
            </div>
            <button className="bdc-btn-done" onClick={() => setSuccessModal(false)}>Done</button>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div className="bdc-overlay" onClick={e => e.target === e.currentTarget && setCancelModal(false)}>
          <div className="bdc-cancel-modal">
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--sr-text)', marginBottom: 8 }}>Cancel Booking</div>
            <div style={{ fontSize: 13, color: 'var(--sr-sub)', marginBottom: 18, lineHeight: 1.6 }}>
              This will cancel <strong style={{ color: 'var(--sr-orange)' }}>{ref}</strong> and issue a full refund to {guest.full_name}. This cannot be undone.
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sr-sub)', marginBottom: 6 }}>Cancellation reason (required)</div>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Property unavailable due to maintenance…"
              rows={3}
              style={{ width: '100%', background: 'var(--sr-overlay-xs)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--sr-text)', outline: 'none', resize: 'vertical', fontFamily: 'var(--sr-font-sans)', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setCancelModal(false)} style={{ flex: 1, background: 'var(--sr-overlay-xs)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--sr-sub)', fontFamily: 'var(--sr-font-sans)' }}>
                Keep booking
              </button>
              <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}
                style={{ flex: 1, background: 'var(--sr-red)', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 700, cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--sr-font-sans)', opacity: (cancelling || !cancelReason.trim()) ? .55 : 1 }}>
                {cancelling ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
