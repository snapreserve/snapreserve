'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingSidebar({ listing }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
      : 0

  const subtotal = listing.price_per_night * (nights || 1)
  const cleaningFee = listing.cleaning_fee || 0
  const total = subtotal + cleaningFee

  function handleReserve() {
    if (!checkIn || !checkOut || nights < 1) {
      alert('Please select valid check-in and checkout dates.')
      return
    }
    const params = new URLSearchParams({
      listing: listing.id,
      checkin: checkIn,
      checkout: checkOut,
      guests: String(guests),
    })
    router.push(`/booking?${params}`)
  }

  return (
    <div className="booking-card">
      <div className="bc-price">
        ${listing.price_per_night} <span>/night</span>
      </div>
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
            onChange={e => setCheckOut(e.target.value)}
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
            ${listing.price_per_night} × {nights > 0 ? nights : '—'} night
            {nights !== 1 ? 's' : ''}
          </span>
          <span>{nights > 0 ? `$${subtotal}` : '—'}</span>
        </div>
        <div className="pb-row">
          <span className="pb-label">Cleaning fee</span>
          <span>${cleaningFee}</span>
        </div>
        <div className="pb-row total">
          <span>Total</span>
          <span>{nights > 0 ? `$${total}` : '—'}</span>
        </div>
      </div>

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
