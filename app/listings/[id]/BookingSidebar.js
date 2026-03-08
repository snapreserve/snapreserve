'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Date helpers ──────────────────────────────────────────────────────────────

function toYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay() // 0 = Sunday
}

// Expand a booking range into individual booked dates [check_in, check_out)
// checkout date itself is NOT blocked (allows same-day turn)
function expandBookingRange(check_in, check_out) {
  const dates = new Set()
  const d = new Date(check_in + 'T00:00:00')
  const end = new Date(check_out + 'T00:00:00')
  while (d < end) {
    dates.add(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingSidebar({ listing, rooms }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date().toISOString().slice(0, 10)

  const isHotel = listing.type === 'hotel'
  const urlRoomId = searchParams?.get('room') || null
  const selectedRoom = isHotel && rooms?.length
    ? (rooms.find(r => r.id === urlRoomId) || null)
    : null

  // Date selection state
  const [checkIn,   setCheckIn]   = useState('')
  const [checkOut,  setCheckOut]  = useState('')
  const [selecting, setSelecting] = useState('checkin') // 'checkin' | 'checkout'
  const [hoverDate, setHoverDate] = useState(null)

  // Calendar navigation
  const now = new Date()
  const [calYear,  setCalYear]  = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  // Availability
  const [bookedRanges, setBookedRanges] = useState([])
  const [availLoading, setAvailLoading] = useState(true)

  // Promo
  const [promoInput,   setPromoInput]   = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState(null)
  const [appliedPromo, setAppliedPromo] = useState(null)

  // Guests
  const [guests, setGuests] = useState(1)

  // ── Fetch availability ────────────────────────────────────────────────────
  useEffect(() => {
    setAvailLoading(true)
    fetch(`/api/availability?listing_id=${listing.id}`)
      .then(r => r.json())
      .then(data => setBookedRanges(data.booked || []))
      .catch(() => {})
      .finally(() => setAvailLoading(false))
  }, [listing.id])

  // Build set of all individually-booked dates
  const bookedDates = useMemo(() => {
    const set = new Set()
    for (const { check_in, check_out } of bookedRanges) {
      for (const d of expandBookingRange(check_in, check_out)) {
        set.add(d)
      }
    }
    return set
  }, [bookedRanges])

  // ── Derived pricing ───────────────────────────────────────────────────────
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0
  const pricePerNight = selectedRoom ? selectedRoom.price_per_night : listing.price_per_night
  const subtotal    = pricePerNight * (nights || 1)
  const cleaningFee = listing.cleaning_fee || 0
  const discount    = appliedPromo ? appliedPromo.discount_amount : 0
  const total       = subtotal + cleaningFee - discount

  // Auto-apply promo from URL
  useEffect(() => {
    const urlPromo = searchParams?.get('promo')
    if (urlPromo) setPromoInput(urlPromo)
  }, [searchParams])

  // ── Calendar helpers ──────────────────────────────────────────────────────
  function isDisabled(dateStr) {
    return dateStr < today || bookedDates.has(dateStr)
  }

  // Returns true if dateStr falls within the current selection/hover range
  function isInRange(dateStr) {
    const rangeEnd = checkOut || (selecting === 'checkout' ? hoverDate : null)
    if (!checkIn || !rangeEnd) return false
    return dateStr > checkIn && dateStr < rangeEnd
  }

  function handleDayClick(dateStr) {
    if (isDisabled(dateStr)) return

    if (selecting === 'checkin' || !checkIn) {
      setCheckIn(dateStr)
      setCheckOut('')
      setSelecting('checkout')
      setAppliedPromo(null)
      return
    }

    // Selecting checkout
    if (dateStr <= checkIn) {
      // Reset to a new check-in
      setCheckIn(dateStr)
      setCheckOut('')
      setAppliedPromo(null)
      return
    }

    // Validate no booked dates lie inside the stay [checkIn+1 .. dateStr-1]
    const d = new Date(checkIn + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const end = new Date(dateStr + 'T00:00:00')
    let conflict = false
    while (d < end) {
      if (bookedDates.has(d.toISOString().slice(0, 10))) { conflict = true; break }
      d.setDate(d.getDate() + 1)
    }

    if (conflict) {
      // Can't span a booked night — restart from this click
      setCheckIn(dateStr)
      setCheckOut('')
      setAppliedPromo(null)
      return
    }

    setCheckOut(dateStr)
    setSelecting('checkin')
    setAppliedPromo(null)
  }

  function handleDayHover(dateStr) {
    if (selecting === 'checkout' && !isDisabled(dateStr)) setHoverDate(dateStr)
  }

  function clearDates() {
    setCheckIn('')
    setCheckOut('')
    setSelecting('checkin')
    setHoverDate(null)
    setAppliedPromo(null)
  }

  const canGoPrev = !(calYear === now.getFullYear() && calMonth === now.getMonth())

  function prevMonth() {
    if (!canGoPrev) return
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  // ── Calendar renderer ─────────────────────────────────────────────────────
  function renderCalendar() {
    const days    = daysInMonth(calYear, calMonth)
    const first   = firstDayOfMonth(calYear, calMonth)
    const cells   = []

    // Empty prefix cells
    for (let i = 0; i < first; i++) cells.push(<div key={`p${i}`} />)

    for (let d = 1; d <= days; d++) {
      const dateStr   = toYMD(calYear, calMonth, d)
      const disabled  = isDisabled(dateStr)
      const isBooked  = bookedDates.has(dateStr)
      const isPast    = dateStr < today
      const isStart   = dateStr === checkIn
      const isEnd     = dateStr === checkOut
      const inRange   = isInRange(dateStr)
      const isToday   = dateStr === today
      const isHovered = dateStr === hoverDate && selecting === 'checkout' && !checkOut

      cells.push(
        <div
          key={dateStr}
          title={isBooked && !isPast ? 'Booked' : undefined}
          onMouseEnter={() => handleDayHover(dateStr)}
          onMouseLeave={() => setHoverDate(null)}
          onClick={() => handleDayClick(dateStr)}
          style={{
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: isStart || isEnd ? '50%' : '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: isStart || isEnd ? 700 : isToday ? 600 : 400,
            userSelect: 'none',
            position: 'relative',
            background:
              isStart || isEnd
                ? 'var(--sr-orange,#F4601A)'
                : (inRange || isHovered)
                  ? 'rgba(244,96,26,0.12)'
                  : 'transparent',
            color:
              disabled
                ? 'var(--sr-muted,#9C8E82)'
                : isStart || isEnd
                  ? '#fff'
                  : 'var(--sr-text,#F5F0EB)',
            textDecoration: isBooked && !isPast ? 'line-through' : 'none',
            opacity: isPast ? 0.3 : isBooked ? 0.55 : 1,
            outline: isToday && !isStart && !isEnd ? '1px solid rgba(244,96,26,0.4)' : 'none',
            outlineOffset: -2,
            transition: 'background 0.1s',
          }}
        >
          {d}
          {/* Booked dot */}
          {isBooked && !isPast && (
            <span style={{
              position: 'absolute', bottom: 3, left: '50%',
              transform: 'translateX(-50%)',
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(244,96,26,0.5)',
            }} />
          )}
        </div>
      )
    }

    return cells
  }

  // ── Promo handlers ────────────────────────────────────────────────────────
  async function applyPromo() {
    const code = promoInput.trim()
    if (!code) return
    setPromoLoading(true)
    setPromoError(null)
    setAppliedPromo(null)
    try {
      const res = await fetch('/api/promotions/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          listing_id: listing.id,
          nights: nights || 1,
          subtotal,
          room_id: selectedRoom?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPromoError('Could not validate promo code.'); return }
      if (!data.valid) { setPromoError(data.error || 'Invalid promo code'); return }
      setAppliedPromo(data)
    } catch {
      setPromoError('Network error. Please try again.')
    } finally {
      setPromoLoading(false)
    }
  }

  function removePromo() {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError(null)
  }

  function handleReserve() {
    if (!checkIn || !checkOut || nights < 1) {
      alert('Please select valid check-in and checkout dates.')
      return
    }
    if (isHotel && rooms?.length && !selectedRoom) {
      alert('Please select a room type first.')
      return
    }
    const params = new URLSearchParams({
      listing:  listing.id,
      checkin:  checkIn,
      checkout: checkOut,
      guests:   String(guests),
    })
    if (selectedRoom) params.set('room', selectedRoom.id)
    if (appliedPromo) params.set('promo', appliedPromo.code)
    router.push(`/booking?${params}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="booking-card">

      {/* Price */}
      <div className="bc-price">
        ${pricePerNight} <span>/night</span>
      </div>

      {/* Room selection notice */}
      {selectedRoom && (
        <div style={{ fontSize: '0.78rem', color: 'var(--mid,#7a5c3a)', fontWeight: 600, marginBottom: 4 }}>
          Room: {selectedRoom.name}
          <a href={`/listings/${listing.id}`} style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--orange,#e8622a)', textDecoration: 'none' }}>
            Change →
          </a>
        </div>
      )}
      {isHotel && rooms?.length > 0 && !selectedRoom && (
        <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600, marginBottom: 8 }}>
          ↑ Select a room type above to book
        </div>
      )}

      <div className="bc-rating">
        ★ {listing.rating} · {listing.review_count} reviews
      </div>

      {/* Date pills */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        border: '1px solid var(--sr-border-solid,#E8E2D9)', borderRadius: 12,
        overflow: 'hidden', marginBottom: 10,
      }}>
        <button
          onClick={() => { setSelecting('checkin'); setCheckOut('') }}
          style={{
            padding: '10px 14px', background: selecting === 'checkin' ? 'rgba(244,96,26,0.07)' : 'var(--sr-surface,#F5F0EB)',
            border: 'none', borderRight: '1px solid var(--sr-border-solid,#E8E2D9)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-muted)', marginBottom: 2 }}>
            Check-in
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: checkIn ? 600 : 400, color: checkIn ? 'var(--sr-text,#F5F0EB)' : 'var(--sr-muted,#9C8E82)' }}>
            {checkIn || 'Add date'}
          </div>
        </button>
        <button
          onClick={() => checkIn && setSelecting('checkout')}
          style={{
            padding: '10px 14px', background: selecting === 'checkout' ? 'rgba(244,96,26,0.07)' : 'var(--sr-surface,#F5F0EB)',
            border: 'none', cursor: checkIn ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-muted)', marginBottom: 2 }}>
            Checkout
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: checkOut ? 600 : 400, color: checkOut ? 'var(--sr-text,#F5F0EB)' : 'var(--sr-muted,#9C8E82)' }}>
            {checkOut || 'Add date'}
          </div>
        </button>
      </div>

      {/* Calendar */}
      <div style={{
        background: 'var(--sr-surface,#F5F0EB)',
        border: '1px solid var(--sr-border-solid,#E8E2D9)',
        borderRadius: 12, padding: '14px 12px', marginBottom: 10,
      }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            style={{
              background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed',
              padding: '4px 10px', borderRadius: 6, fontSize: '1.1rem',
              color: 'var(--sr-text,#F5F0EB)', opacity: canGoPrev ? 1 : 0.25,
            }}
          >‹</button>

          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--sr-text,#F5F0EB)' }}>
            {MONTH_NAMES[calMonth]} {calYear}
          </div>

          <button
            onClick={nextMonth}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 10px', borderRadius: 6, fontSize: '1.1rem',
              color: 'var(--sr-text,#F5F0EB)',
            }}
          >›</button>
        </div>

        {availLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.78rem', color: 'var(--sr-muted)' }}>
            Loading availability…
          </div>
        ) : (
          <>
            {/* Day-of-week header */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              marginBottom: 4, gap: 2,
            }}>
              {DAY_LABELS.map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: '0.66rem', fontWeight: 700,
                  color: 'var(--sr-muted,#9C8E82)', padding: '0 0 4px',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {renderCalendar()}
            </div>
          </>
        )}

        {/* Legend */}
        <div style={{
          display: 'flex', gap: 14, marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--sr-border-solid,#E8E2D9)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--sr-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sr-orange,#F4601A)' }} />
            Selected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--sr-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(244,96,26,0.12)' }} />
            Range
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--sr-muted)', textDecoration: 'line-through' }}>
            <span style={{ fontSize: '0.72rem' }}>12</span>
            Booked
          </div>
        </div>
      </div>

      {/* Clear dates */}
      {(checkIn || checkOut) && (
        <button
          onClick={clearDates}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.73rem', color: 'var(--sr-sub,#6B5F54)', textDecoration: 'underline',
            padding: '0 0 8px', fontFamily: 'inherit',
          }}
        >
          Clear dates
        </button>
      )}

      {/* Guests */}
      <div className="guests-field">
        <div className="df-label">Guests</div>
        <select
          className="guests-select"
          value={guests}
          onChange={e => setGuests(Number(e.target.value))}
        >
          {[...Array(listing.max_guests)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} guest{i > 0 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Price breakdown */}
      <div className="price-breakdown">
        <div className="pb-row">
          <span className="pb-label">
            ${pricePerNight} × {nights > 0 ? nights : '—'} night{nights !== 1 ? 's' : ''}
          </span>
          <span>{nights > 0 ? `$${subtotal}` : '—'}</span>
        </div>
        <div className="pb-row">
          <span className="pb-label">Cleaning fee</span>
          <span>${cleaningFee}</span>
        </div>
        {appliedPromo && (
          <div className="pb-row" style={{ color: '#16A34A' }}>
            <span className="pb-label">
              🏷️ Promo ({appliedPromo.code})
              {appliedPromo.discount_type === 'percentage' ? ` −${appliedPromo.discount_value}%` : ''}
            </span>
            <span>−${appliedPromo.discount_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="pb-row total">
          <span>Total</span>
          <span>{nights > 0 ? `$${total.toFixed(2)}` : '—'}</span>
        </div>
      </div>

      {/* Promo code */}
      {appliedPromo ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16A34A' }}>✓ Promo applied</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--sr-text)', fontWeight: 600 }}>{appliedPromo.name}</div>
          </div>
          <button onClick={removePromo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sr-sub)', fontSize: '0.78rem', fontFamily: 'inherit' }}>
            Remove
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Promo code"
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null) }}
              onKeyDown={e => e.key === 'Enter' && applyPromo()}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--sr-border-solid,#E8E2D9)', background: 'var(--sr-surface,#F5F0EB)', fontSize: '0.84rem', fontFamily: 'inherit', color: 'var(--sr-text)', outline: 'none' }}
            />
            <button
              onClick={applyPromo}
              disabled={promoLoading || !promoInput.trim()}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--sr-border-solid,#E8E2D9)', background: 'var(--sr-card)', fontSize: '0.82rem', fontWeight: 700, cursor: promoLoading || !promoInput.trim() ? 'not-allowed' : 'pointer', color: 'var(--sr-text)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {promoLoading ? '…' : 'Apply'}
            </button>
          </div>
          {promoError && (
            <div style={{ fontSize: '0.74rem', color: '#EF4444', marginTop: 6 }}>{promoError}</div>
          )}
        </div>
      )}

      <button className="book-btn" onClick={handleReserve}>
        Reserve now →
      </button>
      <div className="book-note">You won't be charged yet</div>
      {listing.is_instant_book && (
        <div className="instant-note">
          ⚡ Instant booking — no waiting for approval
        </div>
      )}

    </div>
  )
}
