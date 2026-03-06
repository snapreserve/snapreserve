'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function BookingSidebar({ listing, rooms }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date().toISOString().slice(0, 10)

  const isHotel = listing.type === 'hotel'

  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests,   setGuests]   = useState(1)

  // For hotel listings: which room is pre-selected via ?room= URL param
  const urlRoomId = searchParams?.get('room') || null
  const selectedRoom = isHotel && rooms?.length
    ? (rooms.find(r => r.id === urlRoomId) || null)
    : null

  const [promoInput,   setPromoInput]   = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState(null)
  const [appliedPromo, setAppliedPromo] = useState(null) // { code, discount_amount, name, discount_type, discount_value }

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
      : 0

  // Use room price when a room is selected; fall back to listing price
  const pricePerNight = selectedRoom ? selectedRoom.price_per_night : listing.price_per_night
  const subtotal    = pricePerNight * (nights || 1)
  const cleaningFee = listing.cleaning_fee || 0
  const discount    = appliedPromo ? appliedPromo.discount_amount : 0
  const total       = subtotal + cleaningFee - discount

  // Auto-apply promo from URL param ?promo=CODE
  useEffect(() => {
    const urlPromo = searchParams?.get('promo')
    if (urlPromo) setPromoInput(urlPromo)
  }, [searchParams])

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
        body:    JSON.stringify({
          code,
          listing_id: listing.id,
          nights:     nights || 1,
          subtotal,
          room_id:    selectedRoom?.id || null,
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

  return (
    <div className="booking-card">
      <div className="bc-price">
        ${pricePerNight} <span>/night</span>
      </div>
      {selectedRoom && (
        <div style={{ fontSize: '0.78rem', color: 'var(--mid,#7a5c3a)', fontWeight: 600, marginBottom: '4px' }}>
          Room: {selectedRoom.name}
          <a href={`/listings/${listing.id}`} style={{ marginLeft: '8px', fontSize: '0.72rem', color: 'var(--orange,#e8622a)', textDecoration: 'none' }}>
            Change →
          </a>
        </div>
      )}
      {isHotel && rooms?.length > 0 && !selectedRoom && (
        <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600, marginBottom: '8px' }}>
          ↑ Select a room type above to book
        </div>
      )}
      <div className="bc-rating">
        ★ {listing.rating} · {listing.review_count} reviews
      </div>

      <div className="date-grid">
        <div className="date-field">
          <div className="df-label">Check-in</div>
          <input
            className="df-input"
            type="date"
            value={checkIn}
            min={today}
            onChange={e => {
              setCheckIn(e.target.value)
              if (checkOut && e.target.value >= checkOut) setCheckOut('')
              setAppliedPromo(null)
            }}
          />
        </div>
        <div className="date-field">
          <div className="df-label">Checkout</div>
          <input
            className="df-input"
            type="date"
            value={checkOut}
            min={checkIn || today}
            onChange={e => { setCheckOut(e.target.value); setAppliedPromo(null) }}
          />
        </div>
      </div>

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

      <div className="price-breakdown">
        <div className="pb-row">
          <span className="pb-label">
            ${pricePerNight} × {nights > 0 ? nights : '—'} night
            {nights !== 1 ? 's' : ''}
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
              {appliedPromo.discount_type === 'percentage'
                ? ` −${appliedPromo.discount_value}%`
                : ''}
            </span>
            <span>−${appliedPromo.discount_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="pb-row total">
          <span>Total</span>
          <span>{nights > 0 ? `$${total.toFixed(2)}` : '—'}</span>
        </div>
      </div>

      {/* Promo code input */}
      {appliedPromo ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16A34A' }}>✓ Promo applied</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--sr-text)', fontWeight: 600 }}>{appliedPromo.name}</div>
          </div>
          <button onClick={removePromo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sr-sub)', fontSize: '0.78rem', fontFamily: 'inherit' }}>
            Remove
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Promo code"
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null) }}
              onKeyDown={e => e.key === 'Enter' && applyPromo()}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--sr-border-solid,#E8E2D9)', background: 'var(--sr-surface,#F5F0EB)', fontSize: '0.84rem', fontFamily: 'inherit', color: 'var(--sr-text)', outline: 'none' }}
            />
            <button
              onClick={applyPromo}
              disabled={promoLoading || !promoInput.trim()}
              style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--sr-border-solid,#E8E2D9)', background: 'var(--sr-card)', fontSize: '0.82rem', fontWeight: 700, cursor: promoLoading || !promoInput.trim() ? 'not-allowed' : 'pointer', color: 'var(--sr-text)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {promoLoading ? '…' : 'Apply'}
            </button>
          </div>
          {promoError && (
            <div style={{ fontSize: '0.74rem', color: '#EF4444', marginTop: '6px' }}>{promoError}</div>
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
